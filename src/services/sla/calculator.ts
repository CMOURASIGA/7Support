import type { CycleEvaluation, MetricEvaluation, PauseInterval, SlaCycle, SlaHistory, SlaPolicyVersion } from "./types";
import { allowedTransitions } from "@/services/tickets/service";
import { priorities } from "@/features/tickets/types";
import type { TicketStatus } from "@/features/tickets/types";
const timestamp = (value: string) => {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value)) return NaN;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return NaN;
  return new Date(parsed).toISOString() === (value.includes(".") ? value : value.replace("Z", ".000Z")) ? parsed : NaN;
};
export function temporalPolicy(policies: SlaPolicyVersion[], productId: string, priority: SlaCycle["priorityAtCycleStart"], startedAt: string) {
  const at = timestamp(startedAt);
  const eligible = policies.filter(policy => policy.productId === productId && policy.priority === priority && policy.status === "PUBLISHED" && policy.publishedAt !== null && timestamp(policy.publishedAt) <= at)
    .sort((a, b) => timestamp(b.publishedAt!) - timestamp(a.publishedAt!));
  if (eligible.length > 1 && eligible[0].publishedAt === eligible[1].publishedAt) throw new Error("Política temporal ambígua.");
  return eligible[0] ?? null;
}
function emptyMetric(state: "NOT_CONFIGURED" | "INVALID_HISTORY"): MetricEvaluation {
  return { state, result: "PENDING", targetMinutes: null, activeElapsedMinutes: null, dueAt: null, satisfiedAt: null };
}
export function emptyEvaluation(state: "NOT_CONFIGURED" | "INVALID_HISTORY"): CycleEvaluation {
  return { state, firstResponse: emptyMetric(state), resolution: emptyMetric(state), pauses: [], resolvedAt: null };
}
export function validHistory(history: SlaHistory, now: string): boolean {
  const current = timestamp(now);
  if (!Number.isFinite(current) || !history.events.length || history.events[0].eventType !== "CREATED") return false;
  let previous = -Infinity; let status: TicketStatus = "OPEN";
  const ids = new Set<string>();
  for (const event of history.events) {
    const at = timestamp(event.createdAt);
    if (!Number.isFinite(at) || at < previous || at > current || ids.has(event.id)) return false;
    if ((ids.size > 0 && event.eventType === "CREATED") || (ids.size === 0 && event.newStatus !== "OPEN")) return false;
    ids.add(event.id); previous = at;
    if (event.eventType === "STATUS_CHANGED") {
      if (event.oldStatus !== status || !event.newStatus || !allowedTransitions(status).includes(event.newStatus)) return false;
      status = event.newStatus;
    }
    if (event.slaStart && !priorities.includes(event.slaStart.priority)) return false;
    if (event.slaStart && event.eventType !== "CREATED" && event.newStatus !== "REOPENED") return false;
  }
  if (history.status !== status) return false;
  previous = timestamp(history.events[0].createdAt);
  for (const reply of history.replies) {
    const at = timestamp(reply.createdAt);
    if (!Number.isFinite(at) || at < previous || at > current) return false;
    if (reply.eventId && !history.events.some(event => event.id === reply.eventId && event.eventType === "PUBLIC_REPLY_CREATED" && event.createdAt === reply.createdAt)) return false;
    previous = at;
  }
  return true;
}
/** Pure 24x7 evaluation. No reads, writes, notifications or clock access. */
export function calculateSla(cycle: SlaCycle, history: SlaHistory, now: string): CycleEvaluation {
  if (!validHistory(history, now) || (cycle.evaluatedAt && (!Number.isFinite(timestamp(cycle.evaluatedAt)) || timestamp(now) < timestamp(cycle.evaluatedAt)))) return emptyEvaluation("INVALID_HISTORY");
  const startIndex = history.events.findIndex(event => event.id === cycle.startEventId);
  const start = timestamp(cycle.startedAt);
  if (cycle.ticketId !== history.ticketId || cycle.tenantId !== history.tenantId || startIndex < 0 || !Number.isFinite(start) || history.events[startIndex].createdAt !== cycle.startedAt || history.events[startIndex].slaStart?.priority !== cycle.priorityAtCycleStart) return emptyEvaluation("INVALID_HISTORY");
  const policy = cycle.policySnapshot;
  if (!policy) return emptyEvaluation("NOT_CONFIGURED");
  if (policy.id !== cycle.policyVersionId || policy.productId !== history.productId || policy.priority !== cycle.priorityAtCycleStart || policy.status !== "PUBLISHED" || !policy.publishedAt || !Number.isFinite(timestamp(policy.publishedAt)) || timestamp(policy.publishedAt) > start) return emptyEvaluation("INVALID_HISTORY");
  if (![policy.firstResponseMinutes, policy.resolutionMinutes].every(value => Number.isFinite(value) && value > 0)) return emptyEvaluation("INVALID_HISTORY");
  const next = history.events.findIndex((event, index) => index > startIndex && event.newStatus === "REOPENED");
  const events = history.events.slice(startIndex + 1, next < 0 ? undefined : next);
  const resolved = events.find(event => event.newStatus === "RESOLVED");
  // Reopening without a resolution in the preceding cycle is inconsistent.
  if (next >= 0 && !resolved) return emptyEvaluation("INVALID_HISTORY");
  const end = resolved ? timestamp(resolved.createdAt) : timestamp(now);
  const pauses: PauseInterval[] = [];
  let open: string | null = null;
  for (const event of events) {
    if (timestamp(event.createdAt) > end) break;
    if (event.oldStatus === "WAITING_CUSTOMER") {
      if (!open) return emptyEvaluation("INVALID_HISTORY");
      pauses.push({ enteredAt: open, exitedAt: event.createdAt }); open = null;
    }
    if (event.newStatus === "WAITING_CUSTOMER") {
      if (open) return emptyEvaluation("INVALID_HISTORY");
      open = event.createdAt;
    }
    if (event.newStatus === "RESOLVED") break;
  }
  if (open) pauses.push({ enteredAt: open, exitedAt: null });
  const reply = history.replies.find(item => {
    const eventIndex = item.eventId ? history.events.findIndex(event => event.id === item.eventId) : -1;
    return (eventIndex >= 0 ? eventIndex > startIndex && (next < 0 || eventIndex < next) : timestamp(item.createdAt) >= start)
      && timestamp(item.createdAt) <= end;
  });
  const firstEnd = reply ? timestamp(reply.createdAt) : end;
  const pausedMs = policy.pauseResolutionWhileWaitingCustomer ? pauses.reduce((sum, interval) => sum + ((interval.exitedAt ? timestamp(interval.exitedAt) : end) - timestamp(interval.enteredAt)), 0) : 0;
  const firstElapsed = (firstEnd - start) / 60000;
  const resolutionElapsed = (end - start - pausedMs) / 60000;
  if (firstElapsed < 0 || resolutionElapsed < 0) return emptyEvaluation("INVALID_HISTORY");
  function metric(target: number, elapsed: number, satisfiedAt: string | null, paused: boolean, missingResponse = false): MetricEvaluation {
    const result = satisfiedAt ? (elapsed <= target ? "MET" : "NOT_MET") : missingResponse ? "NOT_MET" : "PENDING";
    const breached = elapsed > target || result === "NOT_MET";
    return {
      targetMinutes: target, activeElapsedMinutes: elapsed, satisfiedAt, result,
      state: breached ? "BREACHED" : paused && result === "PENDING" ? "PAUSED" : "ON_TRACK",
      dueAt: null,
    };
  }
  const firstResponse = metric(policy.firstResponseMinutes, firstElapsed, reply?.createdAt ?? null, false, Boolean(resolved && !reply));
  // Deadline depends on the metric, never on equal target values.
  firstResponse.dueAt = new Date(start + policy.firstResponseMinutes * 60000).toISOString();
  const paused = Boolean(open && policy.pauseResolutionWhileWaitingCustomer && !resolved);
  const resolution = metric(policy.resolutionMinutes, resolutionElapsed, resolved?.createdAt ?? null, paused);
  resolution.dueAt = paused ? null : new Date(start + policy.resolutionMinutes * 60000 + pausedMs).toISOString();
  const state = firstResponse.state === "BREACHED" || resolution.state === "BREACHED" ? "BREACHED" : resolution.state === "PAUSED" ? "PAUSED" : "ON_TRACK";
  return { state, firstResponse, resolution, pauses, resolvedAt: resolved?.createdAt ?? null };
}
