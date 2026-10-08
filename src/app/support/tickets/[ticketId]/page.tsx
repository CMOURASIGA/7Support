"use client";

import { type FormEvent, use, useState } from "react";
import { ArrowRight, Send } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { AttachmentPicker } from "@/components/tickets/attachment-picker";
import { BackLink, formatDate, PageHeading, StatusBadge, TicketFeedback } from "@/components/tickets/ticket-ui";
import { PriorityBadge } from "@/components/support/support-ui";
import { Badge } from "@/components/ui/badge";
import { SlaPanel } from "@/components/sla/sla-panel";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { RequireAuth } from "@/features/auth/require-auth";
import { useInternalTicket } from "@/features/tickets/use-internal-tickets";
import { categories, categoryLabels, impactLabels, priorities, priorityLabels, statusLabels, type AttachmentInput, type TicketCategory, type TicketPriority, type TicketStatus, type TicketMessage } from "@/features/tickets/types";
import { demoOperators, operatorName } from "@/services/tickets/operators";
import { allowedTransitions, ticketService } from "@/services/tickets/service";

function InternalDetail({ id }: { id: string }) {
  const { ticket, loading, error, refresh } = useInternalTicket(id);
  const { notify } = useToast();
  const [busy, setBusy] = useState(false); const [mode, setMode] = useState<"PUBLIC_REPLY" | "INTERNAL_NOTE">("PUBLIC_REPLY");
  const [body, setBody] = useState(""); const [reason, setReason] = useState("");
  const [attachments, setAttachments] = useState<AttachmentInput[]>([]); const [formError, setFormError] = useState("");
  async function action(label: string, operation: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true); setFormError("");
    try { await operation(); notify(`${label} com sucesso.`); await refresh(); }
    catch (cause) { const message = cause instanceof Error ? cause.message : "Ação não concluída."; setFormError(message); notify(message, "error"); }
    finally { setBusy(false); }
  }
  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setFormError("");
    try { await ticketService.postInternal(id, mode, { body, attachments }); setBody(""); setAttachments([]); notify(mode === "INTERNAL_NOTE" ? "Nota interna registrada." : "Resposta enviada ao cliente."); await refresh(); }
    catch (cause) { const message = cause instanceof Error ? cause.message : "Ação não concluída."; setFormError(message); notify(message, "error"); }
    finally { setBusy(false); }
  }
  async function download(message: TicketMessage, attachmentId: string) {
    try { const file = await ticketService.attachmentInternal(id, attachmentId); if (!message.attachments.some((item) => item.id === file.id)) throw new Error("Anexo não pertence à mensagem."); const anchor = document.createElement("a"); anchor.href = file.dataUrl; anchor.download = file.originalFilename; anchor.click(); }
    catch (cause) { notify(cause instanceof Error ? cause.message : "Anexo indisponível.", "error"); }
  }
  const timeline = ticket ? [
    ...ticket.messages.map((message) => ({ id: message.id, date: message.createdAt, message, event: null })),
    ...ticket.events.map((event) => ({ id: event.id, date: event.createdAt, message: null, event })),
  ].sort((a, b) => a.date.localeCompare(b.date)) : [];
  return <AppShell><div className="mx-auto w-full max-w-6xl space-y-5"><BackLink href="/support/queue" /><TicketFeedback loading={loading} error={error} retry={() => void refresh()} />
    {ticket && !error && <><PageHeading eyebrow={`${ticket.publicCode} · ${ticket.clientNameSnapshot}`} title={ticket.subject} description={`${ticket.productNameSnapshot} · ${ticket.requesterNameSnapshot}`} action={<div className="flex gap-2"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>} />
      <Card><dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">{[
        ["Cliente", ticket.clientNameSnapshot], ["Solicitante", ticket.requesterNameSnapshot], ["E-mail", ticket.requesterEmailSnapshot], ["Produto", ticket.productNameSnapshot],
        ["Tipo", categoryLabels[ticket.type]], ["Impacto", impactLabels[ticket.impact]], ["Categoria", categoryLabels[ticket.category]], ["Responsável", operatorName(ticket.assignedToUserId)],
        ["Criado em", formatDate(ticket.createdAt)], ["Atualizado em", formatDate(ticket.updatedAt)], ["Status", statusLabels[ticket.status]], ["Prioridade", priorityLabels[ticket.priority]],
      ].map(([label, value]) => <div key={label}><dt className="workspace-section-label">{label}</dt><dd className="mt-1 break-words">{value}</dd></div>)}</dl></Card>
      <SlaPanel ticketId={id} />
      <Card><h3 className="text-base font-semibold">Ações operacionais</h3><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="mb-1 text-sm font-medium">Responsável</p><select aria-label="Transferir responsável" className="workspace-select" value={ticket.assignedToUserId ?? ""} disabled={busy} onChange={(event) => void action("Responsável atualizado", () => ticketService.assign(id, event.target.value))}><option value="" disabled>Sem responsável</option>{demoOperators.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select>{!ticket.assignedToUserId && <button type="button" disabled={busy} className="workspace-button-secondary mt-2" onClick={() => void action("Chamado assumido", () => ticketService.assume(id))}>Assumir chamado</button>}</div>
        <label className="text-sm font-medium">Prioridade<select className="workspace-select mt-1" value={ticket.priority} disabled={busy} onChange={(event) => void action("Prioridade atualizada", () => ticketService.changePriority(id, event.target.value as TicketPriority))}>{priorities.map((item) => <option key={item} value={item}>{priorityLabels[item]}</option>)}</select></label>
        <label className="text-sm font-medium">Categoria<select className="workspace-select mt-1" value={ticket.category} disabled={busy} onChange={(event) => void action("Categoria atualizada", () => ticketService.changeCategory(id, event.target.value as TicketCategory))}>{categories.map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></label>
        <div><label className="text-sm font-medium" htmlFor="next-status">Próximo status</label><select id="next-status" className="workspace-select mt-1" defaultValue="" key={ticket.status} disabled={busy} onChange={(event) => { const next = event.target.value as TicketStatus; if (!["RESOLVED", "REOPENED"].includes(next)) void action("Status atualizado", () => ticketService.changeStatus(id, next)); }}><option value="">Selecione</option>{allowedTransitions(ticket.status).filter((item) => !["RESOLVED", "REOPENED"].includes(item)).map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></div>
      </div>{allowedTransitions(ticket.status).some((item) => ["RESOLVED", "REOPENED"].includes(item)) && <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border)] pt-4"><label className="text-sm font-medium">Motivo da resolução ou reabertura<textarea className="workspace-textarea mt-1 min-h-20" value={reason} maxLength={2000} onChange={(event) => setReason(event.target.value)} placeholder="Descreva a solução ou por que o chamado foi reaberto" /></label><div className="flex flex-wrap gap-2">{allowedTransitions(ticket.status).filter((item) => ["RESOLVED", "REOPENED"].includes(item)).map((next) => <button key={next} type="button" disabled={busy || !reason.trim()} className="workspace-button-primary" onClick={() => void action(next === "RESOLVED" ? "Chamado resolvido" : "Chamado reaberto", async () => { await ticketService.changeStatus(id, next, reason); setReason(""); })}>{next === "RESOLVED" ? "Resolver chamado" : "Reabrir chamado"} <ArrowRight size={16} /></button>)}</div></div>}
      {formError && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{formError}</p>}</Card>
      <section aria-label="Timeline operacional" className="space-y-3"><h3 className="text-lg font-semibold">Conversa e timeline operacional</h3>{timeline.map((entry) => entry.event ? <div key={entry.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] px-4 py-3 text-sm"><span className="font-semibold">{entry.event.actorName ?? entry.event.actorUserId ?? "Sistema"}</span> · {entry.event.description} {entry.event.newStatus && <StatusBadge status={entry.event.newStatus} />} <span className="text-xs text-[var(--text-secondary)]">· {formatDate(entry.date)}</span></div> : entry.message && <Card key={entry.id} className={entry.message.visibility === "INTERNAL_NOTE" ? "border-l-4 border-l-amber-600 bg-amber-50" : "border-l-4 border-l-[var(--accent)]"}><div className="flex flex-wrap items-center gap-2"><strong className="text-sm">{entry.message.authorName}</strong><Badge tone={entry.message.visibility === "INTERNAL_NOTE" ? "warning" : "info"}>{entry.message.visibility === "INTERNAL_NOTE" ? "Nota interna · cliente não vê" : "Mensagem pública"}</Badge><time dateTime={entry.date} className="ml-auto text-xs text-[var(--text-secondary)]">{formatDate(entry.date)}</time></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{entry.message.body}</p>{entry.message.attachments.map((file) => <button key={file.id} className="workspace-button-secondary mt-3 mr-2" type="button" onClick={() => void download(entry.message!, file.id)}>Baixar {file.originalFilename}</button>)}</Card>)}</section>
      <Card className={mode === "INTERNAL_NOTE" ? "border-amber-500 bg-amber-50" : ""}><h3 className="text-base font-semibold">Registrar interação</h3><div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Visibilidade da mensagem"><button type="button" aria-pressed={mode === "PUBLIC_REPLY"} className={mode === "PUBLIC_REPLY" ? "workspace-button-primary" : "workspace-button-secondary"} onClick={() => { setMode("PUBLIC_REPLY"); setBody(""); setAttachments([]); }}>Resposta ao cliente</button><button type="button" aria-pressed={mode === "INTERNAL_NOTE"} className={mode === "INTERNAL_NOTE" ? "workspace-button-primary !border-amber-700 !bg-amber-700" : "workspace-button-secondary"} onClick={() => { setMode("INTERNAL_NOTE"); setBody(""); setAttachments([]); }}>Nota interna</button></div><p className={`mt-3 rounded-lg p-3 text-sm font-semibold ${mode === "INTERNAL_NOTE" ? "bg-amber-100 text-amber-900" : "bg-[var(--accent-soft)] text-[var(--accent)]"}`} role="status">{mode === "INTERNAL_NOTE" ? "Nota interna. O cliente não verá esta mensagem nem seus anexos." : "Resposta ao cliente. Esta mensagem e seus anexos ficarão visíveis para o cliente."}</p>
        {mode === "PUBLIC_REPLY" && ["RESOLVED", "CLOSED"].includes(ticket.status) ? <p className="mt-4 text-sm text-[var(--text-secondary)]">Reabra o chamado pela ação operacional antes de responder ao cliente.</p> : <form onSubmit={(event) => void sendMessage(event)} className="mt-4 space-y-4"><label className="block text-sm font-medium">{mode === "INTERNAL_NOTE" ? "Texto da nota interna" : "Texto da resposta pública"}<textarea className="workspace-textarea mt-1 min-h-32" required maxLength={10000} value={body} onChange={(event) => setBody(event.target.value)} /></label><AttachmentPicker value={attachments} onChange={setAttachments} onError={setFormError} disabled={busy} /><button className="workspace-button-primary" disabled={busy} type="submit"><Send size={17} />{busy ? "Salvando..." : mode === "INTERNAL_NOTE" ? "Salvar nota interna" : "Enviar resposta ao cliente"}</button></form>}
      </Card></>}
  </div></AppShell>;
}
export default function InternalTicketPage({ params }: { params: Promise<{ ticketId: string }> }) { const { ticketId } = use(params); return <RequireAuth roles={["SUPPORT", "ADMIN"]}><InternalDetail id={ticketId} /></RequireAuth>; }
