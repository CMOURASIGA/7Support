import { localIdentityStore } from "@/services/local-identity/store";
import { localTicketRepository } from "@/services/tickets/local-repository";
import type { TicketRepository } from "@/services/tickets/repository";
import { impacts, ticketTypes, type AttachmentInput, type NewTicketInput, type ReplyInput, type Ticket, type TicketAttachment } from "@/features/tickets/types";

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

export class TicketService {
  constructor(private readonly repository: TicketRepository) {}
  subscribe(listener: () => void) { return this.repository.subscribe(listener); }
  async list() { const user = clientSession(); const db = await this.repository.read(); return sortTickets(db.tickets.filter((ticket) => ticket.clientId === user.clientId && ticket.requesterUserId === user.id)); }
  async get(id: string) { const ticket = (await this.repository.read()).tickets.find((candidate) => candidate.id === id); if (!ticket) throw new TicketError("NOT_FOUND", "Chamado não encontrado."); allowed(ticket); return ticket; }
  async create(input: NewTicketInput) {
    const user = clientSession();
    const client = localIdentityStore.clientFor(user);
    const product = localIdentityStore.productsFor(user).find((item) => item.id === input.productId);
    if (!client || !product) throw new TicketError("FORBIDDEN", "Produto não autorizado para este cliente.");
    if (!ticketTypes.includes(input.type) || !impacts.includes(input.impact) || !input.subject.trim() || input.subject.trim().length > 160 || !input.description.trim() || input.description.trim().length > 10000) throw new TicketError("VALIDATION", "Preencha tipo, impacto, assunto e descrição dentro dos limites indicados.");
    return this.repository.transact((db) => {
      const id = crypto.randomUUID(); const messageId = crypto.randomUUID(); const timestamp = new Date().toISOString();
      const publicNumber = db.nextPublicNumber++;
      const ticket: Ticket = { id, publicNumber, publicCode: `CS-${String(publicNumber).padStart(6, "0")}`, clientId: client.id, clientNameSnapshot: client.displayName, requesterUserId: user.id, requesterNameSnapshot: user.displayName, requesterEmailSnapshot: user.email, productId: product.id, productNameSnapshot: product.displayName, type: input.type, impact: input.impact, status: "OPEN", subject: input.subject.trim(), createdAt: timestamp, updatedAt: timestamp, messages: [{ id: messageId, ticketId: id, authorUserId: user.id, authorName: user.displayName, authorType: "CLIENT", visibility: "PUBLIC_REPLY", body: input.description.trim(), createdAt: timestamp, attachments: attachmentsFor(input.attachments, id, messageId, user.id, timestamp) }], events: [{ id: crypto.randomUUID(), ticketId: id, actorUserId: user.id, eventType: "CREATED", newStatus: "OPEN", createdAt: timestamp, description: "Chamado aberto" }] };
      db.tickets.push(ticket);
      return ticket;
    });
  }
  async reply(id: string, input: ReplyInput) {
    const user = clientSession();
    if (!input.body.trim() || input.body.trim().length > 10000) throw new TicketError("VALIDATION", "Escreva uma resposta com até 10.000 caracteres.");
    return this.repository.transact((db) => {
      const ticket = db.tickets.find((item) => item.id === id);
      if (!ticket) throw new TicketError("NOT_FOUND", "Chamado não encontrado.");
      allowed(ticket);
      if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") throw new TicketError("VALIDATION", "Este chamado não aceita respostas no estado atual.");
      const timestamp = new Date().toISOString(); const messageId = crypto.randomUUID();
      ticket.messages.push({ id: messageId, ticketId: ticket.id, authorUserId: user.id, authorName: user.displayName, authorType: "CLIENT", visibility: "PUBLIC_REPLY", body: input.body.trim(), createdAt: timestamp, attachments: attachmentsFor(input.attachments, ticket.id, messageId, user.id, timestamp) });
      ticket.events.push({ id: crypto.randomUUID(), ticketId: ticket.id, actorUserId: user.id, eventType: "PUBLIC_REPLY_CREATED", createdAt: timestamp, description: "Cliente respondeu" });
      ticket.updatedAt = timestamp;
      // A máquina documentada reserva WAITING_CUSTOMER -> IN_PROGRESS para suporte.
      return ticket;
    });
  }
  async attachment(ticketId: string, attachmentId: string) {
    const ticket = await this.get(ticketId);
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
