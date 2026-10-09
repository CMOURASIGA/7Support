import type { Satisfaction } from "@/features/satisfaction/types";
import type { OperationalReport, ReportFilters, ReportTrend, RatioMetric } from "@/features/reporting/types";
import type { Ticket } from "@/features/tickets/types";
import { localIdentityStore } from "@/services/local-identity/store";
import { localSatisfactionRepository } from "@/services/satisfaction/local-repository";
import type { SatisfactionRepository } from "@/services/satisfaction/repository";
import { slaService, type SlaService } from "@/services/sla/service";
import type { SlaCycle } from "@/services/sla/types";
import { ticketService, type TicketService } from "@/services/tickets/service";

function internal() {
  const user = localIdentityStore.currentUser();
  if (!user) throw new Error("Faça login para acessar relatórios.");
  if (user.role === "CLIENT") throw new Error("Relatórios estão disponíveis somente para a operação interna.");
  return user;
}
function sameSession(id: string) { if (internal().id !== id) throw new Error("A sessão mudou. Recarregue o relatório."); }
function origin(ticket: Ticket): "MANUAL" | "ATENA" | "DEMO" { return ticket.demo ? "DEMO" : ticket.origin?.type === "ATENA" ? "ATENA" : "MANUAL"; }
function inRange(value: string | null | undefined, start: number, end: number) { if (!value) return false; const time = Date.parse(value); return Number.isFinite(time) && time >= start && time < end; }
function median(values: number[]) { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }
function duration(values: Array<number | null>, excluded = 0) { const valid = values.filter((value): value is number => value !== null && Number.isFinite(value)); return { count: valid.length, meanMinutes: valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null, medianMinutes: median(valid), excluded: excluded + values.length - valid.length }; }
function ratio(numerator: number, denominator: number, excluded = 0): RatioMetric { return { numerator, denominator, rate: denominator ? numerator / denominator : null, excluded }; }
function range(filters: ReportFilters, now: Date) {
  const end = new Date(now); end.setUTCHours(24, 0, 0, 0);
  let start: Date;
  if (filters.preset === "CURRENT_MONTH") start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  else if (filters.preset === "CUSTOM") {
    start = new Date(`${filters.start}T00:00:00.000Z`); const customEnd = new Date(`${filters.end}T00:00:00.000Z`); customEnd.setUTCDate(customEnd.getUTCDate() + 1);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(customEnd.getTime()) || start >= customEnd) throw new Error("Informe um período personalizado válido.");
    return { start: start.toISOString(), end: customEnd.toISOString() };
  } else { const days = Number(filters.preset.slice(0, -1)); start = new Date(end); start.setUTCDate(start.getUTCDate() - days); }
  return { start: start.toISOString(), end: end.toISOString() };
}

