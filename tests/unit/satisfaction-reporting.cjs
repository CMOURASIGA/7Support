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
Object.defineProperty(global.navigator, 'locks', { value: lockManager, configurable: true });
const { localIdentityStore } = require('../../src/services/local-identity/store.ts');
const { TicketService } = require('../../src/services/tickets/service.ts');
const { LocalTicketRepository } = require('../../src/services/tickets/local-repository.ts');
const { SlaService } = require('../../src/services/sla/service.ts');
const { LocalSlaCycleRepository, LocalSlaPolicyRepository } = require('../../src/services/sla/local-repository.ts');
const { SatisfactionService } = require('../../src/services/satisfaction/service.ts');
const { LocalSatisfactionRepository, SATISFACTION_STORAGE_KEY } = require('../../src/services/satisfaction/local-repository.ts');
const { ReportingService, localDateInterval } = require('../../src/services/reporting/service.ts');
const { calculateReporting, sample } = require('../../src/services/reporting/calculator.ts');
const { notificationService } = require('../../src/services/notifications/service.ts');
function login(role = 'alpha') {
 const data = { alpha: ['cliente.alpha', 'alpha'], beta: ['cliente.beta', 'beta'], support: ['suporte', 'suporte'], admin: ['admin', 'admin'] }[role];
 assert.ok(localIdentityStore.login(`${data[0]}@demo.7support.local`, `demo-${data[1]}`));
}
function fixture() {
 const clock = { at: Date.parse('2026-10-08T12:00:00.000Z'), now() { return new Date(this.at); }, advance(minutes) { this.at += minutes * 60000; } };
 const tickets = new TicketService(new LocalTicketRepository(), clock), repository = new LocalSatisfactionRepository();
 const cycles = new LocalSlaCycleRepository(), policies = new LocalSlaPolicyRepository();
 const sla = new SlaService(policies, cycles, tickets, notificationService, clock);
 const satisfaction = new SatisfactionService(repository, tickets, clock);
 const reporting = new ReportingService(tickets, sla, repository);
 return { clock, tickets, repository, cycles, policies, sla, satisfaction, reporting };
}
async function create(f, origin = false) {
 login(); const input = { productId: 'product-commander', type: 'QUESTION', impact: 'LOW_IMPACT', subject: 'Satisfação real', description: 'Descrição autorizada', attachments: [] };
 return origin ? f.tickets.createFromAtena(input, { conversationId: 'own', escalationId: 'esc' }, async () => ({ id: 'own', productId: input.productId, userId: 'user-alpha', tenantId: 'client-alpha' })) : f.tickets.create(input);
}
async function resolve(f, id) { login('support'); await f.tickets.changeStatus(id, 'IN_PROGRESS'); f.clock.advance(1); await f.tickets.changeStatus(id, 'RESOLVED', 'Resolução homologada'); login(); return (await f.satisfaction.get(id)).at(-1); }
async function ready(origin = false) { const f = fixture(); const t = await create(f, origin); const o = await resolve(f, t.id); return { ...f, t, o }; }
const input = (f, overrides = {}) => ({ resolutionEventId: f.o.resolutionEventId, clientRequestId: 'request', resolvedAnswer: true, ...overrides });
const range = { start: '2026-10-08T00:00:00.000Z', end: '2026-10-10T00:00:00.000Z' };
const storage = () => JSON.stringify([...window.localStorage.data]);
test.beforeEach(() => { window.localStorage.clear(); locks.clear(); });
for (const origin of [false, true]) test(`CLIENT solicitante avalia resolução ${origin ? 'Atena' : 'manual'} sem alterar ticket nem emitir alerta`, async () => {
 const f = await ready(origin); const t = await f.tickets.get(f.t.id); const notices = window.localStorage.getItem('7support.spec05.notifications.v1');
 const r = await f.satisfaction.submit(f.t.id, input(f)); assert.equal(r.rating, null); assert.equal(r.comment, null); assert.equal(r.originKey, `SATISFACTION:${t.id}:${f.o.resolutionEventId}:user-alpha`);
 assert.deepEqual(await f.tickets.get(t.id), t); assert.equal(window.localStorage.getItem('7support.spec05.notifications.v1'), notices); assert.equal((await f.satisfaction.get(t.id))[0].status, 'SUBMITTED');
});
for (const role of ['support', 'admin', 'beta']) test(`${role} não envia avaliação em nome do solicitante`, async () => { const f = await ready(); login(role); await assert.rejects(f.satisfaction.submit(f.t.id, input(f))); assert.equal((await f.repository.read()).feedback.length, 0); });
test('Beta não consulta feedback Alpha; operadores autorizados leem comentários', async () => {
 const f = await ready(); await f.satisfaction.submit(f.t.id, input(f, { comment: '  Comentário CLIENT  ', rating: 4 })); login('beta'); await assert.rejects(f.satisfaction.get(f.t.id));
 for (const role of ['support', 'admin']) { login(role); assert.equal((await f.satisfaction.get(f.t.id))[0].feedback.comment, 'Comentário CLIENT'); }
});
test('outro requester no mesmo tenant não lê nem envia', async () => {
 const f = await ready(); await f.tickets.repository.transact(db => { db.tickets.find(t => t.id === f.t.id).requesterUserId = 'outro'; });
 await assert.rejects(f.satisfaction.get(f.t.id)); await assert.rejects(f.satisfaction.submit(f.t.id, input(f)));
});
test('resposta obrigatória; rating inválido e comentário longo bloqueados', async () => {
 const f = await ready(); for (const fields of [{ resolvedAnswer: undefined }, { resolvedAnswer: 'Sim' }, { rating: 0 }, { rating: 6 }, { rating: 1.5 }, { rating: NaN }, { comment: 'a'.repeat(2001) }, { comment: 123 }]) await assert.rejects(f.satisfaction.submit(f.t.id, input(f, fields)), /Sim\/Não/);
 assert.equal((await f.repository.read()).feedback.length, 0);
});
for (const rating of [1, 2, 3, 4, 5, null]) test(`rating ${rating} e limite de 2000 caracteres aceitos`, async () => { const f = await ready(); const r = await f.satisfaction.submit(f.t.id, input(f, { rating, comment: 'a'.repeat(2000) })); assert.equal(r.rating, rating); assert.equal(r.comment.length, 2000); });
test('comentário vazio vira null; retry sem nota retorna registro imutável', async () => { const f = await ready(); const a = await f.satisfaction.submit(f.t.id, input(f, { comment: '   ' })); const raw = window.localStorage.getItem(SATISFACTION_STORAGE_KEY); const b = await f.satisfaction.submit(f.t.id, input(f, { clientRequestId: 'retry', rating: null, comment: null })); assert.deepEqual(a, b); assert.equal(window.localStorage.getItem(SATISFACTION_STORAGE_KEY), raw); });
for (const fields of [{ resolvedAnswer: false }, { rating: 5 }, { comment: 'novo' }]) test(`retry diferente ${JSON.stringify(fields)} é CONFLICT`, async () => { const f = await ready(); const a = await f.satisfaction.submit(f.t.id, input(f)); await assert.rejects(f.satisfaction.submit(f.t.id, input(f, fields)), error => error.code === 'CONFLICT'); assert.deepEqual((await f.repository.read()).feedback, [a]); });
test('duas abas concorrentes enviam um único feedback', async () => { const f = await ready(); const other = new SatisfactionService(new LocalSatisfactionRepository(), new TicketService(new LocalTicketRepository(), f.clock), f.clock); const r = await Promise.all([f.satisfaction.submit(f.t.id, input(f)), other.submit(f.t.id, input(f, { clientRequestId: 'other' }))]); assert.equal(r[0].id, r[1].id); assert.equal((await f.repository.read()).feedback.length, 1); });
test('confirmações diferentes concorrentes possuem uma vencedora', async () => { const f = await ready(); const result = await Promise.allSettled([f.satisfaction.submit(f.t.id, input(f)), f.satisfaction.submit(f.t.id, input(f, { resolvedAnswer: false }))]); assert.equal(result.filter(r => r.status === 'fulfilled').length, 1); assert.equal(result.find(r => r.status === 'rejected').reason.code, 'CONFLICT'); });
test('CLOSED continua elegível; Não não reabre', async () => { const f = await ready(); login('support'); await f.tickets.changeStatus(f.t.id, 'CLOSED'); login(); await f.satisfaction.submit(f.t.id, input(f, { resolvedAnswer: false })); assert.equal((await f.tickets.get(f.t.id)).status, 'CLOSED'); });
test('REOPENED antes do feedback cancela e rejeita oportunidade antiga; nova resolução é nova oportunidade', async () => {
 const f = await ready(); login('support'); await f.tickets.changeStatus(f.t.id, 'REOPENED', 'Ainda precisa de ajuda'); login(); assert.equal((await f.satisfaction.get(f.t.id))[0].status, 'CANCELLED_BY_REOPEN'); await assert.rejects(f.satisfaction.submit(f.t.id, input(f)), error => error.code === 'NOT_ELIGIBLE'); const next = await resolve(f, f.t.id); assert.notEqual(next.resolutionEventId, f.o.resolutionEventId); assert.notEqual(next.cycleStartEventId, f.o.cycleStartEventId); await f.satisfaction.submit(f.t.id, input(f, { resolutionEventId: next.resolutionEventId }));
 login('support'); const report = await f.reporting.query(range); assert.equal(report.satisfaction.cancelled, 1); assert.equal(report.satisfaction.opportunities, 1); assert.equal(report.satisfaction.responseRate, 1);
});
test('REOPENED após feedback preserva histórico e idempotência da resolução antiga', async () => {
 const f = await ready(); const record = await f.satisfaction.submit(f.t.id, input(f)); login('support'); await f.tickets.changeStatus(f.t.id, 'REOPENED', 'Novo atendimento'); login(); assert.deepEqual(await f.satisfaction.submit(f.t.id, input(f)), record); const next = await resolve(f, f.t.id); await f.satisfaction.submit(f.t.id, input(f, { resolutionEventId: next.resolutionEventId, resolvedAnswer: false })); const items = await f.satisfaction.get(f.t.id); assert.equal(items.length, 2); assert.deepEqual(items[0].feedback, record); assert.equal(items[1].feedback.resolvedAnswer, false);
});
test('reabertura ganha lock antes do envio: falha fechada no commit', async () => {
 const f = await ready(); login('support'); let release, entered; const barrier = new Promise(r => { entered = r; }); const gate = new Promise(r => { release = r; });
 const holding = f.tickets.repository.transact(async db => { const t = db.tickets.find(t => t.id === f.t.id); t.status = 'REOPENED'; t.events.push({ id: 'reopen', ticketId: t.id, eventType: 'STATUS_CHANGED', oldStatus: 'RESOLVED', newStatus: 'REOPENED', createdAt: f.clock.now().toISOString() }); entered(); await gate; });
 await barrier; login(); const sending = f.satisfaction.submit(f.t.id, input(f)); release(); await holding; await assert.rejects(sending, error => error.code === 'NOT_ELIGIBLE'); assert.equal((await f.repository.read()).feedback.length, 0);
});
test('sessão muda dentro da transação de feedback: nenhuma gravação', async () => {
 const f = await ready(); const repo = { read: () => f.repository.read(), subscribe: () => () => {}, transact: work => f.repository.transact(db => { login('beta'); return work(db); }) };
 await assert.rejects(new SatisfactionService(repo, f.tickets, f.clock).submit(f.t.id, input(f)), /sessão/); assert.equal((await f.repository.read()).feedback.length, 0);
});
test('sem Web Locks falha fechado', async () => { const f = await ready(); Object.defineProperty(navigator, 'locks', { value: undefined, configurable: true }); try { await assert.rejects(f.satisfaction.submit(f.t.id, input(f)), /transações seguras/); } finally { Object.defineProperty(navigator, 'locks', { value: lockManager, configurable: true }); } });
test('refresh preserva avaliação e cancelamento derivados de eventos', async () => { const f = await ready(); const record = await f.satisfaction.submit(f.t.id, input(f, { rating: 5, comment: 'Ótimo' })); const fresh = new SatisfactionService(new LocalSatisfactionRepository(), new TicketService(new LocalTicketRepository(), f.clock), f.clock); assert.deepEqual((await fresh.get(f.t.id))[0].feedback, record); });
test('resolução legada sem marcador não inventa oportunidade; futura resolução aceita', async () => { const f = await ready(); await f.tickets.repository.transact(db => { delete db.tickets.find(t => t.id === f.t.id).events.find(e => e.id === f.o.resolutionEventId).satisfactionEligible; }); assert.deepEqual(await f.satisfaction.get(f.t.id), []); await assert.rejects(f.satisfaction.submit(f.t.id, input(f))); login('support'); await f.tickets.changeStatus(f.t.id, 'REOPENED', 'Novo ciclo'); const next = await resolve(f, f.t.id); assert.equal(next.status, 'ELIGIBLE'); });
for (const role of ['support', 'admin']) test(`${role} consulta agregados incluindo não atribuídos`, async () => { const f = await ready(); login(role); const report = await f.reporting.query(range); assert.ok(report.volume.created >= 1); assert.equal(report.attendance.completedCycles, 1); });
test('CLIENT não consulta agregado nem opções mesmo com filtros próprios', async () => { const f = await ready(); await assert.rejects(f.reporting.query({ ...range, clientId: 'client-alpha' }), /SUPPORT\/ADMIN/); await assert.rejects(f.reporting.filterOptions()); });
test('reporting vazio não inicializa/migra tickets, ciclos, política ou feedback', async () => { const f = fixture(); login('admin'); const before = storage(); const result = await f.reporting.query(range); await f.reporting.filterOptions(); assert.equal(result.volume.created, 0); assert.equal(result.satisfaction.rating.mean, null); assert.equal(result.sla.firstResponse.metRate, null); assert.equal(storage(), before); });
test('reporting não reconcilia, calcula SLA operacional, alerta, avalia nem grava', async () => { const f = await ready(); login('support'); await f.tickets.assume(f.t.id); f.clock.advance(10000); const before = storage(); f.sla.getInternal = () => { throw new Error('operacional proibido'); }; f.sla.reconcile = () => { throw new Error('reconciliação proibida'); }; await f.reporting.query(range); await f.reporting.filterOptions(); assert.equal(storage(), before); assert.equal((await f.cycles.read()).cycles.length, 0); });
test('reporting lê v1 sem salvar migração nem criar flags demo em ticket', async () => { const f = await ready(); login('support'); const key = '7support.spec03.tickets.v1'; const db = JSON.parse(window.localStorage.getItem(key)); db.version = 1; delete db.tickets[0].priority; window.localStorage.setItem(key, JSON.stringify(db)); const before = storage(); await f.reporting.query(range); assert.equal(storage(), before); assert.ok(!JSON.parse(window.localStorage.getItem(key)).tickets.some(t => 'demo' in t)); });
test('UTC [start,end) exclui exato fim e inclui exato início; filtros acumulam', async () => { const f = fixture(); f.clock.at = Date.parse(range.start); const a = await create(f); f.clock.at = Date.parse(range.end); await create(f); login('support'); const r = await f.reporting.query({ ...range, clientId: a.clientId, productId: a.productId, type: 'QUESTION' }); assert.equal(r.volume.created, 1); assert.equal((await f.reporting.query({ ...range, productId: 'product-finance' })).volume.created, 0); assert.equal((await f.reporting.query({ ...range, clientId: 'client-beta' })).volume.created, 0); assert.equal((await f.reporting.query({ ...range, type: 'INCIDENT' })).volume.created, 0); });
test('intervalo inválido e tipo inválido rejeitados sem escrita', async () => { const f = fixture(); login('admin'); const before = storage(); for (const query of [{ start: range.end, end: range.start }, { ...range, start: '2026-02-30T00:00:00.000Z' }, { ...range, type: 'UNKNOWN' }, { ...range, start: '2026-10-08' }]) await assert.rejects(f.reporting.query(query)); assert.equal(storage(), before); });
test('fuso local para UTC inclui dia final e respeita DST', () => { const old = process.env.TZ; process.env.TZ = 'America/New_York'; try { assert.deepEqual(localDateInterval('2026-03-08', '2026-03-08'), { start: '2026-03-08T05:00:00.000Z', end: '2026-03-09T04:00:00.000Z' }); assert.throws(() => localDateInterval('2026-02-30', '2026-03-01')); } finally { process.env.TZ = old || 'UTC'; } });
test('médias/medianas usam amostra; ausente não é zero', () => { assert.deepEqual(sample([]), { count: 0, mean: null, median: null }); assert.deepEqual(sample([1, 9, 3, 7]), { count: 4, mean: 5, median: 5 }); assert.deepEqual(sample([1, 10, 2]), { count: 3, mean: 13 / 3, median: 2 }); });
test('tempo ativo de resolução desconta pausa; resposta pública válida entra na amostra', async () => { const f = fixture(); const t = await create(f); login('support'); f.clock.advance(5); await f.tickets.postInternal(t.id, 'PUBLIC_REPLY', { body: 'Resposta', attachments: [] }); await f.tickets.changeStatus(t.id, 'IN_PROGRESS'); f.clock.advance(5); await f.tickets.changeStatus(t.id, 'WAITING_CUSTOMER'); f.clock.advance(100); await f.tickets.changeStatus(t.id, 'IN_PROGRESS'); f.clock.advance(5); await f.tickets.changeStatus(t.id, 'RESOLVED', 'Concluído'); await f.sla.getInternal(t.id); const before = storage(); const r = await f.reporting.query(range); assert.deepEqual(r.attendance.firstResponse, { count: 1, mean: 5, median: 5 }); assert.deepEqual(r.attendance.resolution, { count: 1, mean: 15, median: 15 }); assert.equal(r.sla.resolution.MET, 1); assert.equal(storage(), before); });
test('resolução sem resposta: NOT_MET no denominador SLA; sem marco exclui média', async () => { const f = await ready(); login('support'); await f.sla.getInternal(f.t.id); const r = await f.reporting.query(range); assert.equal(r.attendance.firstResponse.count, 0); assert.equal(r.attendance.firstResponse.mean, null); assert.equal(r.attendance.missingFirstResponse, 1); assert.equal(r.sla.firstResponse.NOT_MET, 1); assert.equal(r.sla.firstResponse.denominator, 1); assert.equal(r.sla.firstResponse.metRate, 0); });
test('legado sem snapshot conta volume mas exclui tempos/SLA; não inventa duração', async () => { const f = await ready(); login('support'); const r = await f.reporting.query(range); assert.equal(r.attendance.notConfigured, 1); assert.equal(r.attendance.resolution.count, 0); assert.equal(r.sla.resolution.NOT_CONFIGURED, 1); assert.equal(r.sla.resolution.denominator, 0); assert.equal((await f.cycles.read()).cycles.length, 0); });
test('SLA classifica MET/NOT_MET/PENDING/NOT_CONFIGURED/INVALID_HISTORY separadamente', async () => {
 const f = await ready(); login('support'); await f.sla.getInternal(f.t.id); const tickets = [await f.tickets.getInternal(f.t.id)], cycles = (await f.cycles.read()).cycles;
 for (const state of ['MET', 'NOT_MET', 'PENDING', 'NOT_CONFIGURED', 'INVALID_HISTORY']) { const c = structuredClone(cycles); for (const metric of ['firstResponse', 'resolution']) { c[0].evaluation[metric].result = ['MET', 'NOT_MET', 'PENDING'].includes(state) ? state : 'PENDING'; c[0].evaluation[metric].state = ['NOT_CONFIGURED', 'INVALID_HISTORY'].includes(state) ? state : 'ON_TRACK'; } c[0].evaluation.state = ['NOT_CONFIGURED', 'INVALID_HISTORY'].includes(state) ? state : 'ON_TRACK'; const r = calculateReporting(tickets, c, [], range); assert.equal(r.sla.resolution[state], 1); assert.equal(r.sla.resolution.denominator, ['MET', 'NOT_MET'].includes(state) ? 1 : 0); }
});
test('ciclo persistido ainda não avaliado é PENDING sem reconciliação; ausência é NOT_CONFIGURED', async () => { const f = await ready(); login('support'); await f.sla.getInternal(f.t.id); await f.cycles.transact(db => { db.cycles[0].evaluation = null; }); const before = storage(); const r = await f.reporting.query(range); assert.equal(r.sla.resolution.PENDING, 1); assert.equal(r.attendance.pending, 1); assert.equal(storage(), before); });
test('resposta submittedAt e oportunidades RESOLVED têm coortes explícitas; rating null excluído', async () => { const f = await ready(); f.clock.advance(24 * 60); await f.satisfaction.submit(f.t.id, input(f)); login('support'); const first = await f.reporting.query({ start: range.start, end: '2026-10-09T00:00:00.000Z' }); assert.equal(first.satisfaction.received, 0); assert.equal(first.satisfaction.opportunities, 1); assert.equal(first.satisfaction.responseRate, 0); const next = await f.reporting.query({ start: '2026-10-09T00:00:00.000Z', end: range.end }); assert.equal(next.satisfaction.received, 1); assert.equal(next.satisfaction.opportunities, 0); assert.equal(next.satisfaction.responseRate, null); assert.equal(next.satisfaction.positiveRate, 1); assert.equal(next.satisfaction.rating.count, 0); assert.equal(next.satisfaction.rating.mean, null); });
test('volume distingue tickets/eventos de reabertura; ciclos históricos permanecem íntegros', async () => { const f = await ready(); login('support'); await f.sla.getInternal(f.t.id); const original = (await f.cycles.read()).cycles[0]; for (let i = 0; i < 2; i++) { login('support'); await f.tickets.changeStatus(f.t.id, 'REOPENED', 'Novo ciclo'); await resolve(f, f.t.id); login('support'); await f.sla.getInternal(f.t.id); } const r = await f.reporting.query(range); assert.equal(r.volume.resolved, 1); assert.equal(r.volume.reopenedTickets, 1); assert.equal(r.volume.reopenedEvents, 2); assert.equal(r.volume.reopenRate, 1); assert.equal(r.attendance.completedCycles, 3); assert.deepEqual((await f.cycles.read()).cycles[0], original); });
test('sessão muda enquanto query lê: falha fechada', async () => { const f = await ready(); login('support'); const reporting = new ReportingService(f.tickets, { reportingSnapshot: async () => { login(); return []; } }, f.repository); await assert.rejects(reporting.query(range)); });
test('satisfação agrega Sim/Não e rating apenas informado em múltiplos ciclos', async () => {
 const f = await ready(); await f.satisfaction.submit(f.t.id, input(f, { rating: 4 })); login('support'); await f.tickets.changeStatus(f.t.id, 'REOPENED', 'Outro atendimento'); const o = await resolve(f, f.t.id); await f.satisfaction.submit(f.t.id, input(f, { resolutionEventId: o.resolutionEventId, resolvedAnswer: false })); login('support'); const r = await f.reporting.query(range); assert.equal(r.satisfaction.received, 2); assert.equal(r.satisfaction.yes, 1); assert.equal(r.satisfaction.no, 1); assert.equal(r.satisfaction.positiveRate, 0.5); assert.equal(r.satisfaction.rating.mean, 4); assert.equal(r.satisfaction.rating.count, 1); assert.equal(r.satisfaction.opportunities, 2);
});
test('produto revogado na transação de satisfação falha fechado', async () => {
 const f = await ready(); const original = localIdentityStore.productsFor; const repo = { read: () => f.repository.read(), subscribe: () => () => {}, transact: work => f.repository.transact(db => { localIdentityStore.productsFor = () => []; return work(db); }) };
 try { await assert.rejects(new SatisfactionService(repo, f.tickets, f.clock).submit(f.t.id, input(f)), /Produto não autorizado/); assert.equal((await f.repository.read()).feedback.length, 0); } finally { localIdentityStore.productsFor = original; }
});
test('snapshot com duração inválida não entra em médias nem denominador SLA', async () => { const f = await ready(); login('support'); await f.sla.getInternal(f.t.id); await f.cycles.transact(db => { db.cycles[0].evaluation.resolution.activeElapsedMinutes = -1; }); const before = storage(); const r = await f.reporting.query(range); assert.equal(r.attendance.resolution.count, 0); assert.equal(r.attendance.invalidHistory, 1); assert.equal(r.sla.resolution.INVALID_HISTORY, 1); assert.equal(r.sla.resolution.denominator, 0); assert.equal(storage(), before); });
