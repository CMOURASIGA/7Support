import type { ConversationView, AtenaScope } from "@/features/atena/types";
import { AtenaError } from "@/services/atena/errors";
import { assertScope } from "@/services/atena/knowledge-query";
import { atenaService, type AtenaService } from "@/services/atena/service";
import { localIdentityStore } from "@/services/local-identity/store";
import { ticketService, type TicketService } from "@/services/tickets/service";
import { impacts, ticketTypes } from "@/features/tickets/types";
import { LocalAtenaEscalationRepository } from "./local-repository";
import type { AtenaEscalationRepository, EscalationDraft } from "./types";
function client() {
  const user = localIdentityStore.currentUser();
  if (!user) throw new AtenaError("UNAUTHENTICATED");
  if (user.role !== "CLIENT" || !user.clientId) throw new AtenaError("FORBIDDEN");
  return user;
}
function check(scope: AtenaScope & { sessionCreatedAt?: string }) {
  client(); assertScope(scope);
  if (scope.sessionCreatedAt && localIdentityStore.session()?.createdAt !== scope.sessionCreatedAt) throw new AtenaError("FORBIDDEN");
}
export function contextSnapshot(view: ConversationView) {
  // Projection has already reauthorized every assistant citation. Never serialize the view itself.
  const messages = view.messages.filter(item => item.role === "USER" || (item.role === "ASSISTANT" && item.status === "COMPLETED")).slice(-6);
  return messages.map(item => `${item.role === "USER" ? "Cliente" : "Atena"}: ${item.content}`).join("\n\n").slice(0, 8000);
}
function validate(draft: EscalationDraft) {
  if (!ticketTypes.includes(draft.type) || !impacts.includes(draft.impact) || typeof draft.subject !== "string" || !draft.subject.trim() || draft.subject.trim().length > 160 || typeof draft.description !== "string" || !draft.description.trim() || draft.description.trim().length > 10000) throw new AtenaError("VALIDATION");
}
export class AtenaEscalationService {
  constructor(private readonly atena: AtenaService, private readonly tickets: TicketService, private readonly repository: AtenaEscalationRepository) {}
  subscribe(listener: () => void) { return this.repository.subscribe(listener); }
  private async authorized(conversationId: string) {
    const identity = client();
    const view = await this.atena.getConversation(conversationId);
    check(view.conversation);
    if (view.conversation.userId !== identity.id || view.conversation.tenantId !== identity.clientId || view.conversation.status !== "ACTIVE") throw new AtenaError("FORBIDDEN");
    return view;
  }
  async linkedTicket(conversationId: string) {
    const view = await this.authorized(conversationId);
    const ticket = await this.tickets.findFromAtena(conversationId);
    check(view.conversation);
    if (ticket) {
      const entry = (await this.repository.read()).escalations.find(item => item.id === ticket.origin?.escalationId && item.conversationId === conversationId && item.userId === view.conversation.userId && item.tenantId === view.conversation.tenantId && item.productId === view.conversation.productId);
      if (entry && entry.status !== "COMPLETED") {
        check(view.conversation);
        await this.repository.withLock(conversationId, () => this.repository.transact(database => {
          check(view.conversation);
          const stored = database.escalations.find(item => item.id === entry.id)!;
          if (stored.status !== "COMPLETED") {
            stored.ticketId = ticket.id; stored.status = "COMPLETED"; stored.completedAt = new Date().toISOString();
            stored.audit.push({ action: "RETRY_RECOVERED", at: stored.completedAt }, { action: "LINK_COMPLETED", at: stored.completedAt });
          }
        }));
      }
    }
    check(view.conversation);
    return ticket ? { ticketId: ticket.id, publicCode: ticket.publicCode, href: `/tickets/${ticket.id}` } : null;
  }
  async prepare(conversationId: string) {
    const identity = client();
    const sessionCreatedAt = localIdentityStore.session()!.createdAt;
    return this.repository.withLock(conversationId, async () => {
      const view = await this.authorized(conversationId);
      if (view.conversation.userId !== identity.id || view.conversation.tenantId !== identity.clientId || localIdentityStore.session()?.createdAt !== sessionCreatedAt) throw new AtenaError("FORBIDDEN");
      const existingTicket = await this.tickets.findFromAtena(conversationId);
      check(view.conversation);
      if (existingTicket) throw new AtenaError("VALIDATION", "Esta conversa já possui um chamado. Abra o chamado existente.");
      const snapshot = contextSnapshot(view);
      const subject = view.messages.find(item => item.role === "USER")?.content.slice(0, 160) ?? "";
      if (!subject || !snapshot) throw new AtenaError("VALIDATION", "Envie uma mensagem antes de abrir o chamado.");
      return this.repository.transact(database => {
        check({ ...view.conversation, sessionCreatedAt });
        let escalation = database.escalations.find(item => item.conversationId === conversationId && item.userId === identity.id);
        if (escalation && (escalation.tenantId !== identity.clientId || escalation.productId !== view.conversation.productId)) throw new AtenaError("FORBIDDEN");
        if (escalation?.status === "COMPLETED") throw new AtenaError("VALIDATION");
        if (!escalation) {
          escalation = { sessionCreatedAt, id: crypto.randomUUID(), conversationId, userId: identity.id, tenantId: identity.clientId!, productId: view.conversation.productId, ticketId: null, clientRequestId: crypto.randomUUID(), status: "PREPARING", approvedContextSnapshot: snapshot, createdAt: new Date().toISOString(), completedAt: null, draft: { type: "QUESTION", impact: "LOW_IMPACT", subject, description: snapshot }, audit: [{ action: "STARTED", at: new Date().toISOString() }] };
          database.escalations.push(escalation);
        }
        escalation.sessionCreatedAt = sessionCreatedAt;
        escalation.status = "READY"; escalation.approvedContextSnapshot = snapshot;
        escalation.draft = { type: "QUESTION", impact: "LOW_IMPACT", subject, description: snapshot };
        return escalation;
      });
    });
  }
  async confirm(escalationId: string, draft: EscalationDraft) {
    const identity = client();
    const initial = (await this.repository.read()).escalations.find(item => item.id === escalationId && item.userId === identity.id && item.tenantId === identity.clientId);
    if (!initial) throw new AtenaError("NOT_FOUND");
    check(initial);
    return this.repository.withLock(initial.conversationId, async () => {
      check(initial);
      const record = (await this.repository.read()).escalations.find(item => item.id === escalationId)!;
      const view = await this.authorized(record.conversationId);
      check(record);
      if (view.conversation.productId !== record.productId) throw new AtenaError("FORBIDDEN");
      const existing = await this.tickets.findFromAtena(record.conversationId);
      check(record);
      if (!existing) {
        validate(draft);
        if (contextSnapshot(view) !== record.approvedContextSnapshot) throw new AtenaError("VALIDATION", "O contexto autorizado mudou. Feche o painel e revise um novo resumo antes de confirmar.");
        await this.repository.transact(database => {
          check(record);
          const entry = database.escalations.find(item => item.id === record.id)!;
          entry.status = "CREATING";
          entry.draft = { type: draft.type, impact: draft.impact, subject: draft.subject, description: draft.description };
          entry.audit.push({ action: "CONFIRMED", at: new Date().toISOString() });
        });
      }
      try {
        const ticket = existing ?? await this.tickets.createFromAtena({ productId: record.productId, type: draft.type, impact: draft.impact, subject: draft.subject, description: draft.description, attachments: [] }, { conversationId: record.conversationId, escalationId: record.id }, async () => {
          const fresh = await this.authorized(record.conversationId);
          check(record);
          if (fresh.conversation.productId !== record.productId || contextSnapshot(fresh) !== record.approvedContextSnapshot) throw new AtenaError("FORBIDDEN");
          return fresh.conversation;
        });
        check(record);
        await this.repository.transact(database => {
          check(record);
          const entry = database.escalations.find(item => item.id === record.id)!;
          if (entry.status !== "COMPLETED") {
            entry.ticketId = ticket.id; entry.status = "COMPLETED"; entry.completedAt = new Date().toISOString();
            entry.audit.push({ action: existing ? "RETRY_RECOVERED" : "TICKET_CREATED", at: entry.completedAt }, { action: "LINK_COMPLETED", at: entry.completedAt });
          }
        });
        return { ticketId: ticket.id, publicCode: ticket.publicCode, href: `/tickets/${ticket.id}` };
      } catch (error) {
        await this.repository.transact(database => { check(record); const entry = database.escalations.find(item => item.id === record.id)!; if (entry.status !== "COMPLETED") entry.status = "FAILED"; }).catch(() => undefined);
        throw error;
      }
    });
  }
}
export const atenaEscalationService = new AtenaEscalationService(atenaService, ticketService, new LocalAtenaEscalationRepository());
