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
}
const events = new EventTarget();
global.window = { localStorage: new MemoryStorage(), addEventListener: events.addEventListener.bind(events), removeEventListener: events.removeEventListener.bind(events), dispatchEvent: events.dispatchEvent.bind(events) };
const { localIdentityStore } = require('../../src/services/local-identity/store.ts');
const { localTicketRepository } = require('../../src/services/tickets/local-repository.ts');
const { createDemoDatabase } = require('../../src/services/tickets/demo-data.ts');
const { ticketService, allowedTransitions } = require('../../src/services/tickets/service.ts');
const key = '7support.spec03.tickets.v1';
const txt = { originalFilename: 'interno.txt', mimeType: 'text/plain', sizeBytes: 3, dataUrl: 'data:text/plain;base64,YWJj' };

test('migração da SPEC 03 preserva IDs, códigos, sequência e respostas', async () => {
  const old = createDemoDatabase(); old.version = 1;
  for (const ticket of old.tickets) { delete ticket.priority; delete ticket.category; delete ticket.assignedToUserId; }
  old.tickets[0].messages.push({ id: 'persisted-response', ticketId: old.tickets[0].id, authorUserId: 'user-alpha', authorName: 'Cliente Alpha', authorType: 'CLIENT', visibility: 'PUBLIC_REPLY', body: 'Resposta anterior', createdAt: new Date().toISOString(), attachments: [] });
  window.localStorage.setItem(key, JSON.stringify(old));
  const migrated = await localTicketRepository.read();
  assert.equal(migrated.version, 2); assert.equal(migrated.nextPublicNumber, 8);
  assert.deepEqual(migrated.tickets.map(t => [t.id, t.publicCode]), old.tickets.map(t => [t.id, t.publicCode]));
  assert.equal(migrated.tickets[0].messages.at(-1).body, 'Resposta anterior');
  assert.equal(migrated.tickets[0].assignedToUserId, null);
  assert.equal(migrated.tickets[1].assignedToUserId, 'user-support');
  assert.equal(JSON.parse(window.localStorage.getItem(key)).version, 2);
});

test('perfis, atribuição, transferência, prioridade e categoria são auditados', async () => {
  assert.ok(localIdentityStore.login('cliente.alpha@demo.7support.local', 'demo-alpha'));
  await assert.rejects(ticketService.listInternal(), { code: 'FORBIDDEN' });
  await assert.rejects(ticketService.assume((await ticketService.list())[0].id), { code: 'FORBIDDEN' });
  localIdentityStore.logout();
  assert.ok(localIdentityStore.login('suporte@demo.7support.local', 'demo-suporte'));
  assert.equal((await ticketService.listInternal()).length, 7);
  const open = (await ticketService.listInternal()).find(t => t.publicCode === 'CS-000001');
  await ticketService.assume(open.id);
  assert.equal((await ticketService.getInternal(open.id)).assignedToUserId, 'user-support');
  await assert.rejects(ticketService.assume(open.id), { code: 'VALIDATION' });
  await ticketService.assign(open.id, 'operator-marina');
  await assert.rejects(ticketService.assign(open.id, 'client-alpha'), { code: 'VALIDATION' });
  await ticketService.changePriority(open.id, 'CRITICAL');
  await ticketService.changeCategory(open.id, 'INCIDENT');
  const changed = await ticketService.getInternal(open.id);
  assert.equal(changed.assignedToUserId, 'operator-marina');
  assert.equal(changed.priority, 'CRITICAL'); assert.equal(changed.category, 'INCIDENT');
  assert.ok(changed.events.some(e => e.eventType === 'TRANSFERRED' && e.description.includes('Equipe de Suporte') && e.description.includes('Marina Costa')));
  assert.ok(changed.events.filter(e => ['ASSIGNED', 'TRANSFERRED', 'PRIORITY_CHANGED', 'CATEGORY_CHANGED'].includes(e.eventType)).every(e => e.actorUserId === 'user-support' && e.correlationId && e.createdAt));
});

