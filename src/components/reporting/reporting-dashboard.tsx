"use client";
import { useCallback, useEffect, useState } from "react";
import { BarChart3, Download, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { ticketTypes, typeLabels } from "@/features/tickets/types";
import type { CsvKind } from "@/services/reporting/csv";
import { exportReportCsv } from "@/services/reporting/csv";
import { reportingService } from "@/services/reporting/service";
import type { OperationalReport, ReportFilters } from "@/features/reporting/types";
import { useToast } from "@/components/ui/toast";

const initial: ReportFilters = { preset: "30D", origin: "OPERATIONAL", clientId: "", productId: "", type: "" };
const percent = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const minutes = (value: number | null) => value === null ? "—" : `${value.toFixed(1)} min`;
function defaultCustomRange() {
  const end = new Date(); const start = new Date(end); start.setUTCDate(start.getUTCDate() - 29);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function ReportingDashboard() {
  const [filters, setFilters] = useState(initial); const [report, setReport] = useState<OperationalReport | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const { notify } = useToast();
  const refresh = useCallback(async () => { setLoading(true); setError(""); try { setReport(await reportingService.generate(filters)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível gerar o relatório."); } finally { setLoading(false); } }, [filters]);
  useEffect(() => { void refresh(); }, [refresh]);
  function update<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) { setFilters(current => ({ ...current, [key]: value })); }
  function updatePreset(preset: ReportFilters["preset"]) {
    setFilters(current => {
      if (preset !== "CUSTOM") return { ...current, preset };
      const defaults = defaultCustomRange();
      return { ...current, preset, start: current.start || defaults.start, end: current.end || defaults.end };
    });
  }
  function download(kind: CsvKind) {
    if (!report) return; const blob = new Blob([exportReportCsv(report, kind)], { type: "text/csv;charset=utf-8" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `7support-${kind.toLowerCase()}-${report.period.start.slice(0,10)}.csv`; anchor.click(); URL.revokeObjectURL(url); notify("CSV exportado com os filtros atuais.");
  }
  const kpis = report ? [
    ["Chamados criados", String(report.totals.createdTickets), "Coorte: criação no período"], ["Resoluções", String(report.totals.resolutions), "Eventos de resolução"], ["Reabertura", percent(report.reopenRate.rate), `${report.reopenRate.numerator}/${report.reopenRate.denominator}`],
    ["1ª resposta média", minutes(report.firstResponse.meanMinutes), `mediana ${minutes(report.firstResponse.medianMinutes)}`], ["Resolução média", minutes(report.resolution.meanMinutes), `mediana ${minutes(report.resolution.medianMinutes)}`],
    ["SLA 1ª resposta", percent(report.firstResponseSla.rate), `${report.firstResponseSla.numerator}/${report.firstResponseSla.denominator}`], ["SLA resolução", percent(report.resolutionSla.rate), `${report.resolutionSla.numerator}/${report.resolutionSla.denominator}`],
    ["Satisfação positiva", percent(report.positiveSatisfaction.rate), `${report.positiveSatisfaction.numerator}/${report.positiveSatisfaction.denominator}`], ["Rating médio", report.averageRating.value?.toFixed(1) ?? "—", `${report.averageRating.denominator} ratings`], ["Participação", percent(report.participation.rate), `${report.participation.numerator}/${report.participation.denominator}`],
  ] : [];
  return <AppShell><div className="mx-auto w-full max-w-7xl space-y-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="workspace-eyebrow">Operação interna</p><h1 className="workspace-title">Satisfação e relatórios</h1><p className="workspace-subtitle">Indicadores com coortes, denominadores e exclusões explícitas.</p></div><button className="workspace-button-secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={17} />Atualizar</button></div>
    <Card><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"><label className="text-sm font-medium">Período<select className="workspace-input mt-1" value={filters.preset} onChange={event => updatePreset(event.target.value as ReportFilters["preset"])}><option value="7D">7 dias</option><option value="30D">30 dias</option><option value="90D">90 dias</option><option value="CURRENT_MONTH">Mês atual</option><option value="CUSTOM">Personalizado</option></select></label>
      {filters.preset === "CUSTOM" && <><label className="text-sm font-medium">Início<input className="workspace-input mt-1" type="date" value={filters.start ?? ""} onInput={event => update("start", event.currentTarget.value)} /></label><label className="text-sm font-medium">Fim<input className="workspace-input mt-1" type="date" value={filters.end ?? ""} onInput={event => update("end", event.currentTarget.value)} /></label></>}
      <label className="text-sm font-medium">Cliente<select className="workspace-input mt-1" value={filters.clientId} onChange={event => update("clientId", event.target.value)}><option value="">Todos</option>{report?.options.clients.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="text-sm font-medium">Produto<select className="workspace-input mt-1" value={filters.productId} onChange={event => update("productId", event.target.value)}><option value="">Todos</option>{report?.options.products.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="text-sm font-medium">Tipo<select className="workspace-input mt-1" value={filters.type} onChange={event => update("type", event.target.value as ReportFilters["type"])}><option value="">Todos</option>{ticketTypes.map(type => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label>
      <label className="text-sm font-medium">Origem<select className="workspace-input mt-1" value={filters.origin} onChange={event => update("origin", event.target.value as ReportFilters["origin"])}><option value="OPERATIONAL">Operacional, sem demo</option><option value="MANUAL">Manual</option><option value="ATENA">Atena</option><option value="DEMO">Demonstração</option><option value="ALL">Todas, identificadas</option></select></label></div></Card>
    {loading ? <LoadingState label="Calculando indicadores..." /> : error ? <ErrorState message={error} retry={() => void refresh()} /> : report && <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{kpis.map(([label,value,detail]) => <Card key={label} className="min-w-0"><p className="workspace-section-label">{label}</p><p className="mt-2 text-2xl font-bold text-[var(--brand)]">{value}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{detail}</p></Card>)}</div>
      <Card><div className="flex items-center gap-2"><BarChart3 size={19} className="text-[var(--accent)]" /><h2 className="font-semibold">Evolução diária</h2></div>{report.trends.length ? <div className="mt-5 overflow-x-auto"><div className="flex min-w-[560px] items-end gap-3" style={{ height: 210 }}>{report.trends.map(item => { const max = Math.max(1, ...report.trends.map(value => value.created + value.resolutions)); return <div key={item.date} className="flex h-full flex-1 flex-col justify-end text-center"><div className="mx-auto flex w-full max-w-12 flex-col justify-end overflow-hidden rounded-t-md bg-[var(--bg-muted)]" style={{ height: `${Math.max(8, ((item.created + item.resolutions) / max) * 150)}px` }}><div className="bg-[var(--accent)]" style={{ height: `${item.resolutions ? Math.max(4, item.resolutions / Math.max(1,item.created + item.resolutions) * 100) : 0}%` }} /></div><p className="mt-2 text-[10px] text-[var(--text-secondary)]">{item.date.slice(5)}</p></div>; })}</div><div className="mt-3 flex gap-4 text-xs"><span>Azul: resoluções</span><span>Cinza: volume criado + resolvido</span></div></div> : <EmptyState title="Sem dados no período" description="Ajuste os filtros ou registre atividade operacional." />}</Card>
      <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Detalhamento e exportação</h2><p className="text-sm text-[var(--text-secondary)]">Os CSVs usam os mesmos filtros e não incluem comentários.</p></div><div className="flex flex-wrap gap-2">{(["SUMMARY","TICKETS","SLA","SATISFACTION"] as CsvKind[]).map(kind => <button key={kind} className="workspace-button-secondary" onClick={() => download(kind)}><Download size={16} />{kind}</button>)}</div></div>
        <div className="mt-5 overflow-x-auto"><table className="workspace-table min-w-[760px]"><thead><tr><th>Código</th><th>Cliente</th><th>Produto</th><th>Tipo</th><th>Origem</th><th>Criado em</th></tr></thead><tbody>{report.tickets.map(item => <tr key={item.id}><td>{item.code}</td><td>{item.client}</td><td>{item.product}</td><td>{item.type}</td><td>{item.origin}</td><td>{new Date(item.createdAt).toLocaleString("pt-BR")}</td></tr>)}</tbody></table>{!report.tickets.length && <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Nenhum chamado criado nesta coorte.</p>}</div></Card>
      <Card><h2 className="font-semibold">Critérios do relatório</h2><ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">{report.notes.map(note => <li key={note}>{note}</li>)}</ul><p className="mt-3 text-xs text-[var(--text-secondary)]">Período UTC: {report.period.start.slice(0,10)} a {new Date(Date.parse(report.period.end)-1).toISOString().slice(0,10)} · Gerado em {new Date(report.generatedAt).toLocaleString("pt-BR")}</p></Card></>}
  </div></AppShell>;
}
