"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { RequireAuth } from "@/features/auth/require-auth";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { AttachmentPicker } from "@/components/tickets/attachment-picker";
import { BackLink, PageHeading } from "@/components/tickets/ticket-ui";
import { ticketTypes, type TicketType, type TicketImpact, impacts, type AttachmentInput, type NewTicketInput, typeLabels, impactLabels } from "@/features/tickets/types";
import { ticketService } from "@/services/tickets/service";

function NewTicket() {
  const { user, client, products } = useAuth();
  const router = useRouter(); const { notify } = useToast();
  const [form, setForm] = useState<NewTicketInput>({ productId: "", type: "QUESTION", impact: "LOW_IMPACT", subject: "", description: "", attachments: [] });
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  function change<K extends keyof NewTicketInput>(key: K, value: NewTicketInput[K]) { setForm((previous) => ({ ...previous, [key]: value })); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try { const ticket = await ticketService.create(form); notify(`${ticket.publicCode} aberto com sucesso. O chamado está salvo neste navegador.`); router.push(`/tickets/${ticket.id}`); }
    catch (cause) { const message = cause instanceof Error ? cause.message : "Não foi possível abrir o chamado."; setError(message); notify(message, "error"); }
    finally { setBusy(false); }
  }
  return <AppShell><div className="mx-auto w-full max-w-4xl space-y-5"><BackLink /><PageHeading eyebrow="Atendimento" title="Novo chamado" description="Conte o que aconteceu. Sua identidade já está vinculada à sessão." /><form onSubmit={(event) => void submit(event)} className="space-y-5"><Card><h3 className="text-base font-semibold">Identidade do solicitante</h3><div className="mt-4 grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium">Cliente<input className="workspace-input mt-1 bg-[var(--bg-muted)]" value={client?.displayName ?? ""} readOnly /></label><label className="text-sm font-medium">Solicitante<input className="workspace-input mt-1 bg-[var(--bg-muted)]" value={user?.displayName ?? ""} readOnly /></label><label className="text-sm font-medium">E-mail para contato<input className="workspace-input mt-1 bg-[var(--bg-muted)]" value={user?.email ?? ""} readOnly /></label></div></Card><Card><h3 className="text-base font-semibold">Dados do chamado</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Produto autorizado<select className="workspace-select mt-1" required value={form.productId} onChange={(event) => change("productId", event.target.value)}><option value="">Selecione um produto</option>{products.map((product) => <option key={product.id} value={product.id}>{product.displayName}</option>)}</select></label><label className="text-sm font-medium">Tipo de solicitação<select className="workspace-select mt-1" value={form.type} onChange={(event) => change("type", event.target.value as TicketType)}>{ticketTypes.map((type) => <option key={type} value={type}>{typeLabels[type]}</option>)}</select></label><label className="text-sm font-medium sm:col-span-2">Assunto<input className="workspace-input mt-1" required maxLength={160} value={form.subject} onChange={(event) => change("subject", event.target.value)} placeholder="Resuma sua solicitação" /></label><label className="text-sm font-medium sm:col-span-2">Descrição<textarea className="workspace-textarea mt-1 min-h-36" required maxLength={10000} value={form.description} onChange={(event) => change("description", event.target.value)} placeholder="Descreva o contexto e o resultado esperado" /></label><label className="text-sm font-medium sm:col-span-2">Impacto<select className="workspace-select mt-1" value={form.impact} onChange={(event) => change("impact", event.target.value as TicketImpact)}>{impacts.map((impact) => <option key={impact} value={impact}>{impactLabels[impact]}</option>)}</select></label><div className="sm:col-span-2"><p className="mb-2 text-sm font-medium">Anexos</p><AttachmentPicker value={form.attachments} onChange={(files: AttachmentInput[]) => change("attachments", files)} onError={setError} disabled={busy} /></div></div></Card>{error && <p role="alert" className="rounded-xl border border-[#f09595] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</p>}<div className="flex justify-end"><button type="submit" disabled={busy} className="workspace-button-primary"><Send size={17} />{busy ? "Salvando..." : "Abrir chamado"}</button></div></form></div></AppShell>;
}
export default function NewTicketPage() { return <RequireAuth roles={["CLIENT"]}><NewTicket /></RequireAuth>; }
