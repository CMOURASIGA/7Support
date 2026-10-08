"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { Drawer } from "@/components/ui/drawer";
import { useToast } from "@/components/ui/toast";
import { atenaEscalationService } from "@/services/atena-escalation/service";
import type { Escalation, EscalationDraft } from "@/services/atena-escalation/types";
import { impacts, impactLabels, ticketTypes, typeLabels, type TicketType, type TicketImpact } from "@/features/tickets/types";
import { AtenaError } from "@/services/atena/errors";
export function AtenaEscalation({ conversationId, productName }: { conversationId: string; productName: string }) {
  const { notify } = useToast();
  const [linked, setLinked] = useState<Awaited<ReturnType<typeof atenaEscalationService.linkedTicket>>>(null);
  const [preview, setPreview] = useState<Escalation | null>(null);
  const [draft, setDraft] = useState<EscalationDraft>({ subject: "", description: "", type: "QUESTION", impact: "LOW_IMPACT" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const refresh = () => { void atenaEscalationService.linkedTicket(conversationId).then(value => { if (active) { setLinked(value); setLoading(false); } }).catch(() => { if (active) { setError("Não foi possível verificar o chamado desta conversa."); setLoading(false); } }); };
    refresh(); const unsubscribe = atenaEscalationService.subscribe(refresh);
    return () => { active = false; unsubscribe(); };
  }, [conversationId]);
  async function prepare() {
    setBusy(true); setError(null);
    try { const value = await atenaEscalationService.prepare(conversationId); setPreview(value); setDraft(value.draft); }
    catch (cause) { setError(cause instanceof AtenaError ? cause.message : "Não foi possível preparar o chamado. Tente novamente."); }
    finally { setBusy(false); }
  }
  async function confirm(event: FormEvent) {
    event.preventDefault(); if (!preview || busy) return;
    setBusy(true); setError(null);
    try { const value = await atenaEscalationService.confirm(preview.id, draft); setLinked(value); setPreview(null); notify(`Chamado ${value.publicCode} criado.`); }
    catch (cause) { setError(cause instanceof AtenaError ? cause.message : "Não foi possível concluir. Tente novamente para recuperar a abertura."); }
    finally { setBusy(false); }
  }
  return <div className="mt-4 border-t border-[var(--border)] pt-4">
    {linked ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm font-semibold">Chamado {linked.publicCode} criado</p><Link className="workspace-button-secondary" href={linked.href}>Abrir chamado</Link></div> : <button type="button" className="workspace-button-secondary" disabled={busy || loading} onClick={() => void prepare()}>{busy ? "Preparando..." : "Abrir chamado"}</button>}
    {error && !preview && <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
    <Drawer open={Boolean(preview)} title="Revisar abertura do chamado" onClose={() => { if (!busy) { setPreview(null); setError(null); } }}>
      <form onSubmit={confirm} className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">Revise o conteúdo antes de confirmar. A abertura ocorre somente com sua confirmação.</p>
        <label className="block text-sm font-medium">Produto<input className="workspace-input mt-1" readOnly value={productName} /></label>
        <label className="block text-sm font-medium">Tipo<select className="workspace-select mt-1" disabled={busy} value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value as TicketType })}>{ticketTypes.map(type => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label>
        <label className="block text-sm font-medium">Impacto<select className="workspace-select mt-1" disabled={busy} value={draft.impact} onChange={event => setDraft({ ...draft, impact: event.target.value as TicketImpact })}>{impacts.map(impact => <option key={impact} value={impact}>{impactLabels[impact]}</option>)}</select></label>
        <label className="block text-sm font-medium">Assunto<input className="workspace-input mt-1" required maxLength={160} disabled={busy} value={draft.subject} onChange={event => setDraft({ ...draft, subject: event.target.value })} /></label>
        <label className="block text-sm font-medium">Descrição<textarea className="workspace-textarea mt-1 min-h-48" required maxLength={10000} disabled={busy} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
        <details><summary className="cursor-pointer text-sm font-semibold">Resumo da conversa autorizado</summary><p className="mt-2 whitespace-pre-wrap break-words text-sm">{preview?.approvedContextSnapshot}</p></details>
        {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
        <div className="flex flex-wrap gap-2"><button type="button" className="workspace-button-secondary" disabled={busy} onClick={() => { setPreview(null); setError(null); }}>Cancelar</button><button type="submit" className="workspace-button-primary" disabled={busy}>{busy ? "Abrindo chamado..." : error ? "Tentar novamente" : "Confirmar abertura"}</button></div>
      </form>
    </Drawer>
  </div>;
}
