import type { Satisfaction, SatisfactionOpportunity, SubmitSatisfactionInput } from "@/features/satisfaction/types";
import { localIdentityStore } from "@/services/local-identity/store";
import { notificationService, ticketNotificationEvent, type NotificationService } from "@/services/notifications/service";
import { slaCycleRepository } from "@/services/sla/local-repository";
import type { Clock, SlaCycleRepository } from "@/services/sla/types";
import { ticketService, TicketError, type TicketService } from "@/services/tickets/service";
import { localSatisfactionRepository } from "./local-repository";
import type { SatisfactionRepository } from "./repository";

export class SatisfactionError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "STORAGE", message: string) { super(message); }
}

function client() {
  const user = localIdentityStore.currentUser();
  if (!user) throw new SatisfactionError("UNAUTHENTICATED", "Faça login para avaliar o atendimento.");
  if (user.role !== "CLIENT" || !user.clientId) throw new SatisfactionError("FORBIDDEN", "Somente o cliente solicitante pode avaliar o atendimento.");
  return user;
}

function sameClient(expected: ReturnType<typeof client>) {
  const current = client();
  if (current.id !== expected.id || current.clientId !== expected.clientId) throw new SatisfactionError("FORBIDDEN", "A sessão mudou durante a avaliação.");
}

function cycleFor(cycles: Awaited<ReturnType<SlaCycleRepository["read"]>>["cycles"], ticketId: string, resolvedAt: string) {
  return cycles.filter(cycle => cycle.ticketId === ticketId && cycle.startedAt <= resolvedAt).sort((a, b) => b.cycleNumber - a.cycleNumber)[0] ?? null;
}

export class SatisfactionService {
  constructor(
    private readonly repository: SatisfactionRepository,
    private readonly tickets: TicketService,
    private readonly cycles: SlaCycleRepository,
    private readonly notifications: NotificationService,
    private readonly clock: Clock = { now: () => new Date() },
  ) {}

  subscribe(listener: () => void) { return this.repository.subscribe(listener); }

  async listForTicket(ticketId: string): Promise<SatisfactionOpportunity[]> {
    const user = client();
    const [ticket, database, cycleDatabase] = await Promise.all([this.tickets.get(ticketId), this.repository.read(), this.cycles.read()]);
    sameClient(user);
    const resolutions = ticket.events.filter(event => event.eventType === "STATUS_CHANGED" && event.newStatus === "RESOLVED").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return resolutions.map(event => {
      const satisfaction = database.records.find(record => record.ticketId === ticket.id && record.resolutionEventId === event.id && record.userId === user.id) ?? null;
      const reopened = ticket.events.some(candidate => candidate.eventType === "STATUS_CHANGED" && candidate.newStatus === "REOPENED" && candidate.createdAt >= event.createdAt);
      const cycle = cycleFor(cycleDatabase.cycles, ticket.id, event.createdAt);
      return { ticketId: ticket.id, resolutionEventId: event.id, resolvedAt: event.createdAt, slaCycleId: cycle?.id ?? null, cycleNumber: cycle?.cycleNumber ?? null,
        eligible: !satisfaction && !reopened, reason: satisfaction ? "SUBMITTED" : reopened ? "REOPENED" : "AVAILABLE", satisfaction };
    });
  }

  async submit(ticketId: string, input: SubmitSatisfactionInput): Promise<Satisfaction> {
    const user = client();
    const rating = input.rating ?? null;
    const comment = input.comment?.trim() || null;
    if (typeof input.resolvedAnswer !== "boolean" || (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) || (comment?.length ?? 0) > 2000 || !/^[A-Za-z0-9:_-]{8,160}$/.test(input.clientRequestId)) {
      throw new SatisfactionError("VALIDATION", "Informe Sim ou Não, rating de 1 a 5 e comentário de até 2.000 caracteres.");
    }
    const originKey = `SATISFACTION:${ticketId}:${input.resolutionEventId}:${user.id}`;
    const result = await this.repository.transact(async database => {
      sameClient(user);
      const existing = database.records.find(record => record.originKey === originKey);
      if (existing) return existing;
      try {
        return await this.tickets.withSatisfactionResolution(ticketId, input.resolutionEventId, async ({ ticket, resolutionEvent }) => {
          sameClient(user);
          const duplicate = database.records.find(record => record.originKey === originKey);
          if (duplicate) return duplicate;
          const cycle = cycleFor((await this.cycles.read()).cycles, ticket.id, resolutionEvent.createdAt);
          sameClient(user);
          const submittedAt = this.clock.now().toISOString();
          const record: Satisfaction = { id: crypto.randomUUID(), originKey, ticketId: ticket.id, resolutionEventId: resolutionEvent.id,
            slaCycleId: cycle?.id ?? null, cycleNumber: cycle?.cycleNumber ?? null, tenantId: ticket.clientId, productId: ticket.productId,
            userId: user.id, clientRequestId: input.clientRequestId, resolvedAnswer: input.resolvedAnswer, rating, comment, submittedAt,
            audit: [{ action: "SUBMITTED", at: submittedAt, actorUserId: user.id }] };
          database.records.push(record);
          return record;
        });
      } catch (error) {
        if (error instanceof TicketError) throw new SatisfactionError(error.code, error.message);
        throw error;
      }
    });
    sameClient(user);
    if (!result.resolvedAnswer || (result.rating !== null && result.rating <= 2)) {
      const ticket = await this.tickets.get(ticketId); sameClient(user);
      await this.notifications.process(ticketNotificationEvent({ id: `SATISFACTION_ALERT:${result.id}`, tenantId: ticket.clientId, ticketId: ticket.id,
        ticketCode: ticket.publicCode, subject: ticket.subject, productName: ticket.productNameSnapshot, clientName: ticket.clientNameSnapshot,
        priority: ticket.priority, requesterUserId: ticket.requesterUserId, assignedToUserId: ticket.assignedToUserId }, "SATISFACTION_ALERT"));
    }
    return result;
  }
}

export const satisfactionService = new SatisfactionService(localSatisfactionRepository, ticketService, slaCycleRepository, notificationService);
