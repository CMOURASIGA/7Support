import { localIdentityStore } from "@/services/local-identity/store";
import { localTicketRepository } from "@/services/tickets/local-repository";
import type { TicketRepository } from "@/services/tickets/repository";
import { categories, impacts, priorities, ticketTypes, type AtenaTicketOrigin, type AttachmentInput, type NewTicketInput, type ReplyInput, type Ticket, type TicketAttachment, type TicketCategory, type TicketPriority, type TicketStatus } from "@/features/tickets/types";
import { demoOperators } from "@/services/tickets/operators";
import { notificationService, ticketNotificationEvent } from "@/services/notifications/service";
import type { NotificationType } from "@/features/notifications/types";

export class TicketError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "STORAGE", message: string) { super(message); }
}
const MAX_FILE_BYTES = 512 * 1024;
const MAX_TOTAL_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/png", "image/jpeg", "text/plain"]);
function session() {
  const user = localIdentityStore.currentUser();
  if (!user) throw new TicketError("UNAUTHENTICATED", "Faça login para acessar chamados.");
  return user;
}
function clientSession() {
  const user = session();
  if (user.role !== "CLIENT" || !user.clientId) throw new TicketError("FORBIDDEN", "Esta rotina está disponível apenas para clientes.");
  return user;
}
function internalSession() {
  const user = session();
  if (user.role !== "SUPPORT" && user.role !== "ADMIN") throw new TicketError("FORBIDDEN", "A operação interna exige perfil de suporte ou administração.");
  return user;
}
function attachmentsFor(input: AttachmentInput[], ticketId: string, messageId: string, userId: string, createdAt: string): TicketAttachment[] {
  if (input.length > 4 || input.reduce((sum, file) => sum + file.sizeBytes, 0) > MAX_TOTAL_BYTES) throw new TicketError("VALIDATION", "Envie até 4 arquivos e 2 MB no total.");
  return input.map((file) => {
    if (!ALLOWED_MIME.has(file.mimeType) || file.sizeBytes < 1 || file.sizeBytes > MAX_FILE_BYTES || !file.dataUrl.startsWith(`data:${file.mimeType};base64,`) || !/^[^/\\\u0000-\u001f]{1,120}$/.test(file.originalFilename)) throw new TicketError("VALIDATION", "Arquivo inválido. Use PDF, PNG, JPG ou TXT com até 512 KB por arquivo.");
    return { id: crypto.randomUUID(), ticketId, messageId, uploadedBy: userId, createdAt, originalFilename: file.originalFilename, mimeType: file.mimeType, sizeBytes: file.sizeBytes, dataUrl: file.dataUrl };
  });
}
function allowed(ticket: Ticket) {
  const user = clientSession();
  // Na SPEC 03 o cliente visualiza somente os próprios chamados, além do limite de tenant.
  if (ticket.clientId !== user.clientId || ticket.requesterUserId !== user.id) throw new TicketError("NOT_FOUND", "Chamado não encontrado.");
  return user;
}
function sortTickets(tickets: Ticket[]) { return tickets.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); }
function forClient(ticket: Ticket): Ticket {
  return { ...ticket, messages: ticket.messages.filter((message) => message.visibility === "PUBLIC_REPLY"), events: ticket.events.filter((event) => event.audience !== "INTERNAL") };
}
const transitions: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS"], IN_PROGRESS: ["WAITING_CUSTOMER", "UNDER_ANALYSIS", "RESOLVED"],
  WAITING_CUSTOMER: ["IN_PROGRESS"], UNDER_ANALYSIS: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["CLOSED", "REOPENED"], CLOSED: ["REOPENED"], REOPENED: ["IN_PROGRESS"],
};
export function allowedTransitions(status: TicketStatus) { return transitions[status]; }

async function dispatchTicketNotification(ticket: Ticket, eventId: string, type: NotificationType) {
  await notificationService.process(ticketNotificationEvent({
    id: eventId,
    tenantId: ticket.clientId,
    ticketId: ticket.id,
    ticketCode: ticket.publicCode,
    subject: ticket.subject,
    productName: ticket.productNameSnapshot,
    clientName: ticket.clientNameSnapshot,
    priority: ticket.priority,
    requesterUserId: ticket.requesterUserId,
    assignedToUserId: ticket.assignedToUserId,
  }, type));
}

