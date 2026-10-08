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
const { LocalSlaCycleRepository, LocalSlaPolicyRepository, CYCLE_STORAGE_KEY } = require('../../src/services/sla/local-repository.ts');
const { calculateSla } = require('../../src/services/sla/calculator.ts');
const { notificationService } = require('../../src/services/notifications/service.ts');
const { localNotificationRepository } = require('../../src/services/notifications/local-repository.ts');
function login(role = 'alpha') {
  const data = { alpha: ['cliente.alpha', 'alpha'], beta: ['cliente.beta', 'beta'], support: ['suporte', 'suporte'], admin: ['admin', 'admin'] }[role];
  assert.ok(localIdentityStore.login(`${data[0]}@demo.7support.local`, `demo-${data[1]}`));
}
class FakeClock {
  at = Date.parse('2026-10-08T12:00:00.000Z');
  now() { return new Date(this.at); }
  advance(minutes) { this.at += minutes * 60000; }
}
function fixture() {
  const clock = new FakeClock(); const tickets = new TicketService(new LocalTicketRepository(), clock);
  const policies = new LocalSlaPolicyRepository(); const cycles = new LocalSlaCycleRepository();
  const service = new SlaService(policies, cycles, tickets, notificationService, clock);
  return { clock, tickets, policies, cycles, service };
}
const draft = (overrides = {}) => ({ productId: 'product-commander', priority: 'MEDIUM', firstResponseMinutes: 10, resolutionMinutes: 20, pauseResolutionWhileWaitingCustomer: true, ...overrides });
async function ticket(f, origin = false) {
  login();
  const input = { productId: 'product-commander', type: 'QUESTION', impact: 'LOW_IMPACT', subject: 'SLA teste', description: 'Contexto CLIENT', attachments: [] };
  return origin ? f.tickets.createFromAtena(input, { conversationId: 'own', escalationId: 'escalation' }, async () => ({ id: 'own', productId: input.productId, userId: 'user-alpha', tenantId: 'client-alpha' })) : f.tickets.create(input);
}
async function ready(options = {}) {
  const f = fixture();
  login('admin'); const policy = await f.service.createPolicy(draft(options)); await f.service.publishPolicy(policy.id);
  f.clock.advance(1); const t = await ticket(f); login('support');
  return { ...f, t, policy };
}
async function current(f) { return (await f.service.getInternal(f.t.id)).cycles.at(-1); }
async function reply(f) { return f.tickets.postInternal(f.t.id, 'PUBLIC_REPLY', { body: 'Resposta pública', attachments: [] }); }
async function resolve(f) { await f.tickets.changeStatus(f.t.id, 'IN_PROGRESS'); return f.tickets.changeStatus(f.t.id, 'RESOLVED', 'Resolvido'); }
async function alerts() { return (await localNotificationRepository.read()).notifications.filter(item => item.type === 'SLA_BREACHED'); }
test.beforeEach(() => { window.localStorage.clear(); locks.clear(); });

