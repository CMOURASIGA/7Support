export type SatisfactionAudit = { action: "SUBMITTED"; at: string; actorUserId: string };

export type Satisfaction = {
  id: string;
  originKey: string;
  ticketId: string;
  resolutionEventId: string;
  slaCycleId: string | null;
  cycleNumber: number | null;
  tenantId: string;
  productId: string;
  userId: string;
  clientRequestId: string;
  resolvedAnswer: boolean;
  rating: number | null;
  comment: string | null;
  submittedAt: string;
  audit: SatisfactionAudit[];
};

export type SatisfactionDatabase = { version: 1; records: Satisfaction[] };

export type SatisfactionOpportunity = {
  ticketId: string;
  resolutionEventId: string;
  resolvedAt: string;
  slaCycleId: string | null;
  cycleNumber: number | null;
  eligible: boolean;
  reason: "AVAILABLE" | "SUBMITTED" | "REOPENED";
  satisfaction: Satisfaction | null;
};

export type SubmitSatisfactionInput = {
  resolutionEventId: string;
  clientRequestId: string;
  resolvedAnswer: boolean;
  rating?: number | null;
  comment?: string | null;
};
