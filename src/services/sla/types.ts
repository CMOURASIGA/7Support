import type { TicketPriority, TicketEvent } from "@/features/tickets/types";
import type { TicketService } from "@/services/tickets/service";
export interface Clock { now(): Date }
export const systemClock: Clock = { now: () => new Date() };
export type SlaState = "NOT_CONFIGURED" | "ON_TRACK" | "PAUSED" | "BREACHED" | "INVALID_HISTORY";
export type SlaResult = "PENDING" | "MET" | "NOT_MET";
export type Metric = "firstResponse" | "resolution";
export type PolicyInput = { productId: string; priority: TicketPriority; firstResponseMinutes: number; resolutionMinutes: number; pauseResolutionWhileWaitingCustomer: boolean };
export type SlaPolicyVersion = PolicyInput & {
  id: string; version: number; status: "DRAFT" | "PUBLISHED"; publishedAt: string | null;
  createdAt: string; createdBy: string; demo: boolean; basedOnPublishedId?: string | null;
  audit: { action: "CREATED" | "PUBLISHED"; at: string; actorUserId: string }[];
};
export type PolicyDatabase = { version: 1; policies: SlaPolicyVersion[] };
export type SlaHistory = Omit<Awaited<ReturnType<TicketService["slaHistory"]>>, "events" | "replies"> & { events: Pick<TicketEvent, "id" | "createdAt" | "eventType" | "oldStatus" | "newStatus" | "slaStart">[]; replies: { id: string; eventId?: string; createdAt: string }[] };
export type PauseInterval = { enteredAt: string; exitedAt: string | null };
export type MetricEvaluation = { state: SlaState; result: SlaResult; targetMinutes: number | null; activeElapsedMinutes: number | null; dueAt: string | null; satisfiedAt: string | null };
export type CycleEvaluation = { state: SlaState; firstResponse: MetricEvaluation; resolution: MetricEvaluation; pauses: PauseInterval[]; resolvedAt: string | null };
export type SlaCycle = {
  id: string; originKey: string; ticketId: string; tenantId: string; startEventId: string;
  cycleNumber: number; startedAt: string; priorityAtCycleStart: TicketPriority;
  policyVersionId: string | null; policySnapshot: SlaPolicyVersion | null;
  evaluatedAt: string | null; evaluation: CycleEvaluation | null;
  audit: { action: "STARTED" | "RECONCILED" | "BREACHED"; at: string; metric?: Metric }[];
};
export type SlaAlert = { key: string; cycleId: string; metric: Metric; detectedAt: string; recipientUserId: string | null; notified: boolean };
export type CycleDatabase = { version: 1; cycles: SlaCycle[]; alerts: SlaAlert[] };
export interface SlaPolicyRepository { read(): Promise<PolicyDatabase>; transact<T>(work: (database: PolicyDatabase) => T | Promise<T>): Promise<T>; subscribe(listener: () => void): () => void }
export interface SlaCycleRepository { read(): Promise<CycleDatabase>; transact<T>(work: (database: CycleDatabase) => T | Promise<T>): Promise<T>; subscribe(listener: () => void): () => void }
export type InternalSlaView = { state: SlaState; cycles: SlaCycle[] };
export type ClientSlaView = { state: SlaState; firstResponse: string; resolution: string };
export const stateLabels: Record<SlaState, string> = { NOT_CONFIGURED: "SLA não configurado", ON_TRACK: "No prazo", PAUSED: "Prazo pausado", BREACHED: "Prazo excedido", INVALID_HISTORY: "Histórico inválido" };
export const resultLabels: Record<SlaResult, string> = { PENDING: "Em andamento", MET: "Atendida no prazo", NOT_MET: "Não atendida no prazo" };
