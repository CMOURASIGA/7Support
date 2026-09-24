"use client";

import { CircleHelp, Home, LifeBuoy, Menu, PlusCircle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";

const items = [{ label: "Início", icon: Home, active: true }, { label: "Meus chamados", icon: LifeBuoy }, { label: "Novo chamado", icon: PlusCircle }, { label: "Ajuda", icon: CircleHelp }];

export function Sidebar() {
  const [open, setOpen] = useState(false);
  return <><button className="fixed left-4 top-4 z-30 rounded-lg border border-slate-300 bg-white p-2 lg:hidden" aria-label="Abrir menu" onClick={() => setOpen(true)}><Menu /></button><aside className={cn("fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-slate-950 p-4 text-slate-100 transition-transform lg:static lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}><div className="mb-8 px-3"><p className="text-xl font-bold tracking-tight">7Support</p><p className="mt-1 text-sm text-slate-400">Central de atendimento</p></div><nav className="space-y-1">{items.map(({ label, icon: Icon, active }) => <button key={label} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium", active ? "bg-support-500 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white")}><Icon size={18} />{label}</button>)}</nav><div className="mt-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-400">SPEC 01 · Fundação visual</div></aside>{open && <button aria-label="Fechar menu" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setOpen(false)} />}</>;
}
