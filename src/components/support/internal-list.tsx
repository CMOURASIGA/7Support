"use client";

import { useMemo, useState } from "react";
import { SlaBadge, useQueueSla } from "@/components/sla/sla-panel";
import { stateLabels, type SlaState } from "@/services/sla/types";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeading, StatusBadge, TicketFeedback, formatDate } from "@/components/tickets/ticket-ui";
import { EmptyState } from "@/components/ui/states";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useInternalTickets } from "@/features/tickets/use-internal-tickets";
import { priorities, priorityLabels, statusLabels, ticketStatuses, type Ticket, type TicketPriority, type TicketStatus } from "@/features/tickets/types";
import { ticketService } from "@/services/tickets/service";
import { demoOperators, operatorName } from "@/services/tickets/operators";
import { ageOf, InternalQuickView, InternalTicketActions, PriorityBadge } from "@/components/support/support-ui";

export function InternalList({ all = false }: { all?: boolean }) {
  const { tickets, loading, error, refresh } = useInternalTickets();
  const sla = useQueueSla();
  const [slaState, setSlaState] = useState<SlaState | "">("");
  const { notify } = useToast();
  const [query, setQuery] = useState(""); const [status, setStatus] = useState<TicketStatus | "">("");
  const [priority, setPriority] = useState<TicketPriority | "">(""); const [product, setProduct] = useState("");
  const [client, setClient] = useState(""); const [assignee, setAssignee] = useState("");
  const [quickId, setQuickId] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const products = useMemo(() => [...new Map(tickets.map((item) => [item.productId, item.productNameSnapshot])).entries()], [tickets]);
  const clients = useMemo(() => [...new Map(tickets.map((item) => [item.clientId, item.clientNameSnapshot])).entries()], [tickets]);
  const filtered = useMemo(() => tickets.filter((ticket) => {
    if (!all && ["RESOLVED", "CLOSED"].includes(ticket.status)) return false;
    const text = `${ticket.publicCode} ${ticket.subject} ${ticket.clientNameSnapshot} ${ticket.requesterNameSnapshot}`.toLocaleLowerCase("pt-BR");
    return (!slaState || sla.views[ticket.id]?.state === slaState) && (!query.trim() || text.includes(query.trim().toLocaleLowerCase("pt-BR"))) && (!status || ticket.status === status)
      && (!priority || ticket.priority === priority) && (!product || ticket.productId === product)
      && (!client || ticket.clientId === client) && (!assignee || (assignee === "unassigned" ? !ticket.assignedToUserId : ticket.assignedToUserId === assignee));
  }), [tickets, all, query, status, priority, product, client, assignee, slaState, sla.views]);
  async function assume(ticket: Ticket) {
    setBusy(true);
    try { await ticketService.assume(ticket.id); notify(`${ticket.publicCode} assumido com sucesso.`); await refresh(); }
    catch (cause) { notify(cause instanceof Error ? cause.message : "Falha ao assumir.", "error"); }
    finally { setBusy(false); }
  }
  const actions = (ticket: Ticket) => <InternalTicketActions ticket={ticket} onQuickView={(value) => setQuickId(value.id)} onAssume={(value) => void assume(value)} busy={busy} />;
  return <AppShell><div className="mx-auto w-full max-w-7xl space-y-5"><PageHeading eyebrow="Operação interna" title={all ? "Todos os chamados" : "Fila de atendimento"} description={all ? "Histórico completo de Alpha e Beta." : "Chamados ativos para triagem e atendimento."} /><TicketFeedback loading={loading} error={error} retry={() => void refresh()} />
    {!loading && !error && <><section aria-label="Filtros da fila" className="workspace-card grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      <label className="text-sm font-medium">Busca<div className="relative mt-1"><Search size={17} className="absolute left-3 top-3 text-[var(--text-tertiary)]" /><input className="workspace-input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Código, assunto, cliente, solicitante" /></div></label>
      <label className="text-sm font-medium">Status<select className="workspace-select mt-1" value={status} onChange={(event) => setStatus(event.target.value as TicketStatus | "")}><option value="">Todos</option>{ticketStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label>
      <label className="text-sm font-medium">Prioridade<select className="workspace-select mt-1" value={priority} onChange={(event) => setPriority(event.target.value as TicketPriority | "")}><option value="">Todas</option>{priorities.map((item) => <option key={item} value={item}>{priorityLabels[item]}</option>)}</select></label>
      <label className="text-sm font-medium">Produto<select className="workspace-select mt-1" value={product} onChange={(event) => setProduct(event.target.value)}><option value="">Todos</option>{products.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="text-sm font-medium">Cliente<select className="workspace-select mt-1" value={client} onChange={(event) => setClient(event.target.value)}><option value="">Todos</option>{clients.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label className="text-sm font-medium">Responsável<select className="workspace-select mt-1" value={assignee} onChange={(event) => setAssignee(event.target.value)}><option value="">Todos</option><option value="unassigned">Sem responsável</option>{demoOperators.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
      <label className="text-sm font-medium">Situação SLA<select className="workspace-select mt-1" value={slaState} onChange={event => setSlaState(event.target.value as SlaState | "")}><option value="">Todas</option>{Object.entries(stateLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <button className="workspace-button-secondary w-fit" type="button" onClick={() => { setQuery(""); setStatus(""); setPriority(""); setProduct(""); setClient(""); setAssignee(""); setSlaState(""); }}>Limpar filtros</button>
    </section><p className="text-sm text-[var(--text-secondary)]">{tickets.filter(ticket => (all || !["RESOLVED", "CLOSED"].includes(ticket.status)) && sla.views[ticket.id]?.state === "BREACHED").length} com prazo excedido · {filtered.length} chamado{filtered.length === 1 ? "" : "s"}</p>
      {sla.error && <p role="alert" className="text-sm text-[var(--danger)]">{sla.error} <button onClick={() => void sla.refresh()} className="underline">Tentar novamente</button></p>}
      {filtered.length ? <><div className="workspace-card hidden overflow-x-auto lg:block"><table className="w-full min-w-[1250px] text-left text-sm"><thead className="bg-[var(--bg-muted)] text-xs uppercase text-[var(--text-secondary)]"><tr>{["Código", "Cliente", "Solicitante", "Produto", "Assunto", "Prioridade", "Status", "SLA", "Responsável", "Atualizado", "Idade", "Ações"].map((head) => <th key={head} className="px-3 py-3">{head}</th>)}</tr></thead><tbody>{filtered.map((ticket) => <tr key={ticket.id} className="border-t border-[var(--border)]"><td className="px-3 py-3 font-semibold">{ticket.publicCode}</td><td className="px-3 py-3">{ticket.clientNameSnapshot}</td><td className="px-3 py-3">{ticket.requesterNameSnapshot}</td><td className="px-3 py-3">{ticket.productNameSnapshot}</td><td className="max-w-56 truncate px-3 py-3" title={ticket.subject}>{ticket.subject}</td><td className="px-3 py-3"><PriorityBadge priority={ticket.priority} /></td><td className="px-3 py-3"><StatusBadge status={ticket.status} /></td><td className="px-3 py-3"><SlaBadge state={sla.views[ticket.id]?.state} /></td><td className="px-3 py-3">{operatorName(ticket.assignedToUserId)}</td><td className="whitespace-nowrap px-3 py-3">{formatDate(ticket.updatedAt)}</td><td className="px-3 py-3">{ageOf(ticket)}</td><td className="px-3 py-3">{actions(ticket)}</td></tr>)}</tbody></table></div>
        <div className="grid gap-3 lg:hidden">{filtered.map((ticket) => <Card key={ticket.id}><div className="flex flex-wrap items-center gap-2"><strong>{ticket.publicCode}</strong><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /><SlaBadge state={sla.views[ticket.id]?.state} /></div><p className="mt-2 font-semibold">{ticket.subject}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{ticket.clientNameSnapshot} · {ticket.productNameSnapshot}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{operatorName(ticket.assignedToUserId)} · {ageOf(ticket)}</p><div className="mt-3">{actions(ticket)}</div></Card>)}</div></> : <EmptyState />}</>}
    <InternalQuickView ticket={tickets.find((item) => item.id === quickId) ?? null} onClose={() => setQuickId(null)} />
  </div></AppShell>;
}
