import type { AtenaScope } from "@/features/atena/types";
import type { TicketImpact, TicketType } from "@/features/tickets/types";
export type EscalationStatus = "PREPARING" | "READY" | "CREATING" | "COMPLETED" | "FAILED";
export type EscalationDraft = { type: TicketType; impact: TicketImpact; subject: string; description: string };
export type Escalation = AtenaScope & {
  sessionCreatedAt: string; id: string; conversationId: string; ticketId: string | null; clientRequestId: string;
  status: EscalationStatus; approvedContextSnapshot: string; createdAt: string; completedAt: string | null;
  draft: EscalationDraft; audit: Array<{ action: "STARTED" | "CONFIRMED" | "TICKET_CREATED" | "LINK_COMPLETED" | "RETRY_RECOVERED"; at: string }>;
};
export type EscalationDatabase = { version: 1; escalations: Escalation[] };
export interface AtenaEscalationRepository {
  read(): Promise<EscalationDatabase>;
  transact<T>(update: (database: EscalationDatabase) => T): Promise<T>;
  withLock<T>(conversationId: string, work: () => Promise<T>): Promise<T>;
  subscribe(listener: () => void): () => void;
}