export function calculateOperationalReport(input: { tickets: Ticket[]; cycles: SlaCycle[]; satisfactions: Satisfaction[]; filters: ReportFilters; now: Date }): OperationalReport {
  const period = range(input.filters, input.now); const start = Date.parse(period.start), end = Date.parse(period.end);
  const authorized = input.tickets.filter(ticket => (!input.filters.clientId || ticket.clientId === input.filters.clientId)
    && (!input.filters.productId || ticket.productId === input.filters.productId) && (!input.filters.type || ticket.type === input.filters.type)
    && (input.filters.origin === "ALL" || (input.filters.origin === "OPERATIONAL" ? origin(ticket) !== "DEMO" : origin(ticket) === input.filters.origin)));
  const ids = new Set(authorized.map(ticket => ticket.id));
  const created = authorized.filter(ticket => inRange(ticket.createdAt, start, end));
  const resolutions = authorized.flatMap(ticket => ticket.events.filter(event => event.eventType === "STATUS_CHANGED" && event.newStatus === "RESOLVED" && inRange(event.createdAt, start, end)).map(event => ({ ticket, event })));
  const reopens = authorized.flatMap(ticket => ticket.events.filter(event => event.eventType === "STATUS_CHANGED" && event.newStatus === "REOPENED" && inRange(event.createdAt, start, end)).map(event => ({ ticket, event })));
  const cycles = input.cycles.filter(cycle => ids.has(cycle.ticketId));
  const firstCycles = cycles.filter(cycle => inRange(cycle.evaluation?.firstResponse.satisfiedAt ?? (cycle.evaluation?.firstResponse.result === "NOT_MET" ? cycle.evaluation?.resolvedAt : null), start, end));
  const resolvedCycles = cycles.filter(cycle => inRange(cycle.evaluation?.resolvedAt, start, end));
  const satisfaction = input.satisfactions.filter(record => ids.has(record.ticketId) && inRange(record.submittedAt, start, end));
  const ratingValues = satisfaction.map(record => record.rating).filter((value): value is number => value !== null);
  const evaluatedResolutionIds = new Set(input.satisfactions.filter(record => ids.has(record.ticketId)).map(record => record.resolutionEventId));
  const reopenedAfter = (ticket: Ticket, at: string) => ticket.events.some(event => event.newStatus === "REOPENED" && event.createdAt >= at);
  const opportunities = resolutions.filter(({ ticket, event }) => evaluatedResolutionIds.has(event.id) || !reopenedAfter(ticket, event.createdAt));
  const trend = new Map<string, ReportTrend>();
  const day = (iso: string) => iso.slice(0, 10); const bucket = (iso: string) => { const key = day(iso); if (!trend.has(key)) trend.set(key, { date: key, created: 0, resolutions: 0, reopens: 0, satisfactionPositive: 0, satisfactionTotal: 0, slaMet: 0, slaTotal: 0 }); return trend.get(key)!; };
  created.forEach(ticket => bucket(ticket.createdAt).created++); resolutions.forEach(({ event }) => bucket(event.createdAt).resolutions++); reopens.forEach(({ event }) => bucket(event.createdAt).reopens++);
  satisfaction.forEach(record => { const item = bucket(record.submittedAt); item.satisfactionTotal++; if (record.resolvedAnswer) item.satisfactionPositive++; });
  resolvedCycles.forEach(cycle => { const item = bucket(cycle.evaluation!.resolvedAt!); if (["MET", "NOT_MET"].includes(cycle.evaluation!.resolution.result)) { item.slaTotal++; if (cycle.evaluation!.resolution.result === "MET") item.slaMet++; } });
  const ticketById = new Map(authorized.map(ticket => [ticket.id, ticket]));
  const validFirst = firstCycles.filter(cycle => ["MET", "NOT_MET"].includes(cycle.evaluation?.firstResponse.result ?? ""));
  const validResolution = resolvedCycles.filter(cycle => ["MET", "NOT_MET"].includes(cycle.evaluation?.resolution.result ?? ""));
  return {
    generatedAt: input.now.toISOString(), period, filters: input.filters,
    totals: { createdTickets: created.length, resolutions: resolutions.length, reopens: reopens.length },
    firstResponse: duration(validFirst.map(cycle => cycle.evaluation!.firstResponse.activeElapsedMinutes), firstCycles.length - validFirst.length),
    resolution: duration(validResolution.map(cycle => cycle.evaluation!.resolution.activeElapsedMinutes), resolvedCycles.length - validResolution.length),
    reopenRate: ratio(reopens.length, resolutions.length),
    firstResponseSla: ratio(validFirst.filter(cycle => cycle.evaluation!.firstResponse.result === "MET").length, validFirst.length, firstCycles.length - validFirst.length),
    resolutionSla: ratio(validResolution.filter(cycle => cycle.evaluation!.resolution.result === "MET").length, validResolution.length, resolvedCycles.length - validResolution.length),
    positiveSatisfaction: ratio(satisfaction.filter(record => record.resolvedAnswer).length, satisfaction.length),
    participation: ratio(resolutions.filter(({ event }) => evaluatedResolutionIds.has(event.id)).length, opportunities.length, resolutions.length - opportunities.length),
    averageRating: { value: ratingValues.length ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length : null, denominator: ratingValues.length, excluded: satisfaction.length - ratingValues.length },
    trends: [...trend.values()].sort((a, b) => a.date.localeCompare(b.date)),
    tickets: created.map(ticket => ({ id: ticket.id, code: ticket.publicCode, client: ticket.clientNameSnapshot, product: ticket.productNameSnapshot, type: ticket.type, origin: origin(ticket), createdAt: ticket.createdAt,
      resolutions: ticket.events.filter(event => event.newStatus === "RESOLVED" && inRange(event.createdAt, start, end)).length, reopens: ticket.events.filter(event => event.newStatus === "REOPENED" && inRange(event.createdAt, start, end)).length })),
    sla: [...new Set([...firstCycles, ...resolvedCycles])].map(cycle => ({ cycleId: cycle.id, ticketId: cycle.ticketId, code: ticketById.get(cycle.ticketId)?.publicCode ?? "", cycle: cycle.cycleNumber,
      firstResponseMinutes: cycle.evaluation?.firstResponse.activeElapsedMinutes ?? null, firstResponseResult: cycle.evaluation?.firstResponse.result ?? "PENDING", resolutionMinutes: cycle.evaluation?.resolution.activeElapsedMinutes ?? null,
      resolutionResult: cycle.evaluation?.resolution.result ?? "PENDING", resolvedAt: cycle.evaluation?.resolvedAt ?? null })),
    satisfaction: satisfaction.map(record => ({ id: record.id, ticketId: record.ticketId, code: ticketById.get(record.ticketId)?.publicCode ?? "", resolutionEventId: record.resolutionEventId, resolvedAnswer: record.resolvedAnswer, rating: record.rating, submittedAt: record.submittedAt })),
    options: { clients: [...new Map(input.tickets.map(ticket => [ticket.clientId, { id: ticket.clientId, label: ticket.clientNameSnapshot }])).values()], products: [...new Map(input.tickets.map(ticket => [ticket.productId, { id: ticket.productId, label: ticket.productNameSnapshot }])).values()] },
    notes: ["Chamados demo são excluídos por padrão pelo filtro Operacional.", "SLA utiliza o resultado histórico persistido de cada ciclo, sem recálculo retroativo.", "Participação considera resoluções elegíveis no período; ciclos reabertos sem avaliação são excluídos.", "Comentários individuais não integram relatórios ou exportações."],
  };
}

export class ReportingService {
  constructor(private readonly tickets: TicketService, private readonly sla: SlaService, private readonly satisfaction: SatisfactionRepository, private readonly clock = { now: () => new Date() }) {}
  async generate(filters: ReportFilters) {
    const user = internal();
    const tickets = await this.tickets.reportingTickets(); const cycles = await this.sla.reportingSnapshot(); const records = (await this.satisfaction.read()).records;
    sameSession(user.id);
    return calculateOperationalReport({ tickets, cycles, satisfactions: records, filters, now: this.clock.now() });
  }
}

export const reportingService = new ReportingService(ticketService, slaService, localSatisfactionRepository);