export class TicketService {
  constructor(private readonly repository: TicketRepository, private readonly clock: { now(): Date } = { now: () => new Date() }) {}
  subscribe(listener: () => void) { return this.repository.subscribe(listener); }
  async list() { const user = clientSession(); const db = await this.repository.read(); return sortTickets(db.tickets.filter((ticket) => ticket.clientId === user.clientId && ticket.requesterUserId === user.id).map(forClient)); }
  async get(id: string) { const ticket = (await this.repository.read()).tickets.find((candidate) => candidate.id === id); if (!ticket) throw new TicketError("NOT_FOUND", "Chamado não encontrado."); allowed(ticket); return forClient(ticket); }
  async listInternal() { internalSession(); return sortTickets((await this.repository.read()).tickets); }
  async getInternal(id: string) { internalSession(); const ticket = (await this.repository.read()).tickets.find((item) => item.id === id); if (!ticket) throw new TicketError("NOT_FOUND", "Chamado não encontrado."); return ticket; }
  async slaHistory(id: string) {
    const user = session();
    const ticket = (await this.repository.read()).tickets.find(item => item.id === id);
    if (!ticket) throw new TicketError("NOT_FOUND", "Chamado não encontrado.");
    if (user.role === "CLIENT") allowed(ticket); else internalSession();
    return {
      ticketId: ticket.id, tenantId: ticket.clientId, productId: ticket.productId,
      publicCode: ticket.publicCode, subject: ticket.subject, productName: ticket.productNameSnapshot,
      clientName: ticket.clientNameSnapshot, requesterUserId: ticket.requesterUserId,
      assignedToUserId: ticket.assignedToUserId, priority: ticket.priority, status: ticket.status,
      events: ticket.events.map(event => ({ id: event.id, createdAt: event.createdAt, eventType: event.eventType, oldStatus: event.oldStatus, newStatus: event.newStatus, slaStart: event.slaStart })),
      replies: ticket.messages.filter(message => message.visibility === "PUBLIC_REPLY" && message.authorType === "SUPPORT")
        .map(message => ({ id: message.id, eventId: message.eventId, createdAt: message.createdAt })),
    };
  }
  async reportingTickets() {
    const actor = internalSession();
    if (!this.repository.readOnly) throw new TicketError("STORAGE", "O repositório não oferece consulta somente leitura.");
    const database = await this.repository.readOnly();
    if (internalSession().id !== actor.id) throw new TicketError("FORBIDDEN", "A sessão mudou.");
    return database.tickets;
  }
  async withSatisfactionTicket<T>(id: string, work: (ticket: Ticket) => Promise<T>): Promise<T> {
    const user = clientSession();
    if (typeof navigator === "undefined" || !navigator.locks?.request) throw new TicketError("STORAGE", "A avaliação requer um navegador com transações seguras.");
    return this.repository.transact(async database => {
      const ticket = database.tickets.find(item => item.id === id);
      if (!ticket) throw new TicketError("NOT_FOUND", "Chamado não encontrado.");
      if (clientSession().id !== user.id || clientSession().clientId !== user.clientId) throw new TicketError("FORBIDDEN", "A sessão mudou.");
      allowed(ticket);
      if (!localIdentityStore.productsFor(user).some(product => product.id === ticket.productId)) throw new TicketError("FORBIDDEN", "Produto não autorizado.");
      return work(structuredClone(ticket));
    });
  }
  operators() { internalSession(); return demoOperators; }
  async createFromAtena(input: NewTicketInput, reference: { conversationId: string; escalationId: string }, revalidate: () => Promise<{ id: string; productId: string; userId: string; tenantId: string }>) {
    const user = clientSession();
    if (!reference.conversationId || !reference.escalationId || input.attachments.length) throw new TicketError("VALIDATION", "Origem inválida.");
    if (typeof navigator === "undefined" || !navigator.locks?.request) throw new TicketError("STORAGE", "O navegador não permite uma criação segura. Use um navegador atualizado.");
    const source = await revalidate();
    if (source.id !== reference.conversationId || source.productId !== input.productId || source.userId !== user.id || source.tenantId !== user.clientId) throw new TicketError("FORBIDDEN", "Origem não autorizada.");
    if (clientSession().id !== user.id || clientSession().clientId !== user.clientId) throw new TicketError("FORBIDDEN", "A sessão mudou.");
    const origin: AtenaTicketOrigin = { type: "ATENA", conversationId: reference.conversationId, escalationId: reference.escalationId, idempotencyKey: `ATENA:${reference.conversationId}:${user.id}` };
    return this.createTicket(input, origin, async () => {
      const current = await revalidate();
      if (current.id !== reference.conversationId || current.productId !== input.productId || current.userId !== user.id || current.tenantId !== user.clientId) throw new TicketError("FORBIDDEN", "Origem não autorizada.");
    });
  }
  async findFromAtena(conversationId: string) {
    const user = clientSession();
    const key = `ATENA:${conversationId}:${user.id}`;
    const database = await this.repository.read();
    if (clientSession().id !== user.id || clientSession().clientId !== user.clientId) throw new TicketError("FORBIDDEN", "A sessão mudou.");
    const ticket = database.tickets.find(item => item.origin?.idempotencyKey === key && item.clientId === user.clientId && item.requesterUserId === user.id);
    return ticket ? forClient(ticket) : null;
  }
  async create(input: NewTicketInput) { return this.createTicket(input); }
  private async createTicket(input: NewTicketInput, origin?: AtenaTicketOrigin, beforeCommit?: () => Promise<void>) {
    const user = clientSession();
    const client = localIdentityStore.clientFor(user);
    const product = localIdentityStore.productsFor(user).find((item) => item.id === input.productId);
    if (!client || !product) throw new TicketError("FORBIDDEN", "Produto não autorizado para este cliente.");
    if (!ticketTypes.includes(input.type) || !impacts.includes(input.impact) || !input.subject.trim() || input.subject.trim().length > 160 || !input.description.trim() || input.description.trim().length > 10000) throw new TicketError("VALIDATION", "Preencha tipo, impacto, assunto e descrição dentro dos limites indicados.");
    const result = await this.repository.transact(async (db) => {
      if (beforeCommit) await beforeCommit();
      if (clientSession().id !== user.id || clientSession().clientId !== user.clientId || !localIdentityStore.productsFor(clientSession()).some(item => item.id === input.productId)) throw new TicketError("FORBIDDEN", "A sessão ou autorização mudou.");
      const existing = origin && db.tickets.find(item => item.origin?.idempotencyKey === origin.idempotencyKey);
      if (existing) {
        if (existing.clientId !== client.id || existing.requesterUserId !== user.id || existing.productId !== input.productId) throw new TicketError("FORBIDDEN", "Origem não autorizada.");
        return { ticket: existing, created: false };
      }
      const id = crypto.randomUUID(); const messageId = crypto.randomUUID(); const timestamp = this.clock.now().toISOString();
      const publicNumber = db.nextPublicNumber++;
      const ticket: Ticket = { ...(origin ? { origin } : {}), id, publicNumber, publicCode: `CS-${String(publicNumber).padStart(6, "0")}`, clientId: client.id, clientNameSnapshot: client.displayName, requesterUserId: user.id, requesterNameSnapshot: user.displayName, requesterEmailSnapshot: user.email, productId: product.id, productNameSnapshot: product.displayName, type: input.type, impact: input.impact, status: "OPEN", priority: "MEDIUM", category: input.type, assignedToUserId: null, subject: input.subject.trim(), createdAt: timestamp, updatedAt: timestamp, messages: [{ id: messageId, ticketId: id, authorUserId: user.id, authorName: user.displayName, authorType: "CLIENT", visibility: "PUBLIC_REPLY", body: input.description.trim(), createdAt: timestamp, attachments: attachmentsFor(input.attachments, id, messageId, user.id, timestamp) }], events: [{ id: crypto.randomUUID(), ticketId: id, actorUserId: user.id, eventType: "CREATED", newStatus: "OPEN", createdAt: timestamp, description: "Chamado aberto", slaStart: { priority: "MEDIUM" } }] };
      db.tickets.push(ticket);
      return { ticket, created: true };
    });
    if (result.created) await dispatchTicketNotification(result.ticket, result.ticket.events[0].id, "TICKET_CREATED");
    return result.ticket;
  }
  async reply(id: string, input: ReplyInput) {
    const user = clientSession();
    if (!input.body.trim() || input.body.trim().length > 10000) throw new TicketError("VALIDATION", "Escreva uma resposta com até 10.000 caracteres.");
    const ticket = await this.repository.transact((db) => {
      const ticket = db.tickets.find((item) => item.id === id);
      if (!ticket) throw new TicketError("NOT_FOUND", "Chamado não encontrado.");
      allowed(ticket);
      if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") throw new TicketError("VALIDATION", "Este chamado não aceita respostas no estado atual.");
      const timestamp = this.clock.now().toISOString(); const messageId = crypto.randomUUID();
      ticket.messages.push({ id: messageId, ticketId: ticket.id, authorUserId: user.id, authorName: user.displayName, authorType: "CLIENT", visibility: "PUBLIC_REPLY", body: input.body.trim(), createdAt: timestamp, attachments: attachmentsFor(input.attachments, ticket.id, messageId, user.id, timestamp) });
      ticket.events.push({ id: crypto.randomUUID(), ticketId: ticket.id, actorUserId: user.id, eventType: "PUBLIC_REPLY_CREATED", createdAt: timestamp, description: "Cliente respondeu" });
      ticket.updatedAt = timestamp;
      // A máquina documentada reserva WAITING_CUSTOMER -> IN_PROGRESS para suporte.
      return forClient(ticket);
    });
    await dispatchTicketNotification(ticket, ticket.events.at(-1)!.id, "CLIENT_PUBLIC_REPLY");
    return ticket;
  }
  private async internalUpdate(id: string, update: (ticket: Ticket, actor: ReturnType<typeof internalSession>) => void) {
    const actor = internalSession();
    return this.repository.transact((db) => {
      if (internalSession().id !== actor.id) throw new TicketError("FORBIDDEN", "A sessão mudou durante a operação. Tente novamente.");
      const ticket = db.tickets.find((item) => item.id === id);
      if (!ticket) throw new TicketError("NOT_FOUND", "Chamado não encontrado.");
      update(ticket, actor);
      ticket.updatedAt = this.clock.now().toISOString();
      return ticket;
    });
  }
  async assign(id: string, operatorId: string) {
    const ticket = await this.internalUpdate(id, (ticket, actor) => {
      if (!demoOperators.some((operator) => operator.id === operatorId)) throw new TicketError("VALIDATION", "Operador inválido.");
      if (ticket.assignedToUserId === operatorId) throw new TicketError("VALIDATION", "O chamado já está atribuído a este operador.");
      const previous = ticket.assignedToUserId;
      ticket.assignedToUserId = operatorId;
      const previousName = demoOperators.find((operator) => operator.id === previous)?.displayName ?? "Sem responsável";
      const newName = demoOperators.find((operator) => operator.id === operatorId)!.displayName;
      ticket.events.push(this.audit(ticket, actor, previous ? "TRANSFERRED" : "ASSIGNED", `${previousName} → ${newName}`));
    });
    const event = ticket.events.at(-1)!;
    await dispatchTicketNotification(ticket, event.id, event.eventType === "TRANSFERRED" ? "TICKET_TRANSFERRED" : "TICKET_ASSIGNED");
    return ticket;
  }
  async assume(id: string) {
    const actor = internalSession();
    const ticket = await this.internalUpdate(id, (ticket) => {
      if (ticket.assignedToUserId) throw new TicketError("VALIDATION", "Este chamado já possui responsável.");
      ticket.assignedToUserId = actor.id;
      ticket.events.push(this.audit(ticket, actor, "ASSIGNED", `Sem responsável → ${actor.displayName}`));
    });
    await dispatchTicketNotification(ticket, ticket.events.at(-1)!.id, "TICKET_ASSIGNED");
    return ticket;
  }
  async changePriority(id: string, priority: TicketPriority) {
    return this.internalUpdate(id, (ticket, actor) => {
      if (!priorities.includes(priority) || ticket.priority === priority) throw new TicketError("VALIDATION", "Selecione uma prioridade diferente e válida.");
      const previous = ticket.priority; ticket.priority = priority;
      ticket.events.push({ ...this.audit(ticket, actor, "PRIORITY_CHANGED", `${previous} → ${priority}`), oldPriority: previous, newPriority: priority });
    });
  }
  async changeCategory(id: string, category: TicketCategory) {
    return this.internalUpdate(id, (ticket, actor) => {
      if (!categories.includes(category) || ticket.category === category) throw new TicketError("VALIDATION", "Selecione uma categoria diferente e válida.");
      const previous = ticket.category; ticket.category = category;
      ticket.events.push(this.audit(ticket, actor, "CATEGORY_CHANGED", `${previous} → ${category}`));
    });
  }
  async changeStatus(id: string, status: TicketStatus, reason = "") {
    const ticket = await this.internalUpdate(id, (ticket, actor) => {
      if (!allowedTransitions(ticket.status).includes(status)) throw new TicketError("VALIDATION", "Transição de status não permitida.");
      if (["RESOLVED", "REOPENED"].includes(status) && !reason.trim()) throw new TicketError("VALIDATION", "Informe o motivo da resolução ou reabertura.");
      if (reason.length > 2000) throw new TicketError("VALIDATION", "O motivo deve ter até 2.000 caracteres.");
      const previous = ticket.status; ticket.status = status;
      ticket.events.push({ ...this.audit(ticket, actor, "STATUS_CHANGED", reason.trim() || `${previous} → ${status}`, "PUBLIC"), oldStatus: previous, newStatus: status, ...(status === "RESOLVED" ? { satisfactionEligible: true as const } : {}), ...(status === "REOPENED" ? { slaStart: { priority: ticket.priority } } : {}) });
    });
    if (status === "RESOLVED" || status === "REOPENED") await dispatchTicketNotification(ticket, ticket.events.at(-1)!.id, status === "RESOLVED" ? "TICKET_RESOLVED" : "TICKET_REOPENED");
    return ticket;
  }
  async postInternal(id: string, mode: "PUBLIC_REPLY" | "INTERNAL_NOTE", input: ReplyInput) {
    const ticket = await this.internalUpdate(id, (ticket, actor) => {
      if (!(["PUBLIC_REPLY", "INTERNAL_NOTE"] as const).includes(mode)) throw new TicketError("VALIDATION", "Modo de mensagem inválido.");
      if (!input.body.trim() || input.body.trim().length > 10000) throw new TicketError("VALIDATION", "Escreva uma mensagem com até 10.000 caracteres.");
      if (mode === "PUBLIC_REPLY" && ["RESOLVED", "CLOSED"].includes(ticket.status)) throw new TicketError("VALIDATION", "O chamado não aceita resposta pública neste estado.");
      const timestamp = this.clock.now().toISOString(); const messageId = crypto.randomUUID();
      const event = this.audit(ticket, actor, mode === "PUBLIC_REPLY" ? "PUBLIC_REPLY_CREATED" : "INTERNAL_NOTE_CREATED", mode === "PUBLIC_REPLY" ? "Resposta pública enviada" : "Nota interna criada", mode === "PUBLIC_REPLY" ? "PUBLIC" : "INTERNAL");
      event.createdAt = timestamp;
      ticket.messages.push({ id: messageId, eventId: event.id, ticketId: ticket.id, authorUserId: actor.id, authorName: actor.displayName, authorType: "SUPPORT", visibility: mode, body: input.body.trim(), createdAt: timestamp, attachments: attachmentsFor(input.attachments, ticket.id, messageId, actor.id, timestamp) });
      ticket.events.push(event);
    });
    if (mode === "PUBLIC_REPLY") await dispatchTicketNotification(ticket, ticket.events.at(-1)!.id, "SUPPORT_PUBLIC_REPLY");
    return ticket;
  }
  private audit(ticket: Ticket, actor: ReturnType<typeof internalSession>, eventType: Ticket["events"][number]["eventType"], description: string, audience: "PUBLIC" | "INTERNAL" = "INTERNAL"): Ticket["events"][number] {
    return { id: crypto.randomUUID(), ticketId: ticket.id, actorUserId: actor.id, actorName: actor.displayName, correlationId: crypto.randomUUID(), eventType, createdAt: this.clock.now().toISOString(), description, audience };
  }
  async attachment(ticketId: string, attachmentId: string) {
    const ticket = await this.get(ticketId);
    const file = ticket.messages.flatMap((message) => message.attachments).find((item) => item.id === attachmentId);
    if (!file) throw new TicketError("NOT_FOUND", "Anexo não encontrado.");
    return file;
  }
  async attachmentInternal(ticketId: string, attachmentId: string) {
    const ticket = await this.getInternal(ticketId);
    const file = ticket.messages.flatMap((message) => message.attachments).find((item) => item.id === attachmentId);
    if (!file) throw new TicketError("NOT_FOUND", "Anexo não encontrado.");
    return file;
  }
}

export const ticketService = new TicketService(localTicketRepository);
export async function readLocalFiles(files: FileList | File[]): Promise<AttachmentInput[]> {
  const values = Array.from(files);
  if (values.length > 4 || values.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) throw new TicketError("VALIDATION", "Envie até 4 arquivos e 2 MB no total.");
  return Promise.all(values.map(async (file) => {
    if (!ALLOWED_MIME.has(file.type) || file.size < 1 || file.size > MAX_FILE_BYTES || !/^[^/\\\u0000-\u001f]{1,120}$/.test(file.name)) throw new TicketError("VALIDATION", "Arquivo inválido. Use PDF, PNG, JPG ou TXT com até 512 KB por arquivo.");
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new TicketError("STORAGE", "Falha na leitura do arquivo.")); reader.readAsDataURL(file); });
    return { originalFilename: file.name, mimeType: file.type, sizeBytes: file.size, dataUrl };
  }));
}
