import type { TicketType } from "@/features/tickets/types";

export type ReportPreset = "7D" | "30D" | "90D" | "CURRENT_MONTH" | "CUSTOM";
export type DataOrigin = "OPERATIONAL" | "MANUAL" | "ATENA" | "DEMO" | "ALL";
export type ReportFilters = { preset: ReportPreset; start?: string; end?: string; clientId?: string; productId?: string; type?: TicketType | ""; origin: DataOrigin };
export type RatioMetric = { numerator: number; denominator: number; rate: number | null; excluded: number };
export type DurationMetric = { count: number; meanMinutes: number | null; medianMinutes: number | null; excluded: number };
export type ReportTrend = { date: string; created: number; resolutions: number; reopens: number; satisfactionPositive: number; satisfactionTotal: number; slaMet: number; slaTotal: number };
export type TicketReportRow = { id: string; code: string; client: string; product: string; type: string; origin: Exclude<DataOrigin, "ALL" | "OPERATIONAL">; createdAt: string; resolutions: number; reopens: number };
export type SlaReportRow = { cycleId: string; ticketId: string; code: string; cycle: number; firstResponseMinutes: number | null; firstResponseResult: string; resolutionMinutes: number | null; resolutionResult: string; resolvedAt: string | null };
export type SatisfactionReportRow = { id: string; ticketId: string; code: string; resolutionEventId: string; resolvedAnswer: boolean; rating: number | null; submittedAt: string };
export type OperationalReport = {
  generatedAt: string; period: { start: string; end: string }; filters: ReportFilters;
  totals: { createdTickets: number; resolutions: number; reopens: number };
  firstResponse: DurationMetric; resolution: DurationMetric;
  reopenRate: RatioMetric; firstResponseSla: RatioMetric; resolutionSla: RatioMetric; positiveSatisfaction: RatioMetric; participation: RatioMetric;
  averageRating: { value: number | null; denominator: number; excluded: number };
  trends: ReportTrend[]; tickets: TicketReportRow[]; sla: SlaReportRow[]; satisfaction: SatisfactionReportRow[];
  options: { clients: { id: string; label: string }[]; products: { id: string; label: string }[] };
  notes: string[];
};