test('ADMIN cria/publica; publicação imutável e nova versão mantém auditoria', async () => {
  const f = fixture(); login('admin'); const p = await f.service.createPolicy(draft());
  assert.equal(p.status, 'DRAFT'); const published = await f.service.publishPolicy(p.id);
  assert.equal(published.status, 'PUBLISHED'); assert.equal(published.version, 2); assert.equal(published.audit.length, 2);
  assert.deepEqual(await f.service.publishPolicy(p.id), published);
  const next = await f.service.createPolicy(draft({ firstResponseMinutes: 5 })); assert.equal(next.version, 3);
  assert.deepEqual((await f.policies.read()).policies.find(item => item.id === p.id), published);
});
for (const role of ['alpha', 'support']) test(`${role} não publica/configura política`, async () => {
  const f = fixture(); login(role); await assert.rejects(f.service.createPolicy(draft()), /ADMIN/); await assert.rejects(f.service.publishPolicy('demo:product-commander:MEDIUM:1'), /ADMIN/);
});
test('CLIENT não consulta políticas nem histórico interno', async () => { const f = fixture(); const t = await ticket(f); await assert.rejects(f.service.listPolicies()); await assert.rejects(f.service.getInternal(t.id)); });
test('publicação concorrente possui uma única vencedora, sem ambiguidade temporal', async () => {
  const f = fixture(); login('admin'); const [a, b] = await Promise.all([f.service.createPolicy(draft()), f.service.createPolicy(draft())]);
  const result = await Promise.allSettled([f.service.publishPolicy(a.id), f.service.publishPolicy(b.id)]);
  assert.equal(result.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal((await f.policies.read()).policies.filter(item => !item.demo && item.status === 'PUBLISHED').length, 1);
});
test('metas inválidas, produto inválido e pausa inválida são bloqueados', async () => {
  const f = fixture(); login('admin');
  for (const input of [draft({ firstResponseMinutes: 0 }), draft({ resolutionMinutes: -1 }), draft({ firstResponseMinutes: Infinity }), draft({ firstResponseMinutes: 1.5 }), draft({ productId: 'unknown' }), draft({ pauseResolutionWhileWaitingCustomer: 'yes' })]) await assert.rejects(f.service.createPolicy(input));
});
test('mudança de sessão dentro da transação bloqueia publicação', async () => {
  const f = fixture(); login('admin'); const p = await f.service.createPolicy(draft());
  const repository = { ...f.policies, read: () => f.policies.read(), subscribe: () => () => {}, transact: work => f.policies.transact(db => { login('support'); return work(db); }) };
  const service = new SlaService(repository, f.cycles, f.tickets, notificationService, f.clock);
  await assert.rejects(service.publishPolicy(p.id), /sessão/);
});
test('ticket sem política permanece NOT_CONFIGURED mesmo após publicação posterior', async () => {
  const f = fixture(); await f.policies.transact(db => { db.policies = []; }); const t = await ticket(f); login('support');
  assert.equal((await f.service.getInternal(t.id)).state, 'NOT_CONFIGURED');
  login('admin'); f.clock.advance(1); const p = await f.service.createPolicy(draft()); await f.service.publishPolicy(p.id);
  assert.equal((await f.service.getInternal(t.id)).state, 'NOT_CONFIGURED'); assert.equal((await f.cycles.read()).cycles[0].policyVersionId, null);
});
test('ticket manual e Atena têm os mesmos ciclos e política; retry Atena mantém um ciclo', async () => {
  const f = fixture(); const a = await ticket(f); const b = await ticket(f, true); const retry = await ticket(f, true); assert.equal(b.id, retry.id);
  login('support'); const av = await f.service.getInternal(a.id); const bv = await f.service.getInternal(b.id);
  assert.deepEqual(av.cycles[0].policySnapshot, bv.cycles[0].policySnapshot); assert.equal((await f.cycles.read()).cycles.length, 2);
});
for (const role of ['support', 'admin']) test(`PUBLIC_REPLY ${role} satisfaz primeira resposta`, async () => {
  const f = await ready(); login(role); f.clock.advance(5); await reply(f); const cycle = await current(f);
  assert.equal(cycle.evaluation.firstResponse.result, 'MET'); assert.equal(cycle.evaluation.firstResponse.activeElapsedMinutes, 5);
});
test('INTERNAL_NOTE, CLIENT, atribuição, prioridade e status não satisfazem resposta', async () => {
  const f = await ready(); await f.tickets.postInternal(f.t.id, 'INTERNAL_NOTE', { body: 'Nota interna', attachments: [] }); await f.tickets.assume(f.t.id); await f.tickets.changePriority(f.t.id, 'HIGH'); await f.tickets.changeStatus(f.t.id, 'IN_PROGRESS');
  login(); await f.tickets.reply(f.t.id, { body: 'Mensagem cliente', attachments: [] }); login('support');
  assert.equal((await current(f)).evaluation.firstResponse.result, 'PENDING');
});
test('limite exato é ON_TRACK; 1ms depois é BREACHED', async () => {
  const f = await ready(); f.clock.advance(10); assert.equal((await current(f)).evaluation.firstResponse.state, 'ON_TRACK');
  f.clock.at += 1; assert.equal((await current(f)).evaluation.firstResponse.state, 'BREACHED');
});
test('resposta exatamente no limite é MET e preserva resultado', async () => {
  const f = await ready(); f.clock.advance(10); await reply(f); f.clock.advance(100); assert.equal((await current(f)).evaluation.firstResponse.result, 'MET');
});
test('WAITING_CUSTOMER pausa só resolução e prazo aberto é indeterminado', async () => {
  const f = await ready(); await f.tickets.changeStatus(f.t.id, 'IN_PROGRESS'); f.clock.advance(2); await f.tickets.changeStatus(f.t.id, 'WAITING_CUSTOMER'); f.clock.advance(9);
  const cycle = await current(f); assert.equal(cycle.evaluation.firstResponse.state, 'BREACHED'); assert.equal(cycle.evaluation.resolution.state, 'PAUSED');
  assert.equal(cycle.evaluation.resolution.activeElapsedMinutes, 2); assert.equal(cycle.evaluation.resolution.dueAt, null);
});
test('política pode desabilitar a pausa; primeira resposta sempre ativa', async () => {
  const f = await ready({ pauseResolutionWhileWaitingCustomer: false }); await f.tickets.changeStatus(f.t.id, 'IN_PROGRESS'); await f.tickets.changeStatus(f.t.id, 'WAITING_CUSTOMER'); f.clock.advance(21);
  assert.equal((await current(f)).evaluation.resolution.state, 'BREACHED');
});
test('múltiplas pausas [entrada,saída) não sobrepõem nem subtraem em dobro; refresh preserva', async () => {
  const f = await ready(); await f.tickets.changeStatus(f.t.id, 'IN_PROGRESS'); f.clock.advance(2); await f.tickets.changeStatus(f.t.id, 'WAITING_CUSTOMER'); f.clock.advance(5); await f.tickets.changeStatus(f.t.id, 'IN_PROGRESS'); f.clock.advance(3); await f.tickets.changeStatus(f.t.id, 'WAITING_CUSTOMER'); f.clock.advance(7); await f.tickets.changeStatus(f.t.id, 'IN_PROGRESS');
  const a = await current(f); assert.equal(a.evaluation.resolution.activeElapsedMinutes, 5); assert.equal(a.evaluation.pauses.length, 2);
  const fresh = new SlaService(new LocalSlaPolicyRepository(), new LocalSlaCycleRepository(), f.tickets, notificationService, f.clock);
  assert.deepEqual((await fresh.getInternal(f.t.id)).cycles[0].evaluation, a.evaluation);
  assert.equal(a.evaluation.resolution.dueAt, new Date(Date.parse(a.startedAt) + 32 * 60000).toISOString());
});
for (const [elapsed, result] of [[20, 'MET'], [20 + 1 / 60000, 'NOT_MET']]) test(`resolução ${elapsed} minutos resulta ${result}`, async () => {
  const f = await ready(); await reply(f); f.clock.advance(elapsed); await resolve(f); assert.equal((await current(f)).evaluation.resolution.result, result);
});
test('resolução sem resposta marca firstResponse NOT_MET e não inventa marco', async () => {
  const f = await ready(); await resolve(f); const cycle = await current(f);
  assert.equal(cycle.evaluation.firstResponse.result, 'NOT_MET'); assert.equal(cycle.evaluation.firstResponse.satisfiedAt, null); assert.equal(cycle.evaluation.resolution.result, 'MET'); assert.equal((await alerts()).length, 0);
});
test('CLOSED preserva resultados; REOPENED novo ciclo e antigo integral', async () => {
  const f = await ready(); await reply(f); await resolve(f); const before = await current(f);
  f.clock.advance(100); await f.tickets.changeStatus(f.t.id, 'CLOSED'); assert.deepEqual(await current(f), before);
  await f.tickets.changeStatus(f.t.id, 'REOPENED', 'Novo atendimento'); const view = await f.service.getInternal(f.t.id);
  assert.equal(view.cycles.length, 2); assert.deepEqual(view.cycles[0], before); assert.equal(view.cycles[1].evaluation.firstResponse.result, 'PENDING'); assert.equal(view.cycles[1].evaluation.resolution.activeElapsedMinutes, 0);
});
test('mudança de prioridade não troca ciclo; novo ciclo usa prioridade no evento', async () => {
  const f = await ready(); const before = await current(f); await f.tickets.changePriority(f.t.id, 'CRITICAL'); assert.equal((await current(f)).policyVersionId, before.policyVersionId);
  await resolve(f); await f.tickets.changeStatus(f.t.id, 'REOPENED', 'Reabertura'); await f.tickets.changePriority(f.t.id, 'LOW');
  const cycle = await current(f); assert.equal(cycle.priorityAtCycleStart, 'CRITICAL'); assert.equal(cycle.policySnapshot.firstResponseMinutes, 15);
});
test('nova policyVersion não altera ciclo atual; reopen seleciona publicação vigente', async () => {
  const f = await ready(); const before = await current(f); f.clock.advance(1); login('admin'); const p = await f.service.createPolicy(draft({ firstResponseMinutes: 3 })); await f.service.publishPolicy(p.id);
  assert.equal((await current(f)).policyVersionId, before.policyVersionId); await resolve(f); f.clock.advance(1); await f.tickets.changeStatus(f.t.id, 'REOPENED', 'Nova solicitação');
  assert.equal((await current(f)).policyVersionId, p.id);
});
test('falha ticket->ciclo, retry tardio seleciona política temporal original', async () => {
  const f = await ready(); const failed = new SlaService(f.policies, { read: () => f.cycles.read(), subscribe: () => () => {}, transact: () => Promise.reject(new Error('falha')) }, f.tickets, notificationService, f.clock);
  await assert.rejects(failed.getInternal(f.t.id)); f.clock.advance(1); login('admin'); const p = await f.service.createPolicy(draft({ firstResponseMinutes: 2 })); await f.service.publishPolicy(p.id);
  const cycle = await current(f); assert.equal(cycle.policyVersionId, f.policy.id); assert.equal(cycle.startedAt, f.t.createdAt); assert.equal(cycle.audit[1].action, 'RECONCILED');
});
test('reabertura reconciliada depois de outra publicação usa versão do evento original', async () => {
  const f = await ready(); await reply(f); await resolve(f); await current(f); f.clock.advance(1); await f.tickets.changeStatus(f.t.id, 'REOPENED', 'Reabertura');
  f.clock.advance(1); login('admin'); const p = await f.service.createPolicy(draft({ resolutionMinutes: 3 })); await f.service.publishPolicy(p.id);
  assert.equal((await current(f)).policyVersionId, f.policy.id);
});
test('duas instâncias/abas concorrentes não duplicam ciclos ou alertas', async () => {
  const f = await ready(); await f.tickets.assume(f.t.id); f.clock.advance(21);
  const other = new SlaService(new LocalSlaPolicyRepository(), new LocalSlaCycleRepository(), new TicketService(new LocalTicketRepository(), f.clock), notificationService, f.clock);
  await Promise.all([f.service.getInternal(f.t.id), other.getInternal(f.t.id), f.service.getInternal(f.t.id)]);
  assert.equal((await f.cycles.read()).cycles.length, 1); assert.equal((await f.cycles.read()).alerts.length, 2); assert.equal((await alerts()).length, 2);
});
test('breach idempotente notifica responsável atual sem notificar CLIENT/ADMIN automaticamente', async () => {
  const f = await ready(); await f.tickets.assume(f.t.id); f.clock.advance(11); await current(f); await current(f);
  const sent = await alerts(); assert.equal(sent.length, 1); assert.equal(sent[0].userId, 'user-support'); assert.equal(sent[0].idempotencyKey, `SLA:${(await current(f)).id}:firstResponse:BREACHED`);
  login(); assert.equal((await notificationService.list()).filter(item => item.type === 'SLA_BREACHED').length, 0); login('admin'); assert.equal((await notificationService.list()).filter(item => item.type === 'SLA_BREACHED').length, 0);
});
test('unassigned tem indicador, sem notificação; atribuição tardia não repete detecção', async () => {
  const f = await ready(); f.clock.advance(11); assert.equal((await f.service.getInternal(f.t.id)).state, 'BREACHED'); assert.equal((await alerts()).length, 0);
  await f.tickets.assume(f.t.id); await current(f); assert.equal((await alerts()).length, 0);
});
test('responsável transferido antes da detecção recebe alerta correto', async () => { const f = await ready(); await f.tickets.assign(f.t.id, 'user-admin'); f.clock.advance(11); await current(f); assert.equal((await alerts())[0].userId, 'user-admin'); });
test('falha depois de notificar e antes de salvar recibo é recuperada sem segunda notificação', async () => {
  const f = await ready(); await f.tickets.assume(f.t.id); f.clock.advance(11);
  let fail = true; const repo = { read: () => f.cycles.read(), subscribe: () => () => {}, transact: work => f.cycles.transact(async db => { const result = await work(db); if (fail && db.alerts.some(alert => alert.notified)) { fail = false; throw new Error('recibo'); } return result; }) };
  const service = new SlaService(f.policies, repo, f.tickets, notificationService, f.clock);
  await assert.rejects(service.getInternal(f.t.id), /recibo/); await service.getInternal(f.t.id); assert.equal((await alerts()).length, 1);
});
test('CLIENT vê apenas resumo, não emite alertas; Beta não lê Alpha', async () => {
  const f = await ready(); await f.tickets.assume(f.t.id); f.clock.advance(11); login();
  const view = await f.service.getClient(f.t.id); assert.equal(view.firstResponse, 'Prazo excedido'); assert.deepEqual(Object.keys(view).sort(), ['firstResponse', 'resolution', 'state']); assert.equal((await alerts()).length, 0);
  login('beta'); await assert.rejects(f.service.getClient(f.t.id), /não encontrado/); assert.equal((await alerts()).length, 0);
});
test('chamados antigos não fazem backfill nem geram alertas históricos; reabertura é novo ciclo', async () => {
  const f = await ready(); await f.tickets.repository.transact(db => { delete db.tickets.find(item => item.id === f.t.id).events[0].slaStart; }); f.clock.advance(10000);
  assert.equal((await f.service.getInternal(f.t.id)).state, 'NOT_CONFIGURED'); assert.equal((await f.cycles.read()).cycles.length, 0); assert.equal((await alerts()).length, 0);
  await resolve(f); await f.tickets.changeStatus(f.t.id, 'REOPENED', 'Nova vigência'); assert.equal((await current(f)).evaluation.state, 'ON_TRACK');
});
test('timestamp inválido e histórico inconsistente retornam INVALID_HISTORY, sem prazo/alerta', async () => {
  const f = await ready(); await current(f); await f.tickets.repository.transact(db => { db.tickets.find(item => item.id === f.t.id).events[0].createdAt = 'inválido'; });
  const view = await f.service.getInternal(f.t.id); assert.equal(view.state, 'INVALID_HISTORY'); assert.equal(view.cycles[0].evaluation.resolution.dueAt, null); assert.equal((await alerts()).length, 0);
});
test('relógio volta para trás mesmo sem evento futuro: INVALID_HISTORY e recupera ao alcançar último instante', async () => {
  const f = await ready(); f.clock.advance(2); await current(f); f.clock.advance(-1);
  assert.equal((await f.service.getInternal(f.t.id)).state, 'INVALID_HISTORY'); assert.equal((await alerts()).length, 0); f.clock.advance(1); assert.equal((await f.service.getInternal(f.t.id)).state, 'ON_TRACK');
});
test('histórico de pausas inconsistente falha fechado', async () => {
  const f = await ready(); await f.tickets.repository.transact(db => { const t = db.tickets.find(item => item.id === f.t.id); t.events.push({ id: 'invalid', ticketId: t.id, eventType: 'STATUS_CHANGED', createdAt: f.clock.now().toISOString(), oldStatus: 'WAITING_CUSTOMER', newStatus: 'IN_PROGRESS' }); t.status = 'IN_PROGRESS'; });
  assert.equal((await f.service.getInternal(f.t.id)).state, 'INVALID_HISTORY'); assert.equal((await alerts()).length, 0);
});
test('calculator puro não altera ciclo/histórico e Clock fake dispensa espera real', async () => {
  const f = await ready(); const cycle = await current(f); const history = await f.tickets.slaHistory(f.t.id); const before = structuredClone({ cycle, history }); f.clock.advance(11);
  assert.equal(calculateSla(cycle, history, f.clock.now().toISOString()).state, 'BREACHED'); assert.deepEqual({ cycle, history }, before);
});
test('laboratório controla limite/pausa/resolução sem gravar tickets/ciclos/notificações', async () => {
  const f = fixture(); login('admin'); const id = 'demo:product-commander:MEDIUM:1';
  assert.equal((await f.service.demoScenario(id, 'BOUNDARY')).firstResponse.state, 'ON_TRACK'); assert.equal((await f.service.demoScenario(id, 'BREACH')).firstResponse.state, 'BREACHED');
  assert.equal((await f.service.demoScenario(id, 'PAUSE')).resolution.state, 'PAUSED'); assert.equal((await f.service.demoScenario(id, 'RESOLVED')).resolution.result, 'MET'); assert.equal((await f.service.demoScenario(id, 'NO_REPLY')).firstResponse.result, 'NOT_MET');
  assert.equal(window.localStorage.getItem(CYCLE_STORAGE_KEY), null); assert.equal((await alerts()).length, 0);
});
test('datas UTC normalizadas indevidamente, IDs duplicados e prioridade de início inválida falham fechado', async () => {
  const f = await ready(); const cycle = await current(f); const history = await f.tickets.slaHistory(f.t.id);
  for (const change of [h => { h.events[0].createdAt = '2026-02-30T12:00:00.000Z'; }, h => { h.events.push({ ...h.events[0] }); }, h => { h.events[0].slaStart.priority = 'UNKNOWN'; }]) {
    const invalid = structuredClone(history); change(invalid); assert.equal(calculateSla(cycle, invalid, f.clock.now().toISOString()).state, 'INVALID_HISTORY');
  }
});
test('ciclo concluído permanece persistido integralmente após relógio inválido; projeção não inventa prazo', async () => {
  const f = await ready(); f.clock.advance(2); await reply(f); await resolve(f); const original = await current(f);
  f.clock.advance(-1); const invalid = await f.service.getInternal(f.t.id); assert.equal(invalid.state, 'INVALID_HISTORY'); assert.equal(invalid.cycles[0].evaluation.resolution.dueAt, null);
  assert.deepEqual((await f.cycles.read()).cycles[0], original);
});
test('reabertura no mesmo milissegundo da resposta não reutiliza marco do ciclo anterior', async () => {
  const f = await ready(); await reply(f); await resolve(f); await current(f); await f.tickets.changeStatus(f.t.id, 'REOPENED', 'Novo ciclo no mesmo instante');
  assert.equal((await current(f)).evaluation.firstResponse.result, 'PENDING');
});
test('publicação temporal posterior não cobre retroativamente ciclo ainda não reconciliado sem política', async () => {
  const f = fixture(); await f.policies.transact(db => { db.policies = []; }); const t = await ticket(f); f.clock.advance(1); login('admin'); const p = await f.service.createPolicy(draft()); await f.service.publishPolicy(p.id);
  assert.equal((await f.service.getInternal(t.id)).state, 'NOT_CONFIGURED');
});
test('Clock inválido retorna INVALID_HISTORY sem deadline ou notificação', async () => {
  const f = await ready(); await current(f); f.clock.at = NaN; const view = await f.service.getInternal(f.t.id);
  assert.equal(view.state, 'INVALID_HISTORY'); assert.equal(view.cycles[0].evaluation.firstResponse.dueAt, null); assert.equal((await alerts()).length, 0);
});
test('reabertura não contorna relógio regressivo do ciclo anterior', async () => {
  const f = await ready(); f.clock.advance(5); await current(f); f.clock.advance(-2); await resolve(f); await f.tickets.changeStatus(f.t.id, 'REOPENED', 'Reabertura com clock regressivo');
  const invalid = await f.service.getInternal(f.t.id); assert.equal(invalid.state, 'INVALID_HISTORY'); assert.equal(invalid.cycles.length, 1); assert.equal((await alerts()).length, 0);
  f.clock.advance(2); assert.equal((await f.service.getInternal(f.t.id)).cycles.length, 2);
});
