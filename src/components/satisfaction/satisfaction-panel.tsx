"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { satisfactionService } from "@/services/satisfaction/service";
import type { Opportunity } from "@/services/satisfaction/types";
import { formatDate } from "@/components/tickets/ticket-ui";
export function SatisfactionPanel({ ticketId }: { ticketId: string }) {
  const { user } = useAuth(); const client = user?.role === "CLIENT"; const { notify } = useToast();
  const [items, setItems] = useState<Opportunity[]>([]); const [error, setError] = useState(""); const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState<"" | "yes" | "no">(""); const [rating, setRating] = useState(""); const [comment, setComment] = useState(""); const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => { try { setItems(await satisfactionService.get(ticketId)); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao carregar avaliação."); } finally { setLoading(false); } }, [ticketId]);
  useEffect(() => { void refresh(); return satisfactionService.subscribe(() => void refresh()); }, [refresh]);
  const current = items.at(-1);
  useEffect(() => { setAnswer(""); setRating(""); setComment(""); }, [current?.resolutionEventId]);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || !current || !answer) return; setBusy(true); setError("");
    try { await satisfactionService.submit(ticketId, { resolutionEventId: current.resolutionEventId, clientRequestId: crypto.randomUUID(), resolvedAnswer: answer === "yes", rating: rating ? Number(rating) : null, comment: comment.trim() || null }); notify("Avaliação enviada. Obrigado pelo retorno."); await refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível enviar. Tente novamente."); }
    finally { setBusy(false); }
  }
  if (!loading && !error && !items.length) return null;
  return <Card><section aria-label="Avaliação do atendimento" className="space-y-4"><h3 className="text-base font-semibold">Avaliação do atendimento</h3>{loading && <p role="status" className="text-sm">Carregando avaliação...</p>}{error && <div role="alert" className="text-sm text-[var(--danger)]">{error} <button className="underline" onClick={() => void refresh()}>Tentar novamente</button></div>}
    {client && current?.status === "ELIGIBLE" && <form onSubmit={event => void submit(event)} className="space-y-4"><fieldset disabled={busy}><legend className="mb-2 text-sm font-semibold">Seu problema foi resolvido?</legend><div className="flex gap-5">{([["yes", "Sim"], ["no", "Não"]] as const).map(([value, label]) => <label className="flex gap-2 text-sm" key={value}><input type="radio" name="resolved-answer" required checked={answer === value} onChange={() => setAnswer(value)} />{label}</label>)}</div></fieldset><label className="block text-sm font-medium">Nota do atendimento (opcional)<select className="workspace-select mt-1" value={rating} disabled={busy} onChange={event => setRating(event.target.value)}><option value="">Sem nota</option>{[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{"★".repeat(value)} ({value})</option>)}</select></label><label className="block text-sm font-medium">Comentário (opcional)<textarea className="workspace-textarea mt-1 min-h-24" maxLength={2000} value={comment} disabled={busy} onChange={event => setComment(event.target.value)} /></label><p className="text-xs text-[var(--text-secondary)]">A avaliação enviada não pode ser editada. Sua resposta não altera o status do chamado.</p><button type="submit" className="workspace-button-primary" disabled={busy || !answer}>{busy ? "Enviando..." : "Enviar avaliação"}</button></form>}
    {[...items].reverse().map((item, index) => item.feedback ? <div key={item.resolutionEventId} className="rounded-xl border border-[var(--border)] p-3 text-sm"><p className="font-semibold">Avaliação enviada{index ? " · atendimento anterior" : ""}</p><p className="mt-2">Problema resolvido: {item.feedback.resolvedAnswer ? "Sim" : "Não"}</p><p>Nota: {item.feedback.rating === null ? "Não informada" : `${item.feedback.rating} de 5`}</p>{item.feedback.comment && <p className="mt-2 whitespace-pre-wrap break-words">{item.feedback.comment}</p>}<p className="mt-2 text-xs text-[var(--text-secondary)]">{formatDate(item.feedback.submittedAt)}</p></div> : item.status === "CANCELLED_BY_REOPEN" ? <p key={item.resolutionEventId} className="text-sm text-[var(--text-secondary)]">A avaliação deste atendimento foi cancelada pela reabertura. Uma nova resolução permitirá avaliar novamente.</p> : !client ? <p key={item.resolutionEventId} className="text-sm">Aguardando avaliação do solicitante.</p> : null)}
  </section></Card>;
}