test('status segue máquina, resolução e reabertura são operacionais', async () => {
  const open = (await ticketService.listInternal()).find(t => t.publicCode === 'CS-000001');
  await assert.rejects(ticketService.changeStatus(open.id, 'RESOLVED', 'Pular etapa'), { code: 'VALIDATION' });
  await ticketService.changeStatus(open.id, 'IN_PROGRESS');
  await ticketService.changeStatus(open.id, 'UNDER_ANALYSIS');
  await assert.rejects(ticketService.changeStatus(open.id, 'WAITING_CUSTOMER'), { code: 'VALIDATION' });
  await assert.rejects(ticketService.changeStatus(open.id, 'RESOLVED'), { code: 'VALIDATION' });
  await ticketService.changeStatus(open.id, 'RESOLVED', 'Orientação concluída');
  await assert.rejects(ticketService.postInternal(open.id, 'PUBLIC_REPLY', { body: 'Tarde demais', attachments: [] }), { code: 'VALIDATION' });
  await assert.rejects(ticketService.changeStatus(open.id, 'REOPENED'), { code: 'VALIDATION' });
  await ticketService.changeStatus(open.id, 'REOPENED', 'Falha persistiu');
  await ticketService.changeStatus(open.id, 'IN_PROGRESS');
  const waiting = (await ticketService.listInternal()).find(t => t.publicCode === 'CS-000003');
  await ticketService.changeStatus(waiting.id, 'IN_PROGRESS');
  assert.equal((await ticketService.getInternal(waiting.id)).status, 'IN_PROGRESS');
  assert.deepEqual(allowedTransitions('CLOSED'), ['REOPENED']);
  assert.equal((await localTicketRepository.read()).tickets.find(t => t.id === open.id).status, 'IN_PROGRESS');
});

test('nota e anexo internos nunca retornam ao CLIENT; resposta pública retorna', async () => {
  const alpha = (await ticketService.listInternal()).find(t => t.publicCode === 'CS-000002');
  await ticketService.postInternal(alpha.id, 'INTERNAL_NOTE', { body: 'Segredo operacional', attachments: [txt] });
  const internal = await ticketService.getInternal(alpha.id);
  const secretFile = internal.messages.at(-1).attachments[0].id;
  assert.equal(internal.messages.at(-1).visibility, 'INTERNAL_NOTE');
  await ticketService.postInternal(alpha.id, 'PUBLIC_REPLY', { body: 'Resposta visível', attachments: [] });
  const persisted = JSON.parse(window.localStorage.getItem(key));
  assert.ok(persisted.tickets.find(t => t.id === alpha.id).messages.some(m => m.body === 'Segredo operacional'));
  localIdentityStore.logout(); localIdentityStore.login('cliente.alpha@demo.7support.local', 'demo-alpha');
  const client = await ticketService.get(alpha.id);
  assert.ok(client.messages.some(m => m.body === 'Resposta visível'));
  assert.ok(!client.messages.some(m => m.body === 'Segredo operacional'));
  assert.ok(!client.events.some(e => e.eventType === 'INTERNAL_NOTE_CREATED' || e.eventType === 'TRANSFERRED'));
  assert.ok((await ticketService.list()).every(t => t.messages.every(m => m.visibility === 'PUBLIC_REPLY')));
  const replyResult = await ticketService.reply(alpha.id, { body: 'Recebido pelo cliente', attachments: [] });
  assert.ok(!replyResult.messages.some(m => m.body === 'Segredo operacional'));
  assert.ok(!replyResult.events.some(e => e.eventType === 'INTERNAL_NOTE_CREATED'));
  await assert.rejects(ticketService.attachment(alpha.id, secretFile), { code: 'NOT_FOUND' });
  const beta = (await localTicketRepository.read()).tickets.find(t => t.publicCode === 'CS-000005');
  await assert.rejects(ticketService.get(beta.id), { code: 'NOT_FOUND' });
  localIdentityStore.logout(); localIdentityStore.login('cliente.beta@demo.7support.local', 'demo-beta');
  assert.deepEqual((await ticketService.list()).map(t => t.publicCode).sort(), ['CS-000005', 'CS-000006', 'CS-000007']);
  await assert.rejects(ticketService.get(alpha.id), { code: 'NOT_FOUND' });
  localIdentityStore.logout(); localIdentityStore.login('admin@demo.7support.local', 'demo-admin');
  assert.equal((await ticketService.listInternal()).length, 7);
});
