import { localIdentityStore } from "@/services/local-identity/store";
import { ticketService, type TicketService } from "@/services/tickets/service";
import { systemClock, type Clock } from "@/services/sla/types";
import { satisfactionRepository } from "./local-repository";
import { opportunities, type SatisfactionInput, type SatisfactionRepository } from "./types";
export class SatisfactionError extends Error {
  constructor(public readonly code: "FORBIDDEN" | "VALIDATION" | "CONFLICT" | "NOT_ELIGIBLE", message: string) { super(message); }
}
function session() { const user = localIdentityStore.currentUser(); if (!user) throw new SatisfactionError("FORBIDDEN", "Faça login para consultar avaliações."); return user; }
function unchanged(user: ReturnType<typeof session>) { const current = session(); if (current.id !== user.id || current.role !== user.role || current.clientId !== user.clientId) throw new SatisfactionError("FORBIDDEN", "A sessão mudou."); }
export class SatisfactionService {
  constructor(private readonly repository: SatisfactionRepository, private readonly tickets: TicketService, private readonly clock: Clock = systemClock) {}
  subscribe(listener: () => void) { const stops = [this.repository.subscribe(listener), this.tickets.subscribe(listener)]; return () => stops.forEach(stop => stop()); }
  async get(ticketId: string) {
    const user = session(); const ticket = user.role === "CLIENT" ? await this.tickets.get(ticketId) : await this.tickets.getInternal(ticketId);
    const database = await this.repository.read(); unchanged(user);
    if (user.role === "CLIENT" && !localIdentityStore.productsFor(user).some(product => product.id === ticket.productId)) throw new SatisfactionError("FORBIDDEN", "Produto não autorizado.");
    return opportunities(ticket, database.feedback);
  }
  async submit(ticketId: string, input: SatisfactionInput) {
    const user = session();
    if (user.role !== "CLIENT" || !user.clientId) throw new SatisfactionError("FORBIDDEN", "Somente o solicitante CLIENT pode avaliar.");
    const rating = input.rating ?? null;
    if (typeof input.resolutionEventId !== "string" || !input.resolutionEventId || input.resolutionEventId.length > 200 || typeof input.clientRequestId !== "string" || !input.clientRequestId.trim() || input.clientRequestId.length > 200 || typeof input.resolvedAnswer !== "boolean" || (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) || (input.comment != null && (typeof input.comment !== "string" || input.comment.length > 2000))) throw new SatisfactionError("VALIDATION", "Informe Sim/Não, nota de 1 a 5 opcional e comentário de até 2.000 caracteres.");
    const comment = input.comment?.trim() || null;
    // Lock order: Ticket Core -> satisfaction. Status changes use the same Ticket Core lock.
    return this.tickets.withSatisfactionTicket(ticketId, async ticket => this.repository.transact(database => {
      unchanged(user);
      if (!localIdentityStore.productsFor(user).some(product => product.id === ticket.productId)) throw new SatisfactionError("FORBIDDEN", "Produto não autorizado.");
      const opportunity = opportunities(ticket, database.feedback).find(item => item.resolutionEventId === input.resolutionEventId);
      if (!opportunity || !opportunity.cycleStartEventId) throw new SatisfactionError("NOT_ELIGIBLE", "Esta resolução não possui oportunidade de avaliação.");
      const originKey = `SATISFACTION:${ticket.id}:${input.resolutionEventId}:${user.id}`;
      const existing = database.feedback.find(item => item.originKey === originKey);
      if (existing) {
        if (existing.resolvedAnswer !== input.resolvedAnswer || existing.rating !== rating || existing.comment !== comment) throw new SatisfactionError("CONFLICT", "Já existe uma avaliação com conteúdo diferente para esta resolução.");
        return existing;
      }
      if (opportunity.status !== "ELIGIBLE" || !["RESOLVED", "CLOSED"].includes(ticket.status)) throw new SatisfactionError("NOT_ELIGIBLE", "O chamado foi reaberto ou não está disponível para avaliação.");
      const at = this.clock.now().toISOString();
      if (Date.parse(at) < Date.parse(opportunity.resolvedAt) || !Number.isFinite(Date.parse(opportunity.resolvedAt))) throw new SatisfactionError("VALIDATION", "O relógio ou histórico da resolução é inválido.");
      const record = { ...input, rating, comment, id: crypto.randomUUID(), ticketId: ticket.id, tenantId: ticket.clientId, productId: ticket.productId,
        requesterUserId: user.id, cycleStartEventId: opportunity.cycleStartEventId, originKey, submittedAt: at,
        audit: [{ action: "SUBMITTED" as const, at, actorUserId: user.id }] };
      database.feedback.push(record); return record;
    }));
  }
}
export const satisfactionService = new SatisfactionService(satisfactionRepository, ticketService);
