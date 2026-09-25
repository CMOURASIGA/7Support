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
  return <AppShell><div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-support-700">{user?.role} · Identidade local</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{user?.role === "CLIENT" ? `Olá, ${user.displayName}` : "Central de atendimento"}</h2><p className="mt-2 max-w-2xl text-slate-600">{client ? `Contexto isolado: ${client.displayName}.` : "Contexto interno autorizado para o papel autenticado."}</p></div>{user?.role === "CLIENT" && <ActionButton label="Novo chamado" icon={<PlusCircle size={18} />} className="border-support-500 bg-support-500 text-white hover:bg-support-700" onClick={() => notify("A abertura de chamados será entregue na SPEC 03.", "success")} />}</div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Card key={card.label}><p className="text-sm text-slate-500">{card.label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p><Badge tone="neutral">Aguardando Ticket Core</Badge></Card>)}</div><div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]"><Card><div className="flex items-center justify-between"><div><h3 className="font-semibold text-slate-900">Chamados recentes</h3><p className="mt-1 text-sm text-slate-600">O histórico aparecerá aqui após a SPEC 03.</p></div><ActionButton compact label="Visualizar resumo" icon={<Eye size={18} />} onClick={() => setDrawerOpen(true)} /></div><div className="mt-5"><EmptyState /></div></Card><Card><h3 className="font-semibold text-slate-900">Contexto autorizado</h3><p className="mt-2 text-sm text-slate-600">Perfil: <Badge tone="info">{user?.role ?? "-"}</Badge></p><p className="mt-4 text-sm font-medium text-slate-700">Produtos disponíveis</p><ul className="mt-2 space-y-2 text-sm text-slate-600">{products.map((product) => <li key={product.id}>{product.displayName}</li>)}</ul></Card></div><Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Resumo de identidade"><Badge tone="info">SPEC 02</Badge><h3 className="mt-4 text-lg font-semibold">Tenant e papel resolvidos</h3><p className="mt-2 text-sm text-slate-600">A sessão local recupera o papel, o cliente vinculado e os produtos autorizados. A regra real de backend e RLS será ativada com o Supabase conforme documentação da infraestrutura.</p><button className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-support-700" onClick={() => setDrawerOpen(false)}>Voltar <ArrowRight size={16} /></button></Drawer></AppShell>;
}

export default function Home() { return <RequireAuth><FoundationHome /></RequireAuth>; }
