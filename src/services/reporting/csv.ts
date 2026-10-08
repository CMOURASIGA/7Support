import type { OperationalReport } from "@/features/reporting/types";

export type CsvKind = "SUMMARY" | "TICKETS" | "SLA" | "SATISFACTION";
export function safeCsv(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
function rows(values: unknown[][]) { return `\uFEFF${values.map(row => row.map(safeCsv).join(";")).join("\r\n")}`; }
export function exportReportCsv(report: OperationalReport, kind: CsvKind) {
  if (kind === "SUMMARY") return rows([
    ["Indicador", "Numerador/valor", "Denominador", "Excluídos"], ["Chamados criados", report.totals.createdTickets, "", 0], ["Resoluções", report.totals.resolutions, "", 0],
    ["Reaberturas", report.totals.reopens, report.reopenRate.denominator, report.reopenRate.excluded], ["SLA primeira resposta", report.firstResponseSla.numerator, report.firstResponseSla.denominator, report.firstResponseSla.excluded],
    ["SLA resolução", report.resolutionSla.numerator, report.resolutionSla.denominator, report.resolutionSla.excluded], ["Satisfação positiva", report.positiveSatisfaction.numerator, report.positiveSatisfaction.denominator, report.positiveSatisfaction.excluded],
    ["Rating médio", report.averageRating.value, report.averageRating.denominator, report.averageRating.excluded], ["Participação", report.participation.numerator, report.participation.denominator, report.participation.excluded],
  ]);
  if (kind === "TICKETS") return rows([["Código", "Cliente", "Produto", "Tipo", "Origem", "Criado em", "Resoluções", "Reaberturas"], ...report.tickets.map(item => [item.code, item.client, item.product, item.type, item.origin, item.createdAt, item.resolutions, item.reopens])]);
  if (kind === "SLA") return rows([["Código", "Ciclo", "Primeira resposta (min)", "Resultado primeira resposta", "Resolução (min)", "Resultado resolução", "Resolvido em"], ...report.sla.map(item => [item.code, item.cycle, item.firstResponseMinutes, item.firstResponseResult, item.resolutionMinutes, item.resolutionResult, item.resolvedAt])]);
  return rows([["Código", "Resolvido", "Rating", "Enviado em"], ...report.satisfaction.map(item => [item.code, item.resolvedAnswer ? "Sim" : "Não", item.rating, item.submittedAt])]);
}
