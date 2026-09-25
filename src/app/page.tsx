"use client";

import { useState } from "react";
import { ArrowRight, Eye, PlusCircle } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ActionButton } from "@/components/ui/action-button";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { RequireAuth } from "@/features/auth/require-auth";
import { useAuth } from "@/features/auth/auth-context";

const cards = [{ label: "Chamados abertos", value: "0" }, { label: "Aguardando atendimento", value: "0" }, { label: "Aguardando você", value: "0" }, { label: "Resolvidos", value: "0" }];

function FoundationHome() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { notify } = useToast();
  const { user, client, products } = useAuth();
  return <AppShell><div className="mx-auto w-full max-w-7xl space-y-5">
    <section className="page-hero"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-3xl"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[var(--accent)]">{user?.role} · Identidade local</p><h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{user?.role === "CLIENT" ? `Olá, ${user.displayName}` : "Central de atendimento"}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{client ? `Contexto isolado: ${client.displayName}.` : "Contexto interno autorizado para o papel autenticado."}</p></div>{user?.role === "CLIENT" && <ActionButton label="Novo chamado" icon={<PlusCircle size={18} />} variant="primary" onClick={() => notify("A abertura de chamados será entregue na SPEC 03.", "success")} />}</div></section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Card key={card.label}><p className="workspace-section-label">{card.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{card.value}</p><div className="mt-3"><Badge tone="neutral">Aguardando Ticket Core</Badge></div></Card>)}</div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><Card><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold text-[var(--text-primary)]">Chamados recentes</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">O histórico aparecerá aqui após a SPEC 03.</p></div><ActionButton compact label="Visualizar resumo" icon={<Eye size={18} />} onClick={() => setDrawerOpen(true)} /></div><div className="mt-5"><EmptyState /></div></Card><Card><h3 className="text-base font-semibold text-[var(--text-primary)]">Contexto autorizado</h3><p className="mt-3 text-sm text-[var(--text-secondary)]">Perfil: <Badge tone="info">{user?.role ?? "-"}</Badge></p><p className="workspace-section-label mt-5">Produtos disponíveis</p><ul className="mt-2 space-y-2 text-sm text-[var(--text-secondary)]">{products.map((product) => <li key={product.id}>{product.displayName}</li>)}</ul></Card></div>
    <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Resumo de identidade"><Badge tone="info">SPEC 02</Badge><h3 className="mt-4 text-lg font-semibold">Tenant e papel resolvidos</h3><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">A sessão local recupera o papel, o cliente vinculado e os produtos autorizados. A regra real de backend e RLS será ativada com o Supabase conforme documentação da infraestrutura.</p><button type="button" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent)]" onClick={() => setDrawerOpen(false)}>Voltar <ArrowRight size={16} /></button></Drawer>
  </div></AppShell>;
}

export default function Home() { return <RequireAuth><FoundationHome /></RequireAuth>; }
