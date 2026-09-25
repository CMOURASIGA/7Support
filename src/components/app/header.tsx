"use client";

import { Bell, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";

export function Header() { const { user, client, logout } = useAuth(); const router = useRouter(); return <header className="flex min-h-16 items-center justify-between border-b border-slate-200 bg-white px-5 pl-16 lg:pl-7"><div><p className="text-sm text-slate-500">7Support {client ? `· ${client.displayName}` : "· Operação interna"}</p><h1 className="text-lg font-semibold text-slate-900">Central de Atendimento</h1></div><div className="flex items-center gap-2"><button aria-label="Notificações" title="Notificações" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Bell size={20} /></button><div className="hidden items-center gap-2 text-right text-sm text-slate-700 sm:flex"><UserRound size={20} /><span><strong className="block">{user?.displayName}</strong><small>{user?.role}</small></span></div><button aria-label="Sair" title="Sair" onClick={() => { logout(); router.replace("/login"); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><LogOut size={20} /></button></div></header>; }
