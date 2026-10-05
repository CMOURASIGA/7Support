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

const { localIdentityStore } = require('../../src/services/local-identity/store.ts');
const { knowledgeService } = require('../../src/services/knowledge/service.ts');
const { LocalKnowledgeRepository } = require('../../src/services/knowledge/local-repository.ts');

const baseInput = { productId: 'product-commander', title: 'Guia criado no teste', category: 'GUIDE', content: 'Conteúdo público criado para a validação automatizada.', visibility: 'BOTH' };
function login(email, password) { assert.ok(localIdentityStore.login(email, password)); }
function loginAdmin() { login('admin@demo.7support.local', 'demo-admin'); }
function loginSupport() { login('suporte@demo.7support.local', 'demo-suporte'); }
function loginAlpha() { login('cliente.alpha@demo.7support.local', 'demo-alpha'); }
function loginBeta() { login('cliente.beta@demo.7support.local', 'demo-beta'); }
function logout() { localIdentityStore.logout(); }
async function sourceById(id) { return knowledgeService.getAdmin(id); }

test.beforeEach(() => window.localStorage.clear());

test('01 ADMIN cria conteúdo em DRAFT', async () => {
  loginAdmin(); const result = await knowledgeService.create(baseInput);
  assert.equal(result.version.status, 'DRAFT'); assert.equal(result.version.version, 1); assert.match(result.version.checksum, /^fnv1a-/);
});

test('02 DRAFT pode ser editado', async () => {
  loginAdmin(); const detail = await sourceById('knowledge-commander-access'); const draft = detail.versions[0];
  const changed = await knowledgeService.updateDraft(draft.id, { ...baseInput, title: 'Acesso atualizado', category: 'ACCESS' });
  assert.equal(changed.title, 'Acesso atualizado'); assert.equal(changed.category, 'ACCESS');
});

test('03 envio altera DRAFT para IN_REVIEW', async () => {
  loginAdmin(); const draft = (await sourceById('knowledge-commander-access')).versions[0];
  assert.equal((await knowledgeService.submitForReview(draft.id)).status, 'IN_REVIEW');
});

test('04 IN_REVIEW não pode ser editado', async () => {
  loginAdmin(); const review = (await sourceById('knowledge-finance-config')).versions[0];
  await assert.rejects(knowledgeService.updateDraft(review.id, { ...baseInput, productId: 'product-finance' }), { code: 'VALIDATION' });
});

test('05 publicação cria versão imutável', async () => {
  loginAdmin(); const review = (await sourceById('knowledge-finance-config')).versions[0];
  const published = await knowledgeService.publish(review.id);
  assert.equal(published.status, 'PUBLISHED'); assert.ok(published.publishedAt); assert.ok(published.reviewerUserId);
  await assert.rejects(knowledgeService.updateDraft(published.id, { ...baseInput, productId: 'product-finance' }), { code: 'VALIDATION' });
});

test('06 nova alteração cria nova versão DRAFT e preserva histórico', async () => {
  loginAdmin(); const detail = await sourceById('knowledge-commander-guide'); const current = detail.versions[0];
  const next = await knowledgeService.createNewVersion(detail.source.id, { productId: detail.source.productId, title: current.title, category: current.category, visibility: current.visibility, content: `${current.content} Informação adicional.` });
  const history = await sourceById(detail.source.id);
  assert.equal(next.version, 3); assert.equal(next.status, 'DRAFT'); assert.equal(history.versions.length, 3);
});

test('07 checksum impede versão materialmente idêntica', async () => {
  loginAdmin(); const detail = await sourceById('knowledge-commander-guide'); const current = detail.versions[0];
  await assert.rejects(knowledgeService.createNewVersion(detail.source.id, { productId: detail.source.productId, title: `  ${current.title.toUpperCase()} `, category: current.category, visibility: current.visibility, content: ` ${current.content} ` }), { code: 'VALIDATION' });
});

test('08 arquivamento remove conteúdo das consultas correntes', async () => {
  loginAdmin(); const current = (await sourceById('knowledge-commander-guide')).versions[0]; await knowledgeService.archive(current.id);
  logout(); loginAlpha(); assert.ok(!(await knowledgeService.listAuthorized()).some(item => item.sourceId === 'knowledge-commander-guide'));
});

test('09 CLIENT vê somente PUBLISHED CLIENT ou BOTH', async () => {
  loginAlpha(); const values = await knowledgeService.listAuthorized();
  assert.ok(values.length > 0); assert.ok(values.every(item => ['CLIENT', 'BOTH'].includes(item.visibility)));
});

test('10 CLIENT nunca visualiza INTERNAL', async () => {
  loginAlpha(); const values = await knowledgeService.listAuthorized({ query: 'Falha conhecida' });
  assert.equal(values.length, 0); await assert.rejects(knowledgeService.getAuthorized('knowledge-commander-error'), { code: 'NOT_FOUND' });
});

