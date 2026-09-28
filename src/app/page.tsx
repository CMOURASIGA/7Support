"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { RequireAuth } from "@/features/auth/require-auth";
import { useAuth } from "@/features/auth/auth-context";
import { useTickets } from "@/features/tickets/use-tickets";
import { NewTicketLink, PageHeading, RecentTickets, TicketFeedback, TicketQuickView } from "@/components/tickets/ticket-ui";
import type { Ticket } from "@/features/tickets/types";
import { useInternalTickets } from "@/features/tickets/use-internal-tickets";
import { InternalQuickView, InternalTicketActions } from "@/components/support/support-ui";
import { ticketService } from "@/services/tickets/service";
import { useToast } from "@/components/ui/toast";

function ClientHome() {
  const { user, client, products } = useAuth();
  const { tickets, loading, error, refresh } = useTickets();
  const [quickView, setQuickView] = useState<Ticket | null>(null);
  const metrics = [
    { label: "Chamados abertos", count: tickets.filter((item) => item.status === "OPEN").length },
    { label: "Em atendimento", count: tickets.filter((item) => ["IN_PROGRESS", "UNDER_ANALYSIS", "REOPENED"].includes(item.status)).length },
    { label: "Aguardando você", count: tickets.filter((item) => item.status === "WAITING_CUSTOMER").length },
    { label: "Resolvidos", count: tickets.filter((item) => item.status === "RESOLVED").length },
  ];
  return <AppShell><div className="mx-auto w-full max-w-7xl space-y-5">
    <PageHeading eyebrow="Área do cliente" title={`Olá, ${user?.displayName ?? "cliente"}`} description={`Acompanhe os chamados de ${client?.displayName ?? "sua organização"} e abra novas solicitações para seus produtos autorizados.`} action={<NewTicketLink />} />
    <TicketFeedback loading={loading} error={error} retry={() => void refresh()} />
    {!loading && !error && <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <Card key={metric.label}><p className="workspace-section-label">{metric.label}</p><p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{metric.count}</p></Card>)}</div><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><Card><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-base font-semibold">Chamados recentes</h3><p className="text-sm text-[var(--text-secondary)]">Últimas atualizações</p></div><Link href="/tickets" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]">Ver todos <ArrowRight size={16} /></Link></div>{tickets.length ? <RecentTickets tickets={tickets.slice(0, 4)} onQuickView={setQuickView} /> : <EmptyState />}</Card><Card><h3 className="text-base font-semibold">Contexto autorizado</h3><p className="mt-3 text-sm text-[var(--text-secondary)]">Perfil: <Badge tone="info">CLIENT</Badge></p><p className="workspace-section-label mt-5">Produtos disponíveis</p><ul className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">{products.map((product) => <li key={product.id}>{product.displayName}</li>)}</ul></Card></div></>}
    <TicketQuickView ticket={quickView} onClose={() => setQuickView(null)} />
  </div></AppShell>;
}
function InternalHome() {
  const { user } = useAuth();
  const { tickets, loading, error, refresh } = useInternalTickets();
  const { notify } = useToast(); const [quickId, setQuickId] = useState<string | null>(null);
  const metrics = [
    { label: "Novos", count: tickets.filter((item) => item.status === "OPEN").length },
    { label: "Em atendimento", count: tickets.filter((item) => item.status === "IN_PROGRESS").length },
    { label: "Aguardando cliente", count: tickets.filter((item) => item.status === "WAITING_CUSTOMER").length },
    { label: "Em análise", count: tickets.filter((item) => item.status === "UNDER_ANALYSIS").length },
    { label: "Resolvidos", count: tickets.filter((item) => item.status === "RESOLVED").length },
    { label: "Sem responsável", count: tickets.filter((item) => !item.assignedToUserId).length },
    { label: "Atribuídos a você", count: tickets.filter((item) => item.assignedToUserId === user?.id).length },
  ];
  async function assume(ticket: Ticket) { try { await ticketService.assume(ticket.id); notify(`${ticket.publicCode} assumido.`); await refresh(); } catch (cause) { notify(cause instanceof Error ? cause.message : "Falha ao assumir.", "error"); } }
  return <AppShell><div className="mx-auto w-full max-w-7xl space-y-5"><PageHeading eyebrow="Operação interna" title="Central de atendimento" description={`Sessão ${user?.role ?? "interna"} · Indicadores da base local de chamados.`} action={<Link className="workspace-button-primary" href="/support/queue">Abrir fila <ArrowRight size={16} /></Link>} /><TicketFeedback loading={loading} error={error} retry={() => void refresh()} />{!loading && !error && <><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map((metric) => <Card key={metric.label}><p className="workspace-section-label">{metric.label}</p><p className="mt-3 text-3xl font-semibold">{metric.count}</p></Card>)}</div><Card><div className="flex items-center justify-between gap-2"><h3 className="text-base font-semibold">Chamados recentes</h3><Link className="text-sm font-semibold text-[var(--accent)]" href="/support/tickets">Ver todos</Link></div><div className="mt-4 space-y-3">{tickets.slice(0, 5).map((ticket) => <div key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3"><div><p className="font-semibold">{ticket.publicCode} · {ticket.subject}</p><p className="text-xs text-[var(--text-secondary)]">{ticket.clientNameSnapshot} · {ticket.productNameSnapshot}</p></div><InternalTicketActions ticket={ticket} onQuickView={(item) => setQuickId(item.id)} onAssume={(item) => void assume(item)} /></div>)}</div></Card></>}<InternalQuickView ticket={tickets.find((item) => item.id === quickId) ?? null} onClose={() => setQuickId(null)} /></div></AppShell>;
}
export default function Home() { return <RequireAuth><HomeContent /></RequireAuth>; }
function HomeContent() { const { user } = useAuth(); return user?.role === "CLIENT" ? <ClientHome /> : <InternalHome />; }
