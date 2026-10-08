import type { Ticket } from "@/features/tickets/types";
export type SatisfactionInput = { resolutionEventId: string; clientRequestId: string; resolvedAnswer: boolean; rating?: number | null; comment?: string | null };
export type SatisfactionRecord = Omit<SatisfactionInput, "rating" | "comment"> & { rating: number | null; comment: string | null; id: string; ticketId: string; tenantId: string; productId: string; requesterUserId: string; cycleStartEventId: string; originKey: string; submittedAt: string; audit: { action: "SUBMITTED"; at: string; actorUserId: string }[] };
export type Opportunity = { ticketId: string; resolutionEventId: string; cycleStartEventId: string; resolvedAt: string; status: "ELIGIBLE" | "SUBMITTED" | "CANCELLED_BY_REOPEN"; feedback: SatisfactionRecord | null };
export type SatisfactionDatabase = { version: 1; feedback: SatisfactionRecord[] };
export interface SatisfactionRepository { read(): Promise<SatisfactionDatabase>; transact<T>(work: (database: SatisfactionDatabase) => T): Promise<T>; subscribe(listener: () => void): () => void }
export function opportunities(ticket: Ticket, feedback: SatisfactionRecord[]): Opportunity[] {
  return ticket.events.flatMap((event, index) => {
    if (event.newStatus !== "RESOLVED" || !event.satisfactionEligible) return [];
    const record = feedback.find(item => item.ticketId === ticket.id && item.resolutionEventId === event.id && item.tenantId === ticket.clientId && item.productId === ticket.productId && item.requesterUserId === ticket.requesterUserId) ?? null;
    const reopened = ticket.events.slice(index + 1).some(item => item.newStatus === "REOPENED");
    const start = [...ticket.events.slice(0, index)].reverse().find(item => item.eventType === "CREATED" || item.newStatus === "REOPENED");
    return [{ ticketId: ticket.id, resolutionEventId: event.id, cycleStartEventId: start?.id ?? "", resolvedAt: event.createdAt,
      status: record ? "SUBMITTED" as const : reopened ? "CANCELLED_BY_REOPEN" as const : "ELIGIBLE" as const, feedback: record }];
  });
}
