import type { Ticket } from "@/features/tickets/types";
import { typeLabels } from "@/features/tickets/types";
import type { SlaCycle } from "@/services/sla/types";
import { opportunities, type SatisfactionRecord } from "@/services/satisfaction/types";
import type { ReportingQuery, ReportingResult, Sample, SlaCounts } from "./types";
export function sample(values: number[]): Sample {
  const sorted = values.filter(value => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  const count = sorted.length; const middle = Math.floor(count / 2);
  return { count, mean: count ? sorted.reduce((sum, value) => sum + value, 0) / count : null,
    median: count ? count % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2 : null };
}
const ratio = (numerator: number, denominator: number) => denominator ? numerator / denominator : null;
function counts(): SlaCounts { return { MET: 0, NOT_MET: 0, PENDING: 0, NOT_CONFIGURED: 0, INVALID_HISTORY: 0, denominator: 0, metRate: null }; }
/** Aggregates persisted records only. Never reconciles or evaluates an operational SLA. */
export function calculateReporting(tickets: Ticket[], cycles: SlaCycle[], feedback: SatisfactionRecord[], query: ReportingQuery): ReportingResult {
  const start = Date.parse(query.start), end = Date.parse(query.end);
  const inside = (value: string) => Number.isFinite(Date.parse(value)) && Date.parse(value) >= start && Date.parse(value) < end;
  const selected = tickets.filter(ticket => (!query.clientId || ticket.clientId === query.clientId) && (!query.productId || ticket.productId === query.productId) && (!query.type || ticket.type === query.type));
  const cohort = selected.filter(ticket => inside(ticket.events.find(event => event.eventType === "CREATED")?.createdAt ?? ""));
  const resolved = cohort.filter(ticket => ticket.events.some(event => event.newStatus === "RESOLVED" && Date.parse(event.createdAt) < end));
  const reopened = cohort.filter(ticket => ticket.events.some(event => event.newStatus === "REOPENED" && Date.parse(event.createdAt) < end));
  const reopenedEvents = cohort.reduce((sum, ticket) => sum + ticket.events.filter(event => event.newStatus === "REOPENED" && Date.parse(event.createdAt) < end).length, 0);
  const first = counts(), resolution = counts(); const firstTimes: number[] = [], resolutionTimes: number[] = [];
  let completedCycles = 0, missingFirstResponse = 0, excluded = 0, notConfigured = 0, invalidHistory = 0, pending = 0;
  for (const ticket of selected) {
    for (const [index, event] of ticket.events.entries()) {
      if (event.newStatus !== "RESOLVED" || !inside(event.createdAt)) continue;
      completedCycles++;
      const cycleStart = [...ticket.events.slice(0, index)].reverse().find(item => item.eventType === "CREATED" || item.newStatus === "REOPENED");
      const cycle = cycles.find(item => item.ticketId === ticket.id && item.tenantId === ticket.clientId && item.startEventId === cycleStart?.id);
      const evaluation = cycle?.evaluation;
      let unusable = false;
      for (const [metric, target] of [["firstResponse", first], ["resolution", resolution]] as const) {
        const value = evaluation?.[metric];
        if (value?.state === "INVALID_HISTORY" || (value && value.activeElapsedMinutes !== null && (!Number.isFinite(value.activeElapsedMinutes) || value.activeElapsedMinutes < 0)) || (value && value.result !== "PENDING" && value.activeElapsedMinutes === null && value.state !== "NOT_CONFIGURED")) target.INVALID_HISTORY++;
        else if (!cycle?.policySnapshot || value?.state === "NOT_CONFIGURED") target.NOT_CONFIGURED++;
        else if (!value) target.PENDING++;
        else target[value.result]++;
      }
      if (evaluation && (evaluation.state === "INVALID_HISTORY" || [evaluation.firstResponse, evaluation.resolution].some(value => value.state === "INVALID_HISTORY" || (value.activeElapsedMinutes !== null && (!Number.isFinite(value.activeElapsedMinutes) || value.activeElapsedMinutes < 0)) || (value.result !== "PENDING" && value.activeElapsedMinutes === null && value.state !== "NOT_CONFIGURED")))) { invalidHistory++; unusable = true; }
      else if (!cycle?.policySnapshot || evaluation?.state === "NOT_CONFIGURED") { notConfigured++; unusable = true; }
      else if (!evaluation || !evaluation.resolvedAt || evaluation.resolution.result === "PENDING") { pending++; unusable = true; }
      if (unusable) { excluded++; continue; }
      if (evaluation!.firstResponse.satisfiedAt && evaluation!.firstResponse.result !== "PENDING" && evaluation!.firstResponse.state !== "INVALID_HISTORY" && evaluation!.firstResponse.activeElapsedMinutes !== null && Number.isFinite(evaluation!.firstResponse.activeElapsedMinutes) && evaluation!.firstResponse.activeElapsedMinutes >= 0) firstTimes.push(evaluation!.firstResponse.activeElapsedMinutes);
      else missingFirstResponse++;
      const elapsed = evaluation!.resolution.activeElapsedMinutes;
      if (elapsed !== null && Number.isFinite(elapsed) && elapsed >= 0) resolutionTimes.push(elapsed); else { invalidHistory++; excluded++; }
    }
  }
  for (const item of [first, resolution]) { item.denominator = item.MET + item.NOT_MET; item.metRate = ratio(item.MET, item.denominator); }
  const records = feedback.filter(record => selected.some(ticket => ticket.id === record.ticketId && ticket.clientId === record.tenantId && ticket.requesterUserId === record.requesterUserId && ticket.productId === record.productId) && inside(record.submittedAt));
  const yes = records.filter(record => record.resolvedAnswer).length; const no = records.length - yes;
  const opportunityCohort = selected.flatMap(ticket => opportunities(ticket, feedback)).filter(item => inside(item.resolvedAt));
  const eligible = opportunityCohort.filter(item => item.status !== "CANCELLED_BY_REOPEN");
  const responded = eligible.filter(item => item.feedback && Date.parse(item.feedback.submittedAt) < end).length;
  function segment(field: "clientId" | "productId" | "type") {
    const result = new Map<string, { id: string; label: string; count: number }>();
    for (const ticket of cohort) { const id = ticket[field]; const label = field === "clientId" ? ticket.clientNameSnapshot : field === "productId" ? ticket.productNameSnapshot : typeLabels[ticket.type]; const item = result.get(id) ?? { id, label, count: 0 }; item.count++; result.set(id, item); }
    return [...result.values()].sort((a, b) => a.label.localeCompare(b.label));
  }
  return { interval: { start: query.start, end: query.end }, volume: { created: cohort.length, resolved: resolved.length, reopenedTickets: reopened.length, reopenedEvents, reopenRate: ratio(reopened.length, resolved.length) },
    attendance: { completedCycles, firstResponse: sample(firstTimes), resolution: sample(resolutionTimes), missingFirstResponse, excluded, notConfigured, invalidHistory, pending },
    sla: { firstResponse: first, resolution }, satisfaction: { received: records.length, yes, no, positiveRate: ratio(yes, yes + no), rating: sample(records.flatMap(record => record.rating === null ? [] : [record.rating])), opportunities: eligible.length, responsesInResolutionCohort: responded, responseRate: ratio(responded, eligible.length), cancelled: opportunityCohort.length - eligible.length },
    segments: { clients: segment("clientId"), products: segment("productId"), types: segment("type") } };
}
