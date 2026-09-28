"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { RequireAuth } from "@/features/auth/require-auth";
import { useAuth } from "@/features/auth/auth-context";
import { useTickets } from "@/features/tickets/use-tickets";
import { statusLabels, ticketStatuses, type Ticket, type TicketStatus } from "@/features/tickets/types";
import { NewTicketLink, PageHeading, RecentTickets, TicketFeedback, TicketQuickView, TicketRow } from "@/components/tickets/ticket-ui";
import { EmptyState } from "@/components/ui/states";

function TicketList() {
  const { products } = useAuth();
  const { tickets, loading, error, refresh } = useTickets();
  const [query, setQuery] = useState(""); const [status, setStatus] = useState<TicketStatus | "">(""); const [productId, setProductId] = useState(""); const [period, setPeriod] = useState(""); const [quickView, setQuickView] = useState<Ticket | null>(null);
  const filtered = useMemo(() => tickets.filter((ticket) => {
    const search = query.trim().toLocaleLowerCase("pt-BR");
    if (search && !`${ticket.publicCode} ${ticket.subject}`.toLocaleLowerCase("pt-BR").includes(search)) return false;
    if (status && ticket.status !== status) return false;
    if (productId && ticket.productId !== productId) return false;
    if (period && new Date(ticket.updatedAt).getTime() < Date.now() - Number(period) * 86400000) return false;
    return true;
  }), [tickets, query, status, productId, period]);
  return <AppShell><div className="mx-auto w-full max-w-7xl space-y-5"><PageHeading eyebrow="Atendimento" title="Meus chamados" description="Busque, acompanhe ou abra uma solicitação." action={<NewTicketLink />} /><TicketFeedback loading={loading} error={error} retry={() => void refresh()} />{!loading && !error && <><section className="workspace-card grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Filtros de chamados"><label className="text-sm font-medium">Busca<div className="relative mt-1"><Search size={17} className="absolute left-3 top-3 text-[var(--text-tertiary)]" /><input className="workspace-input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Código ou assunto" /></div></label><label className="text-sm font-medium">Status<select className="workspace-select mt-1" value={status} onChange={(event) => setStatus(event.target.value as TicketStatus | "")}><option value="">Todos</option>{ticketStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label><label className="text-sm font-medium">Produto<select className="workspace-select mt-1" value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Todos</option>{products.map((product) => <option key={product.id} value={product.id}>{product.displayName}</option>)}</select></label><label className="text-sm font-medium">Atualizados em<select className="workspace-select mt-1" value={period} onChange={(event) => setPeriod(event.target.value)}><option value="">Todo o período</option><option value="7">7 dias</option><option value="30">30 dias</option><option value="90">90 dias</option></select></label></section><p className="text-sm text-[var(--text-secondary)]">{filtered.length} chamado{filtered.length === 1 ? "" : "s"} encontrado{filtered.length === 1 ? "" : "s"}</p>{filtered.length ? <><div className="hidden overflow-x-auto workspace-card md:block"><table className="w-full min-w-[780px] text-left text-sm"><thead className="bg-[var(--bg-muted)] text-xs uppercase tracking-wide text-[var(--text-secondary)]"><tr>{["Código", "Produto", "Assunto", "Status", "Última atualização", "Ação"].map((head) => <th className="px-4 py-3 font-semibold" key={head}>{head}</th>)}</tr></thead><tbody>{filtered.map((ticket) => <TicketRow key={ticket.id} ticket={ticket} onQuickView={setQuickView} />)}</tbody></table></div><div className="md:hidden"><RecentTickets tickets={filtered} onQuickView={setQuickView} /></div></> : <EmptyState />}</>}<TicketQuickView ticket={quickView} onClose={() => setQuickView(null)} /></div></AppShell>;
}
export default function TicketsPage() { return <RequireAuth roles={["CLIENT"]}><TicketList /></RequireAuth>; }
