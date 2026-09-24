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

const cards = [{ label: "Chamados abertos", value: "0" }, { label: "Aguardando atendimento", value: "0" }, { label: "Aguardando você", value: "0" }, { label: "Resolvidos", value: "0" }];

function FoundationHome() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { notify } = useToast();
  return <AppShell><div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-support-700">7Support</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Central de atendimento</h2><p className="mt-2 max-w-2xl text-slate-600">Fundação visual pronta para os próximos módulos autorizados.</p></div><ActionButton label="Novo chamado" icon={<PlusCircle size={18} />} className="border-support-500 bg-support-500 text-white hover:bg-support-700" onClick={() => notify("A abertura de chamados será entregue na SPEC 03.", "success")} /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <Card key={card.label}><p className="text-sm text-slate-500">{card.label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p><Badge tone="neutral">Aguardando Ticket Core</Badge></Card>)}</div><div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px]"><Card><div className="flex items-center justify-between"><div><h3 className="font-semibold text-slate-900">Chamados recentes</h3><p className="mt-1 text-sm text-slate-600">O histórico aparecerá aqui após a SPEC 03.</p></div><ActionButton compact label="Visualizar resumo" icon={<Eye size={18} />} onClick={() => setDrawerOpen(true)} /></div><div className="mt-5"><EmptyState /></div></Card><Card><h3 className="font-semibold text-slate-900">Padrões de interface</h3><ul className="mt-4 space-y-3 text-sm text-slate-600"><li className="flex justify-between">Estados <Badge tone="info">LABEL / BADGE</Badge></li><li className="flex justify-between">Feedback <Badge tone="success">NOTIFICAÇÃO</Badge></li><li className="flex justify-between">Consulta <Badge tone="warning">DRAWER</Badge></li></ul></Card></div><Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Resumo rápido"><Badge tone="info">FUNDAÇÃO</Badge><h3 className="mt-4 text-lg font-semibold">Drawer responsivo</h3><p className="mt-2 text-sm text-slate-600">Este componente preserva o contexto da tela e será reutilizado para consulta rápida de chamados, clientes e ações contextuais.</p><button className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-support-700" onClick={() => setDrawerOpen(false)}>Voltar <ArrowRight size={16} /></button></Drawer></AppShell>;
}

export default function Home() { return <FoundationHome />; }
