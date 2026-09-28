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
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  module._compile(code, filename);
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
const { ticketService } = require('../../src/services/tickets/service.ts');

test('seed, isolamento, numeração e persistência local', async () => {
  assert.ok(localIdentityStore.login('cliente.alpha@demo.7support.local', 'demo-alpha'));
  const alpha = await ticketService.list();
  assert.equal(alpha.length, 4);
  assert.deepEqual(alpha.map(t => t.status).sort(), ['IN_PROGRESS', 'OPEN', 'RESOLVED', 'WAITING_CUSTOMER']);
  assert.ok(alpha.every(t => t.productId === 'product-commander'));
  await assert.rejects(ticketService.create({ productId: 'product-finance', type: 'INCIDENT', impact: 'BLOCKING', subject: 'Proibido', description: 'Teste', attachments: [] }), { code: 'FORBIDDEN' });
  const ticket = await ticketService.create({ productId: 'product-commander', type: 'INCIDENT', impact: 'BLOCKING', subject: 'Erro de teste', description: 'Detalhes', attachments: [{ originalFilename: 'prova.txt', mimeType: 'text/plain', sizeBytes: 5, dataUrl: 'data:text/plain;base64,cHJvdmE=' }] });
  assert.match(ticket.id, /^[0-9a-f-]{36}$/);
  assert.equal(ticket.publicCode, 'CS-000008');
  assert.equal(ticket.status, 'OPEN');
  assert.equal(ticket.messages[0].attachments.length, 1);
  await ticketService.reply(ticket.id, { body: 'Mais detalhes', attachments: [] });
  const persisted = await ticketService.get(ticket.id);
  assert.equal(persisted.messages.length, 2);
  assert.equal(persisted.status, 'OPEN');
  assert.equal((await ticketService.attachment(ticket.id, ticket.messages[0].attachments[0].id)).originalFilename, 'prova.txt');
  assert.equal((await localTicketRepository.read()).nextPublicNumber, 9);
  localIdentityStore.logout();
  assert.ok(localIdentityStore.login('cliente.beta@demo.7support.local', 'demo-beta'));
  const beta = await ticketService.list();
  assert.equal(beta.length, 3);
  assert.ok(beta.every(t => t.clientId === 'client-beta'));
  await assert.rejects(ticketService.get(ticket.id), { code: 'NOT_FOUND' });
  await assert.rejects(ticketService.reply(ticket.id, { body: 'Não autorizado', attachments: [] }), { code: 'NOT_FOUND' });
  localIdentityStore.logout();
  assert.ok(localIdentityStore.login('cliente.alpha@demo.7support.local', 'demo-alpha'));
  assert.equal((await ticketService.get(ticket.id)).messages[1].body, 'Mais detalhes');
});

test('resposta a aguardando cliente preserva transição reservada ao suporte', async () => {
  const waiting = (await ticketService.list()).find(t => t.status === 'WAITING_CUSTOMER');
  assert.ok(waiting);
  await ticketService.reply(waiting.id, { body: 'Informações adicionais', attachments: [] });
  assert.equal((await ticketService.get(waiting.id)).status, 'WAITING_CUSTOMER');
  const resolved = (await ticketService.list()).find(t => t.status === 'RESOLVED');
  await assert.rejects(ticketService.reply(resolved.id, { body: 'Reabrir', attachments: [] }), { code: 'VALIDATION' });
});

test('aberturas concorrentes recebem códigos distintos sem reutilizar sequência', async () => {
  const payload = { productId: 'product-commander', type: 'QUESTION', impact: 'LOW_IMPACT', subject: 'Pergunta de concorrência', description: 'Como funciona?', attachments: [] };
  const [first, second] = await Promise.all([ticketService.create(payload), ticketService.create(payload)]);
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.publicCode, second.publicCode);
  assert.deepEqual([first.publicNumber, second.publicNumber].sort((a, b) => a - b), [9, 10]);
});
