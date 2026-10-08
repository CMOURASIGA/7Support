import { localIdentityStore } from "@/services/local-identity/store";
import { ticketTypes } from "@/features/tickets/types";
import { ticketService, type TicketService } from "@/services/tickets/service";
import { slaService, type SlaService } from "@/services/sla/service";
import { satisfactionRepository } from "@/services/satisfaction/local-repository";
import type { SatisfactionRepository } from "@/services/satisfaction/types";
import { calculateReporting } from "./calculator";
import type { ReportingQuery } from "./types";
function internal() { const user = localIdentityStore.currentUser(); if (!user || user.role === "CLIENT") throw new Error("Relatórios disponíveis somente para SUPPORT/ADMIN."); return user; }
function validUtc(value: string) { const at = Date.parse(value); return /^\d{4}-\d\d-\d\dT.*Z$/.test(value) && Number.isFinite(at) && new Date(at).toISOString() === value; }
export class ReportingService {
  constructor(private readonly tickets: TicketService, private readonly sla: Pick<SlaService, "reportingSnapshot">, private readonly satisfaction: SatisfactionRepository) {}
  async query(query: ReportingQuery) {
    const user = internal();
    if (!validUtc(query.start) || !validUtc(query.end) || Date.parse(query.start) >= Date.parse(query.end) || (query.type && !ticketTypes.includes(query.type))) throw new Error("Informe um intervalo UTC válido [início, fim) e filtros válidos.");
    const [tickets, cycles, database] = await Promise.all([this.tickets.reportingTickets(), this.sla.reportingSnapshot(), this.satisfaction.read()]);
    if (internal().id !== user.id) throw new Error("A sessão mudou durante a consulta.");
    return calculateReporting(tickets, cycles, database.feedback, query);
  }
  async filterOptions() {
    const user = internal(); const tickets = await this.tickets.reportingTickets(); if (internal().id !== user.id) throw new Error("A sessão mudou.");
    return { clients: [...new Map(tickets.map(ticket => [ticket.clientId, ticket.clientNameSnapshot])).entries()], products: [...new Map(tickets.map(ticket => [ticket.productId, ticket.productNameSnapshot])).entries()] };
  }
}
export const reportingService = new ReportingService(ticketService, slaService, satisfactionRepository);
export function localDateInterval(start: string, end: string) {
  const parse = (value: string) => { if (!/^\d{4}-\d\d-\d\d$/.test(value)) throw new Error("Escolha datas válidas."); const [year, month, day] = value.split("-").map(Number); const date = new Date(year, month - 1, day); if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) throw new Error("Escolha datas válidas."); return date; };
  const from = parse(start), to = parse(end); to.setDate(to.getDate() + 1);
  if (from >= to) throw new Error("A data inicial deve ser anterior à final.");
  return { start: from.toISOString(), end: to.toISOString() };
}