test('11 CLIENT consulta somente produto autorizado', async () => {
  loginAlpha(); assert.ok((await knowledgeService.listAuthorized()).every(item => item.productId === 'product-commander'));
});

test('12 SUPPORT consulta todas as visibilidades publicadas', async () => {
  loginSupport(); const values = await knowledgeService.listAuthorized();
  assert.ok(values.some(item => item.visibility === 'INTERNAL')); assert.ok(values.some(item => item.visibility === 'CLIENT')); assert.ok(values.some(item => item.visibility === 'BOTH'));
});

test('13 busca não revela conteúdo não autorizado', async () => {
  loginAlpha(); const hidden = await knowledgeService.listAuthorized({ query: 'responsável estado anterior' });
  assert.deepEqual(hidden, []); assert.equal(Object.prototype.hasOwnProperty.call(hidden, 'hiddenCount'), false);
});

test('14 histórico preserva versões anteriores', async () => {
  loginAdmin(); const detail = await sourceById('knowledge-commander-guide');
  assert.deepEqual(detail.versions.map(item => item.version), [2, 1]); assert.equal(detail.versions[1].status, 'ARCHIVED');
});

test('15 refresh preserva a base local', async () => {
  loginAdmin(); const created = await knowledgeService.create(baseInput); const fresh = new LocalKnowledgeRepository(); const database = await fresh.read();
  assert.ok(database.sources.some(item => item.id === created.source.id)); assert.ok(database.versions.some(item => item.id === created.version.id));
});

test('16 ações administrativas não autorizadas retornam FORBIDDEN', async () => {
  loginSupport(); await assert.rejects(knowledgeService.create(baseInput), { code: 'FORBIDDEN' });
  logout(); loginAlpha(); await assert.rejects(knowledgeService.listAdmin(), { code: 'FORBIDDEN' });
});

test('17 Alpha e Beta mantêm contextos de produto separados', async () => {
  loginAlpha(); const alpha = await knowledgeService.listAuthorized(); logout(); loginBeta(); const beta = await knowledgeService.listAuthorized();
  assert.ok(alpha.every(item => item.productId === 'product-commander')); assert.ok(beta.every(item => item.productId === 'product-finance'));
});

test('18 domínio não possui Atena, embeddings, chunks ou provider de IA', () => {
  const service = fs.readFileSync(path.join(__dirname, '../../src/services/knowledge/service.ts'), 'utf8');
  assert.doesNotMatch(service, /Atena|embedding|chunk|OpenAI|OpenRouter|AI Router/i);
});

test('19 autor também pode ser revisor mantendo campos separados', async () => {
  loginAdmin(); const review = (await sourceById('knowledge-finance-config')).versions[0]; const published = await knowledgeService.publish(review.id);
  assert.equal(published.authorUserId, 'user-admin'); assert.equal(published.reviewerUserId, 'user-admin'); assert.ok(Object.hasOwn(published, 'authorUserId') && Object.hasOwn(published, 'reviewerUserId'));
});

test('20 publicação sem passar por IN_REVIEW é bloqueada', async () => {
  loginAdmin(); const draft = (await sourceById('knowledge-commander-access')).versions[0];
  await assert.rejects(knowledgeService.publish(draft.id), { code: 'VALIDATION' });
});

test('21 ARCHIVED não volta diretamente a PUBLISHED', async () => {
  loginAdmin(); const archived = (await sourceById('knowledge-finance-legacy')).versions[0];
  await assert.rejects(knowledgeService.publish(archived.id), { code: 'VALIDATION' });
});

test('22 categoria fora do catálogo é bloqueada', async () => {
  loginAdmin(); await assert.rejects(knowledgeService.create({ ...baseInput, category: 'FREE_TEXT' }), { code: 'VALIDATION' });
});

test('23 checksum igual bloqueia duplicidade também após normalização', async () => {
  loginAdmin(); const detail = await sourceById('knowledge-finance-legacy'); const archived = detail.versions[0];
  await assert.rejects(knowledgeService.createNewVersion(detail.source.id, { productId: detail.source.productId, title: archived.title.toUpperCase(), category: archived.category, visibility: archived.visibility, content: `  ${archived.content}  ` }), { code: 'VALIDATION' });
});

test('24 busca CLIENT retorna apenas quantidade autorizada', async () => {
  loginAlpha(); const all = await knowledgeService.listAuthorized(); const searched = await knowledgeService.listAuthorized({ query: 'processo financeiro antigo' });
  assert.equal(all.length, 1); assert.equal(searched.length, 0); assert.ok(!JSON.stringify(searched).includes('knowledge-finance-legacy'));
});
