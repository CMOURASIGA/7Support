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
const { localNotificationRepository, LocalNotificationRepository } = require('../../src/services/notifications/local-repository.ts');
const { notificationService } = require('../../src/services/notifications/service.ts');
const { localDeliveryProvider } = require('../../src/services/notifications/local-delivery-provider.ts');
const { ticketService } = require('../../src/services/tickets/service.ts');

function loginAlpha() { assert.ok(localIdentityStore.login('cliente.alpha@demo.7support.local', 'demo-alpha')); }
function loginBeta() { assert.ok(localIdentityStore.login('cliente.beta@demo.7support.local', 'demo-beta')); }
function loginSupport() { assert.ok(localIdentityStore.login('suporte@demo.7support.local', 'demo-suporte')); }
function loginAdmin() { assert.ok(localIdentityStore.login('admin@demo.7support.local', 'demo-admin')); }
function logout() { localIdentityStore.logout(); }
async function createAlpha(subject = 'Incidente notificado') {
  loginAlpha();
  return ticketService.create({ productId: 'product-commander', type: 'INCIDENT', impact: 'BLOCKING', subject, description: 'Descrição pública', attachments: [] });
}

test.beforeEach(() => { window.localStorage.clear(); localDeliveryProvider.setMode('SUCCESS'); });

test('criação, leitura, contador e refresh preservam notificação do CLIENT', async () => {
  const ticket = await createAlpha();
  const notifications = await notificationService.list();
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].type, 'TICKET_CREATED');
  assert.equal(notifications[0].tenantId, 'client-alpha');
  assert.match(notifications[0].title, new RegExp(ticket.publicCode));
  assert.equal(await notificationService.unreadCount(), 1);
  await notificationService.markAsRead(notifications[0].id);
  assert.equal(await notificationService.unreadCount(), 0);
  const freshRepository = new LocalNotificationRepository();
  const persisted = await freshRepository.read();
  assert.equal(persisted.notifications[0].status, 'READ');
  assert.ok(persisted.notifications[0].readAt);
});

test('atribuição, transferência e resposta do CLIENT notificam somente o responsável atual', async () => {
  const ticket = await createAlpha('Fluxo de responsável');
  logout(); loginSupport();
  await ticketService.assume(ticket.id);
  assert.ok((await notificationService.list()).some(item => item.type === 'TICKET_ASSIGNED'));
  await ticketService.assign(ticket.id, 'user-admin');
  assert.ok(!(await notificationService.list()).some(item => item.type === 'TICKET_TRANSFERRED'));
  logout(); loginAdmin();
  assert.ok((await notificationService.list()).some(item => item.type === 'TICKET_TRANSFERRED'));
  logout(); loginAlpha();
  await ticketService.reply(ticket.id, { body: 'Nova informação pública', attachments: [] });
  logout(); loginAdmin();
  assert.ok((await notificationService.list()).some(item => item.type === 'CLIENT_PUBLIC_REPLY'));
});

test('resposta pública, resolução e reabertura seguem a matriz autorizada', async () => {
  const ticket = await createAlpha('Fluxo completo');
  logout(); loginSupport();
  await ticketService.assume(ticket.id);
  await ticketService.postInternal(ticket.id, 'PUBLIC_REPLY', { body: 'Resposta visível', attachments: [] });
  await ticketService.changeStatus(ticket.id, 'IN_PROGRESS');
  await ticketService.changeStatus(ticket.id, 'RESOLVED', 'Solução aplicada');
  logout(); loginAlpha();
  const clientTypes = (await notificationService.list()).map(item => item.type);
  assert.ok(clientTypes.includes('SUPPORT_PUBLIC_REPLY'));
  assert.ok(clientTypes.includes('TICKET_RESOLVED'));
  logout(); loginSupport();
  await ticketService.changeStatus(ticket.id, 'REOPENED', 'Problema retornou');
  assert.ok((await notificationService.list()).some(item => item.type === 'TICKET_REOPENED'));
});

test('INTERNAL_NOTE e anexo interno não geram nem vazam conteúdo para CLIENT', async () => {
  const ticket = await createAlpha('Proteção interna');
  logout(); loginSupport();
  const before = (await localNotificationRepository.read()).notifications.length;
  await ticketService.postInternal(ticket.id, 'INTERNAL_NOTE', { body: 'Segredo operacional absoluto', attachments: [{ originalFilename: 'segredo-interno.txt', mimeType: 'text/plain', sizeBytes: 3, dataUrl: 'data:text/plain;base64,YWJj' }] });
  const database = await localNotificationRepository.read();
  assert.equal(database.notifications.length, before);
  assert.ok(!JSON.stringify(database).includes('Segredo operacional absoluto'));
  assert.ok(!JSON.stringify(database).includes('segredo-interno.txt'));
  logout(); loginAlpha();
  assert.ok(!(await notificationService.list()).some(item => item.type.includes('INTERNAL')));
});

test('idempotência bloqueia duplicidade por evento, destinatário e tipo', async () => {
  loginAlpha();
  const event = { id: 'event-fixed', type: 'TICKET_CREATED', tenantId: 'client-alpha', ticketId: 'ticket-fixed', ticketCode: 'CS-999999', subject: 'Idempotência', productName: '7Commander', clientName: 'Cliente Alpha', priority: 'MEDIUM', requesterUserId: 'user-alpha', assignedToUserId: null };
  const first = await notificationService.process(event);
  const second = await notificationService.process(event);
  assert.equal(first.id, second.id);
  const database = await localNotificationRepository.read();
  assert.equal(database.notifications.length, 1);
  assert.equal(database.deliveries.length, 1);
  assert.equal(database.notifications[0].idempotencyKey, 'event-fixed:user-alpha:TICKET_CREATED');
});

test('Alpha e Beta são isolados por destinatário e tenant', async () => {
  await createAlpha('Somente Alpha');
  logout(); loginBeta();
  await ticketService.create({ productId: 'product-finance', type: 'QUESTION', impact: 'LOW_IMPACT', subject: 'Somente Beta', description: 'Descrição Beta', attachments: [] });
  const beta = await notificationService.list();
  assert.equal(beta.length, 1);
  assert.equal(beta[0].tenantId, 'client-beta');
  assert.ok(!beta.some(item => item.title.includes('Alpha')));
  logout(); loginAlpha();
  const alpha = await notificationService.list();
  assert.equal(alpha.length, 1);
  assert.equal(alpha[0].tenantId, 'client-alpha');
  assert.ok(!alpha.some(item => item.title.includes('Beta')));
});

test('falha do LocalDeliveryProvider preserva notificação com delivery FAILED', async () => {
  localDeliveryProvider.setMode('FAILURE');
  await createAlpha('Falha simulada');
  const notifications = await notificationService.list();
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].delivery.status, 'FAILED');
  assert.equal(notifications[0].delivery.attemptCount, 1);
  assert.equal(notifications[0].delivery.errorCode, 'LOCAL_PROVIDER_FAILURE');
});
