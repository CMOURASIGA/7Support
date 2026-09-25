"use client";

import { FormEvent, use, useState } from "react";
import { Send } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { RequireAuth } from "@/features/auth/require-auth";
import { useTicket } from "@/features/tickets/use-tickets";
import { type AttachmentInput, impactLabels, typeLabels } from "@/features/tickets/types";
import { ticketService } from "@/services/tickets/service";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { AttachmentPicker } from "@/components/tickets/attachment-picker";
import { BackLink, formatDate, PageHeading, StatusBadge, TicketFeedback } from "@/components/tickets/ticket-ui";

function TicketDetail({ id }: { id: string }) {
  const { ticket, loading, error, refresh } = useTicket(id);
  const [reply, setReply] = useState(""); const [attachments, setAttachments] = useState<AttachmentInput[]>([]); const [submitError, setSubmitError] = useState(""); const [busy, setBusy] = useState(false);
  const { notify } = useToast();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setSubmitError("");
    try { await ticketService.reply(id, { body: reply, attachments }); setReply(""); setAttachments([]); notify("Resposta salva no chamado."); await refresh(); }
    catch (cause) { const message = cause instanceof Error ? cause.message : "Não foi possível enviar a resposta."; setSubmitError(message); notify(message, "error"); }
    finally { setBusy(false); }
  }
  async function download(attachmentId: string) {
    try { const file = await ticketService.attachment(id, attachmentId); const anchor = document.createElement("a"); anchor.href = file.dataUrl; anchor.download = file.originalFilename; anchor.click(); }
    catch (cause) { notify(cause instanceof Error ? cause.message : "Anexo indisponível.", "error"); }
  }
  const canReply = ticket && !["RESOLVED", "CLOSED"].includes(ticket.status);
  const timeline = ticket ? [
    ...ticket.messages.map((message) => ({ id: message.id, date: message.createdAt, kind: "message" as const, message })),
    ...ticket.events.filter((event) => event.eventType === "STATUS_CHANGED").map((event) => ({ id: event.id, date: event.createdAt, kind: "event" as const, event })),
  ].sort((a, b) => a.date.localeCompare(b.date)) : [];
  return <AppShell><div className="mx-auto w-full max-w-5xl space-y-5"><BackLink /><TicketFeedback loading={loading} error={error} retry={() => void refresh()} />{ticket && !error && <><PageHeading eyebrow={ticket.publicCode} title={ticket.subject} description={`${ticket.productNameSnapshot} · ${typeLabels[ticket.type]}`} action={<StatusBadge status={ticket.status} />} /><Card><dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><div><dt className="workspace-section-label">Criado em</dt><dd className="mt-1">{formatDate(ticket.createdAt)}</dd></div><div><dt className="workspace-section-label">Última atualização</dt><dd className="mt-1">{formatDate(ticket.updatedAt)}</dd></div><div><dt className="workspace-section-label">Solicitante</dt><dd className="mt-1">{ticket.requesterNameSnapshot}</dd></div><div><dt className="workspace-section-label">Impacto</dt><dd className="mt-1">{impactLabels[ticket.impact]}</dd></div></dl></Card><section aria-label="Timeline do chamado" className="space-y-4"><h3 className="text-lg font-semibold">Conversa e timeline</h3>{timeline.map((entry) => entry.kind === "event" ? <div key={entry.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] px-4 py-2 text-xs text-[var(--text-secondary)]">{formatDate(entry.date)} · Status atualizado para {entry.event.newStatus && <StatusBadge status={entry.event.newStatus} />}</div> : <Card key={entry.id} className={entry.message.authorType === "CLIENT" ? "ml-0 border-l-4 border-l-[var(--brand-highlight)] sm:ml-12" : "mr-0 border-l-4 border-l-[var(--accent)] sm:mr-12"}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{entry.message.authorName} <span className="font-normal text-[var(--text-secondary)]">· {entry.message.authorType === "CLIENT" ? "Cliente" : "Suporte"}</span></p><time className="text-xs text-[var(--text-secondary)]" dateTime={entry.date}>{formatDate(entry.date)}</time></div><p className="mt-3 whitespace-pre-wrap text-sm leading-6">{entry.message.body}</p>{entry.message.attachments.length > 0 && <div className="mt-4 border-t border-[var(--border)] pt-3"><p className="workspace-section-label mb-2">Anexos</p>{entry.message.attachments.map((file) => <button key={file.id} type="button" onClick={() => void download(file.id)} className="mr-2 rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm text-[var(--accent)] hover:underline">Baixar {file.originalFilename}</button>)}</div>}</Card>)}</section>{canReply ? <Card><h3 className="text-base font-semibold">Responder ao chamado</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Sua resposta fica visível na conversa. O status só muda quando a equipe fizer a próxima atualização.</p><form onSubmit={(event) => void submit(event)} className="mt-4 space-y-4"><label className="block text-sm font-medium">Mensagem<textarea className="workspace-textarea mt-1 min-h-28" required maxLength={10000} value={reply} onChange={(event) => setReply(event.target.value)} /></label><AttachmentPicker value={attachments} onChange={setAttachments} onError={setSubmitError} disabled={busy} />{submitError && <p role="alert" className="text-sm text-[var(--danger)]">{submitError}</p>}<button className="workspace-button-primary" type="submit" disabled={busy}><Send size={17} />{busy ? "Salvando..." : "Enviar resposta"}</button></form></Card> : <Card><p className="text-sm text-[var(--text-secondary)]">Este chamado está {ticket.status === "RESOLVED" ? "resolvido" : "encerrado"}. A reabertura será definida em uma etapa posterior.</p></Card>}</>}</div></AppShell>;
}
export default function TicketDetailPage({ params }: { params: Promise<{ ticketId: string }> }) { const { ticketId } = use(params); return <RequireAuth roles={["CLIENT"]}><TicketDetail id={ticketId} /></RequireAuth>; }
