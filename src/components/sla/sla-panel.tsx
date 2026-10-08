"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { slaService } from "@/services/sla/service";
import { stateLabels, resultLabels, type ClientSlaView, type InternalSlaView, type SlaState } from "@/services/sla/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/components/tickets/ticket-ui";
export function SlaBadge({ state }: { state?: SlaState }) {
  return <Badge tone={state === "BREACHED" || state === "INVALID_HISTORY" ? "danger" : state === "PAUSED" ? "warning" : state === "ON_TRACK" ? "success" : "neutral"}>{state ? stateLabels[state] : "Calculando SLA..."}</Badge>;
}
export function useQueueSla() {
  const [views, setViews] = useState<Record<string, InternalSlaView>>({});
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try { setViews(await slaService.listInternal()); setError(""); }
    catch (cause) { setViews({}); setError(cause instanceof Error ? cause.message : "Falha no SLA."); }
  }, []);
  useEffect(() => { let active = true; const run = () => { if (active) void refresh(); }; run(); const stop = slaService.subscribe(run); const timer = setInterval(run, 15000); return () => { active = false; stop(); clearInterval(timer); }; }, [refresh]);
  return { views, error, refresh };
}
export function SlaPanel({ ticketId }: { ticketId: string }) {
  const { user } = useAuth();
  const client = user?.role === "CLIENT";
  const [view, setView] = useState<ClientSlaView | InternalSlaView | null>(null);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try { setView(client ? await slaService.getClient(ticketId) : await slaService.getInternal(ticketId)); setError(""); }
    catch (cause) { setView(null); setError(cause instanceof Error ? cause.message : "Falha no SLA."); }
  }, [ticketId, client]);
  useEffect(() => { void refresh(); const stop = slaService.subscribe(() => void refresh()); const timer = setInterval(() => void refresh(), 15000); return () => { stop(); clearInterval(timer); }; }, [refresh]);
  return <Card><section aria-label="SLA do chamado" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-base font-semibold">Prazos de atendimento</h3>{view && <SlaBadge state={view.state} />}</div>
    {error ? <div role="alert"><p className="text-sm text-[var(--danger)]">{error}</p><button className="workspace-button-secondary mt-2" onClick={() => void refresh()}>Tentar novamente</button></div> : !view ? <p role="status" className="text-sm">Calculando prazos...</p> : "firstResponse" in view ? <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="workspace-section-label">Primeira resposta</dt><dd className="mt-1">{view.firstResponse}</dd></div><div><dt className="workspace-section-label">Resolução</dt><dd className="mt-1">{view.resolution}</dd></div></dl> : !view.cycles.length ? <p className="text-sm">{stateLabels[view.state]}</p> : <div className="space-y-4">{[...view.cycles].reverse().map(cycle => <div key={cycle.id} className="rounded-xl border border-[var(--border)] p-3"><p className="mb-3 text-sm font-semibold">Ciclo {cycle.cycleNumber} · {formatDate(cycle.startedAt)}{cycle.policySnapshot ? ` · Política v${cycle.policySnapshot.version}` : ""}</p><div className="grid gap-4 sm:grid-cols-2">{(["firstResponse", "resolution"] as const).map(metric => {
      const value = cycle.evaluation?.[metric];
      return <div key={metric} className="min-w-0 text-sm"><h4 className="mb-2 font-semibold">{metric === "firstResponse" ? "Primeira resposta" : "Resolução"}</h4>{value && <><SlaBadge state={value.state} /><dl className="mt-2 space-y-1"><div>Resultado: {resultLabels[value.result]}</div><div>Meta: {value.targetMinutes === null ? "Não configurada" : `${value.targetMinutes} min`}</div><div>Tempo ativo: {value.activeElapsedMinutes === null ? "Indisponível" : `${value.activeElapsedMinutes.toFixed(1)} min`}</div><div>Prazo: {value.dueAt ? formatDate(value.dueAt) : value.state === "PAUSED" ? "Será atualizado ao retomar" : "Indisponível"}</div></dl></>}</div>;
    })}</div></div>)}</div>}
    {!client && <p className="text-xs text-[var(--text-secondary)]">24x7 · minutos corridos · atualização durante o uso do aplicativo. Valores demo, sem compromisso comercial.</p>}
  </section></Card>;
}
