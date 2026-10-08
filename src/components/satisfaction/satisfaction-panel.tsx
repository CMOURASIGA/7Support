"use client";
import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, MessageSquareText, Star } from "lucide-react";
import { useSatisfaction } from "@/features/satisfaction/use-satisfaction";
import { satisfactionService } from "@/services/satisfaction/service";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export function SatisfactionPanel({ ticketId }: { ticketId: string }) {
  const { opportunities, loading, error, refresh } = useSatisfaction(ticketId); const { notify } = useToast();
  const available = [...opportunities].reverse().find(item => item.eligible); const submitted = opportunities.filter(item => item.satisfaction);
  const [answer, setAnswer] = useState<"" | "yes" | "no">(""); const [rating, setRating] = useState(""); const [comment, setComment] = useState(""); const [busy, setBusy] = useState(false);
  const requestId = useMemo(() => crypto.randomUUID(), []);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!available || !answer || busy) return; setBusy(true);
    try { await satisfactionService.submit(ticketId, { resolutionEventId: available.resolutionEventId, clientRequestId: requestId, resolvedAnswer: answer === "yes", rating: rating ? Number(rating) : null, comment }); notify("Avaliação enviada. Obrigado pelo retorno."); await refresh(); }
    catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível enviar a avaliação.", "error"); } finally { setBusy(false); }
  }
  if (loading) return <Card><p className="text-sm text-[var(--text-secondary)]">Carregando avaliação...</p></Card>;
  if (error) return <Card><p role="alert" className="text-sm text-[var(--danger)]">{error}</p><button className="workspace-button-secondary mt-3" onClick={() => void refresh()}>Tentar novamente</button></Card>;
  if (!available && !submitted.length) return null;
  return <Card><div className="flex items-start gap-3"><div className="rounded-xl bg-[var(--accent-soft)] p-2 text-[var(--accent)]"><MessageSquareText size={20} /></div><div><h3 className="font-semibold">Avaliação do atendimento</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Uma avaliação por ciclo de resolução. Após o envio, ela não pode ser alterada.</p></div></div>
    {available && <form className="mt-5 space-y-4 border-t border-[var(--border)] pt-5" onSubmit={submit}><fieldset><legend className="text-sm font-semibold">Seu chamado foi resolvido? *</legend><div className="mt-2 flex gap-2"><button type="button" aria-pressed={answer === "yes"} onClick={() => setAnswer("yes")} className={answer === "yes" ? "workspace-button-primary" : "workspace-button-secondary"}>Sim</button><button type="button" aria-pressed={answer === "no"} onClick={() => setAnswer("no")} className={answer === "no" ? "workspace-button-primary" : "workspace-button-secondary"}>Não</button></div></fieldset>
      <label className="block text-sm font-medium">Rating opcional<select className="workspace-input mt-1" value={rating} onChange={event => setRating(event.target.value)}><option value="">Não informar</option>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value} estrela{value > 1 ? "s" : ""}</option>)}</select></label>
      <label className="block text-sm font-medium">Comentário opcional<textarea className="workspace-textarea mt-1 min-h-24" maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} /><span className="mt-1 block text-right text-xs text-[var(--text-secondary)]">{comment.length}/2.000</span></label>
      <button className="workspace-button-primary" disabled={!answer || busy}><CheckCircle2 size={17} />{busy ? "Enviando..." : "Confirmar avaliação"}</button></form>}
    {submitted.length > 0 && <div className="mt-5 space-y-3 border-t border-[var(--border)] pt-5"><p className="workspace-section-label">Avaliações enviadas</p>{submitted.slice().reverse().map(item => <div key={item.resolutionEventId} className="rounded-xl bg-[var(--bg-muted)] p-3 text-sm"><div className="flex flex-wrap items-center gap-2 font-medium"><CheckCircle2 size={16} className="text-[var(--success)]" />Resolvido: {item.satisfaction!.resolvedAnswer ? "Sim" : "Não"}{item.satisfaction!.rating && <span className="inline-flex items-center gap-1"><Star size={14} />{item.satisfaction!.rating}/5</span>}</div>{item.satisfaction!.comment && <p className="mt-2 whitespace-pre-wrap text-[var(--text-secondary)]">{item.satisfaction!.comment}</p>}<p className="mt-2 text-xs text-[var(--text-secondary)]">Enviada em {new Date(item.satisfaction!.submittedAt).toLocaleString("pt-BR")}{item.cycleNumber ? ` · Ciclo ${item.cycleNumber}` : ""}</p></div>)}</div>}
  </Card>;
}
