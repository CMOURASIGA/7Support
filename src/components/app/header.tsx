"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";

export function Header({ onToggleMobileNav, mobileNavOpen }: { onToggleMobileNav: () => void; mobileNavOpen: boolean }) {
  const { user, client, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function dismiss(event: MouseEvent) { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setUserMenuOpen(false); }
    document.addEventListener("mousedown", dismiss);
    return () => document.removeEventListener("mousedown", dismiss);
  }, []);
  useEffect(() => setUserMenuOpen(false), [pathname]);
  const initials = user?.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "7S";
  return <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-4 border-b border-[var(--border)] bg-white/95 px-4 py-2 backdrop-blur md:px-6">
    <div className="flex min-w-0 items-center gap-3">
      <button type="button" className="mobile-nav-toggle" onClick={onToggleMobileNav} aria-label={mobileNavOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileNavOpen} aria-controls="app-sidebar"><Menu size={20} /></button>
      <div className="min-w-0"><p className="truncate text-[10px] font-black uppercase tracking-[.2em] text-[var(--accent)]">{client ? client.displayName : "Workspace ativo"}</p><h1 className="truncate text-base font-semibold text-[var(--text-primary)]">Início</h1></div>
    </div>
    <div ref={menuRef} className="relative flex shrink-0 items-center gap-2 md:gap-3">
      <span className="hidden items-center gap-2 rounded-full border border-[#9fe1cb] bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[#0f6e56] sm:inline-flex"><span className="h-2 w-2 rounded-full bg-[var(--success)]" />Sessão local</span>
      <button type="button" aria-label="Menu do usuário" aria-expanded={userMenuOpen} aria-haspopup="menu" onClick={() => setUserMenuOpen((value) => !value)} className="flex items-center gap-2 rounded-xl px-1.5 py-1 hover:bg-[var(--bg-muted)] sm:px-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-highlight)] text-xs font-bold text-[var(--sidebar-deep)]">{initials}</span>
        <span className="hidden min-w-0 text-left md:block"><span className="block max-w-40 truncate text-sm font-semibold text-[var(--text-primary)]">{user?.displayName}</span><span className="block text-[10px] uppercase tracking-wide text-[var(--text-tertiary)]">{user?.role}</span></span>
        <ChevronDown size={16} className="hidden text-[var(--text-tertiary)] md:block" />
      </button>
      {userMenuOpen && <div role="menu" className="absolute right-0 top-[calc(100%+10px)] w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-xl"><div className="border-b border-[var(--border)] px-4 py-4"><p className="truncate text-sm font-semibold text-[var(--text-primary)]">{user?.displayName}</p><p className="mt-1 truncate text-xs text-[var(--text-secondary)]">{user?.email}</p></div><div className="p-2"><button role="menuitem" type="button" onClick={() => { logout(); router.replace("/login"); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-[var(--danger)] hover:bg-[var(--danger-soft)]"><LogOut size={18} />Sair</button></div></div>}
    </div>
  </header>;
}
