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
  return <AppShell><div className="mx-auto max-w-7xl space-y-5"><PageHeading eyebrow="Operação interna" title="Central de atendimento" description={`Sessão ${user?.role ?? "interna"} ativa. A fila e as ações internas entram na SPEC 04.`} /><Card><p className="text-sm text-[var(--text-secondary)]">O Ticket Core desta etapa disponibiliza os fluxos do cliente. Os registros internos ainda não possuem fila operacional.</p></Card></div></AppShell>;
}
export default function Home() { return <RequireAuth><HomeContent /></RequireAuth>; }
function HomeContent() { const { user } = useAuth(); return user?.role === "CLIENT" ? <ClientHome /> : <InternalHome />; }
