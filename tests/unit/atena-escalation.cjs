/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');

const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(__dirname, '../../src', request.slice(2));
  return originalResolve.call(this, request, parent, ...rest);
};
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
};
class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
  clear() { this.data.clear(); }
}
const events = new EventTarget();
global.window = { localStorage: new MemoryStorage(), addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events) };

const locks = new Map();
const lockManager = { request(name, callback) {
  const previous = locks.get(name) ?? Promise.resolve();
  const next = previous.then(callback, callback);
  locks.set(name, next.catch(() => {}));
  return next;
} };
global.navigator ??= {};
Object.defineProperty(global.navigator, 'locks', { value: lockManager, configurable: true });
const { localIdentityStore } = require('../../src/services/local-identity/store.ts');
const { knowledgeService } = require('../../src/services/knowledge/service.ts');
const { AtenaService, NO_KNOWLEDGE_ANSWER } = require('../../src/services/atena/service.ts');
const { LocalAtenaConversationRepository } = require('../../src/services/atena/local-repository.ts');
const { KnowledgeServiceQueryAdapter } = require('../../src/services/atena/knowledge-query.ts');
const { PromptContextBuilder } = require('../../src/services/atena/prompt-context.ts');
const { AIRouter } = require('../../src/services/atena/router.ts');
const { LocalPrimaryProvider, LocalFallbackProvider } = require('../../src/services/atena/local-providers.ts');
const kb = new KnowledgeServiceQueryAdapter(knowledgeService);
const productId = 'product-commander';
function login(role = 'alpha') {
  const data = { alpha: ['cliente.alpha', 'alpha'], beta: ['cliente.beta', 'beta'], support: ['suporte', 'suporte'], admin: ['admin', 'admin'] }[role];
  assert.ok(localIdentityStore.login(`${data[0]}@demo.7support.local`, `demo-${data[1]}`));
}
function fixture(primaryOptions = {}, fallbackOptions = {}, timeout = 1000) {
  const calls = { primary: [], fallback: [] };
  const wrap = (provider, name) => ({ generate(context, signal) { calls[name].push(context); return provider.generate(context, signal); } });
  const repo = new LocalAtenaConversationRepository();
  const primary = typeof primaryOptions.generate === 'function' ? primaryOptions : new LocalPrimaryProvider(primaryOptions);
  const fallback = typeof fallbackOptions.generate === 'function' ? fallbackOptions : new LocalFallbackProvider(fallbackOptions);
  const router = new AIRouter(wrap(primary, 'primary'), wrap(fallback, 'fallback'), timeout);
  const service = new AtenaService(repo, kb, new PromptContextBuilder(), router);
  return { repo, service, calls, router };
}
async function begin(f = fixture(), product = productId) { return { ...f, conversation: await f.service.startConversation({ productId: product }) }; }
const input = (id = 'request-1', content = 'Como acompanhar um projeto') => ({ clientRequestId: id, content });
async function publish(overrides = {}) {
  const result = await knowledgeService.create({ productId, title: 'Projeto de teste', category: 'GUIDE', content: 'Acompanhar projeto: consulte as etapas.', visibility: 'BOTH', ...overrides });
  await knowledgeService.submitForReview(result.version.id);
  await knowledgeService.publish(result.version.id);
  return result;
}
test.beforeEach(() => { window.localStorage.clear(); locks.clear(); });

