import type { TicketType } from "@/features/tickets/types";
export type ReportingQuery = { start: string; end: string; clientId?: string; productId?: string; type?: TicketType };
export type Sample = { count: number; mean: number | null; median: number | null };
export type SlaCounts = { MET: number; NOT_MET: number; PENDING: number; NOT_CONFIGURED: number; INVALID_HISTORY: number; denominator: number; metRate: number | null };
export type ReportingResult = {
  interval: { start: string; end: string };
  volume: { created: number; resolved: number; reopenedTickets: number; reopenedEvents: number; reopenRate: number | null };
  attendance: { completedCycles: number; firstResponse: Sample; resolution: Sample; missingFirstResponse: number; excluded: number; notConfigured: number; invalidHistory: number; pending: number };
  sla: { firstResponse: SlaCounts; resolution: SlaCounts };
  satisfaction: { received: number; yes: number; no: number; positiveRate: number | null; rating: Sample; opportunities: number; responsesInResolutionCohort: number; responseRate: number | null; cancelled: number };
  segments: { clients: { id: string; label: string; count: number }[]; products: { id: string; label: string; count: number }[]; types: { id: string; label: string; count: number }[] };
};