const { AtenaEscalationService, contextSnapshot } = require('../../src/services/atena-escalation/service.ts');
const { LocalAtenaEscalationRepository, ESCALATION_STORAGE_KEY } = require('../../src/services/atena-escalation/local-repository.ts');
const { TicketService } = require('../../src/services/tickets/service.ts');
const { LocalTicketRepository } = require('../../src/services/tickets/local-repository.ts');
function escalationFixture(f) {
  const repo = new LocalAtenaEscalationRepository();
  const tickets = new TicketService(new LocalTicketRepository());
  return { repo, tickets, service: new AtenaEscalationService(f.service, tickets, repo) };
}
async function ready() {
  login(); const f = await begin(); await f.service.sendMessage(f.conversation.id, input());
  const e = escalationFixture(f); const preview = await e.service.prepare(f.conversation.id);
  return { f, e, preview };
}
test('CLIENT preview deriva produto, defaults e contexto, preparar/cancelar não cria ticket', async () => {
  const { f, e, preview } = await ready();
  assert.equal(preview.productId, productId); assert.equal(preview.userId, 'user-alpha');
  assert.equal(preview.draft.subject, input().content); assert.equal(preview.draft.type, 'QUESTION'); assert.equal(preview.draft.impact, 'LOW_IMPACT');
  assert.equal(await e.service.linkedTicket(f.conversation.id), null);
  assert.equal((await e.tickets.list()).length, 4);
  assert.equal(preview.audit[0].action, 'STARTED');
});
test('assunto e descrição revisáveis, UI não define identidade/produto, publicCode e rota CLIENT', async () => {
  const { f, e, preview } = await ready();
  const result = await e.service.confirm(preview.id, { ...preview.draft, subject: 'Revisado', description: 'Meu contexto', productId: 'product-finance', userId: 'user-beta', clientId: 'client-beta' });
  const ticket = await e.tickets.get(result.ticketId);
  assert.equal(ticket.productId, productId); assert.equal(ticket.requesterUserId, 'user-alpha'); assert.equal(ticket.subject, 'Revisado'); assert.equal(ticket.messages[0].body, 'Meu contexto');
  assert.match(ticket.publicCode, /^CS-\d{6}$/); assert.equal(result.href, `/tickets/${ticket.id}`); assert.equal(ticket.messages[0].attachments.length, 0);
  assert.equal((await f.service.getConversation(f.conversation.id)).conversation.status, 'ACTIVE');
  assert.equal((await e.repo.read()).escalations[0].status, 'COMPLETED');
});
test('snapshot determinístico limita 6 mensagens e 8000 caracteres e não serializa diagnóstico', () => {
  const messages = Array.from({ length: 9 }, (_, i) => ({ role: i % 2 ? 'ASSISTANT' : 'USER', status: 'COMPLETED', content: `msg${i}` }));
  const snap = contextSnapshot({ messages, executions: [{ provider: 'secret' }], diagnostic: 'secret' });
  assert.equal(snap.split('\n\n').length, 6); assert.ok(!snap.includes('msg2')); assert.ok(snap.includes('msg3')); assert.ok(!snap.includes('secret'));
  messages.forEach(m => m.content = 'x'.repeat(4000)); assert.equal(contextSnapshot({ messages }).length, 8000);
});
test('CLIENT não recebe INTERNAL no snapshot', async () => {
  login('admin'); await publish({ visibility: 'INTERNAL', title: 'Segredo', content: 'secretointerno exclusivo administrativo' });
  login(); const f = await begin(); await f.service.sendMessage(f.conversation.id, input('internal', 'secretointerno'));
  const e = escalationFixture(f); const p = await e.service.prepare(f.conversation.id);
  assert.ok(p.approvedContextSnapshot.includes(NO_KNOWLEDGE_ANSWER)); assert.ok(!p.approvedContextSnapshot.includes('exclusivo administrativo'));
});
test('revogação entre preview e confirmação falha fechado; novo preview exclui resposta revogada', async () => {
  login('admin'); const source = await publish({ content: 'Acompanhar projeto: informação revogável.' });
  login(); const f = await begin(); await f.service.sendMessage(f.conversation.id, input()); const e = escalationFixture(f); const p = await e.service.prepare(f.conversation.id);
  assert.ok(p.approvedContextSnapshot.includes('informação revogável'));
  await new (require('../../src/services/knowledge/local-repository.ts').LocalKnowledgeRepository)().transact(db => { db.versions.find(v => v.id === source.version.id).status = 'ARCHIVED'; db.sources.find(v => v.id === source.version.sourceId).currentPublishedVersionId = null; });
  await assert.rejects(e.service.confirm(p.id, p.draft), { code: 'VALIDATION' });
  assert.equal(await e.tickets.findFromAtena(f.conversation.id), null);
  const fresh = await e.service.prepare(f.conversation.id); assert.ok(!fresh.approvedContextSnapshot.includes('informação revogável'));
});
for (const role of ['beta', 'admin', 'support']) test(`${role} não acessa preview nem confirma conversa Alpha`, async () => {
  const { f, e, preview } = await ready(); login(role);
  await assert.rejects(e.service.prepare(f.conversation.id)); await assert.rejects(e.service.confirm(preview.id, preview.draft));
  await assert.rejects(e.service.linkedTicket(f.conversation.id));
  if (role === 'admin') await assert.rejects(f.service.getConversation(f.conversation.id), { code: 'NOT_FOUND' });
});
test('retry e confirmações concorrentes criam exatamente um ticket e uma TICKET_CREATED', async () => {
  const { f, e, preview } = await ready();
  const other = escalationFixture(f);
  const results = await Promise.all([e.service.confirm(preview.id, preview.draft), other.service.confirm(preview.id, preview.draft), e.service.confirm(preview.id, preview.draft)]);
  assert.equal(new Set(results.map(r => r.ticketId)).size, 1);
  assert.equal((await e.tickets.list()).length, 5);
  const notification = [...window.localStorage.data.entries()].find(([key]) => key.includes('notifications'));
  const db = JSON.parse(notification[1]);
  assert.equal(db.notifications.filter(event => event.ticketId === results[0].ticketId && event.type === 'TICKET_CREATED').length, 1);
  const ticket = await e.tickets.get(results[0].ticketId); assert.equal(ticket.origin.idempotencyKey, `ATENA:${f.conversation.id}:user-alpha`);
  await assert.rejects(e.service.prepare(f.conversation.id), { code: 'VALIDATION' });
  assert.deepEqual(await other.service.linkedTicket(f.conversation.id), results[0]);
});
test('falha depois de ticket criado e antes de vínculo é recuperada após refresh', async () => {
  const { f, e, preview } = await ready();
  const set = window.localStorage.setItem.bind(window.localStorage); let failed = false;
  window.localStorage.setItem = (key, value) => {
    if (key === ESCALATION_STORAGE_KEY && !failed && JSON.parse(value).escalations[0].status === 'COMPLETED') { failed = true; throw new Error('quota'); }
    set(key, value);
  };
  try { await assert.rejects(e.service.confirm(preview.id, preview.draft)); } finally { window.localStorage.setItem = set; }
  const ticket = await e.tickets.findFromAtena(f.conversation.id); assert.ok(ticket);
  const fresh = escalationFixture(f); const linked = await fresh.service.linkedTicket(f.conversation.id);
  assert.equal(linked.ticketId, ticket.id); assert.equal((await fresh.repo.read()).escalations[0].status, "COMPLETED");
  const result = await fresh.service.confirm(preview.id, preview.draft);
  assert.equal(result.ticketId, ticket.id); assert.equal((await fresh.tickets.list()).length, 5);
  assert.ok((await fresh.repo.read()).escalations[0].audit.some(a => a.action === 'RETRY_RECOVERED'));
});
test('Ticket Core idempotência não depende do repositório de escalada', async () => {
  const { f, e, preview } = await ready(); const view = await f.service.getConversation(f.conversation.id);
  const payload = { ...preview.draft, productId, attachments: [] }; const ref = { conversationId: f.conversation.id, escalationId: preview.id };
  const second = new TicketService(new LocalTicketRepository());
  const results = await Promise.all([e.tickets.createFromAtena(payload, ref, async () => view.conversation), second.createFromAtena(payload, ref, async () => view.conversation)]);
  assert.equal(results[0].id, results[1].id); assert.equal((await e.tickets.list()).length, 5);
  await assert.rejects(second.createFromAtena(payload, { ...ref, conversationId: "other-conversation" }, async () => view.conversation), { code: "FORBIDDEN" });
  await assert.rejects(second.createFromAtena({ ...payload, productId: 'product-finance' }, ref, async () => view.conversation), { code: 'FORBIDDEN' });
});
test('sessão alterada durante preparação e confirmação falha fechado', async () => {
  const { f, e, preview } = await ready();
  const read = f.service.getConversation.bind(f.service); f.service.getConversation = async id => { const result = await read(id); login('beta'); return result; };
  await assert.rejects(e.service.confirm(preview.id, preview.draft), { code: 'FORBIDDEN' }); login();
  await assert.rejects(e.service.prepare(f.conversation.id), { code: 'FORBIDDEN' });
});
test('resposta neutra pode ser escalada manualmente e enviar mensagens não abre tickets', async () => {
  login(); const f = await begin(); await f.service.sendMessage(f.conversation.id, input('neutral', 'universo desconhecido xyz'));
  const e = escalationFixture(f); assert.equal(await e.tickets.findFromAtena(f.conversation.id), null);
  const p = await e.service.prepare(f.conversation.id); assert.ok(p.approvedContextSnapshot.includes(NO_KNOWLEDGE_ANSWER));
  assert.ok((await e.service.confirm(p.id, p.draft)).ticketId);
});
test('sem Web Locks, criação Atena falha fechado', async () => {
  const { e, preview } = await ready(); const manager = navigator.locks;
  Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true });
  try { await assert.rejects(e.service.confirm(preview.id, preview.draft), { code: 'STORAGE_UNAVAILABLE' }); }
  finally { Object.defineProperty(navigator, 'locks', { value: manager, configurable: true }); }
});
test('revalidação é executada dentro da transação Ticket Core antes da gravação', async () => {
  const { f, e, preview } = await ready(); const scope = (await f.service.getConversation(f.conversation.id)).conversation;
  let validations = 0;
  await assert.rejects(e.tickets.createFromAtena({ ...preview.draft, productId, attachments: [] }, { conversationId: f.conversation.id, escalationId: preview.id }, async () => {
    validations++; if (validations === 2) throw new Error('autorização revogada na fila'); return scope;
  }));
  assert.equal(validations, 2); assert.equal(await e.tickets.findFromAtena(f.conversation.id), null);
});
test('novo login da mesma identidade invalida o preview anterior', async () => {
  const { e, preview } = await ready();
  const key = '7support.spec02.local-identity.v1'; const db = JSON.parse(window.localStorage.getItem(key)); db.session.createdAt = '2099-01-01T00:00:00Z'; window.localStorage.setItem(key, JSON.stringify(db));
  await assert.rejects(e.service.confirm(preview.id, preview.draft), { code: 'FORBIDDEN' });
});
test('primeira mensagem é truncada em 160 caracteres no assunto', async () => {
  login(); const f = await begin(); await f.service.sendMessage(f.conversation.id, input('long', 'a'.repeat(500)));
  const preview = await escalationFixture(f).service.prepare(f.conversation.id); assert.equal(preview.draft.subject.length, 160);
});
