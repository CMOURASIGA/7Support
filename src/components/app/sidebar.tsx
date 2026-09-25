"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, LifeBuoy, PlusCircle, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/features/auth/auth-context";

export function Sidebar({ isMobileOpen, onCloseMobile }: { isMobileOpen: boolean; onCloseMobile: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const sections = [
    { label: "Principal", items: [
      { label: "Início", href: "/", icon: Home },
      ...(user?.role === "CLIENT" ? [{ label: "Meus chamados", href: "/tickets", icon: LifeBuoy }, { label: "Novo chamado", href: "/tickets/new", icon: PlusCircle }] : []),
    ] },
  ];
  return <>
    {isMobileOpen && <button type="button" aria-label="Fechar menu" className="sidebar-backdrop md:hidden" onClick={onCloseMobile} />}
    <aside id="app-sidebar" className={cn("sidebar-shell flex min-h-screen flex-col text-white md:self-stretch", isMobileOpen && "is-open")} aria-label="Menu principal">
      <div className="relative px-4 pt-4 md:px-2 lg:px-4">
        <div className="flex h-[144px] items-center justify-center overflow-hidden rounded-xl bg-white p-2 shadow-sm md:h-[52px] lg:h-[144px]">
          <Image src="https://i.imgur.com/gxXnYsA.png" unoptimized width={188} height={132} alt="Consult Services Tecnologia" className="max-h-full max-w-full object-contain" />
        </div>
        <button type="button" onClick={onCloseMobile} className="absolute right-6 top-6 rounded-full bg-white/15 p-2 md:hidden" aria-label="Fechar menu"><X size={18} /></button>
      </div>
      <div className="sidebar-rail-only border-b border-white/15 px-4 pb-6 pt-6">
        <p className="text-[10px] font-extrabold uppercase tracking-[.22em] text-[var(--brand-highlight)]">7Support</p>
        <p className="mt-1.5 text-[13px] font-semibold leading-snug text-white">Central de atendimento e suporte</p>
      </div>
      <nav className="flex flex-col gap-5 px-3 py-4 md:px-2 lg:px-3">
        {sections.map((section) => <div key={section.label}>
          <p className="sidebar-rail-only mb-2 px-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#a9dffc]">{section.label}</p>
          <div className="flex flex-col gap-1">{section.items.map(({ label, href, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : href === "/tickets" ? pathname === "/tickets" || (pathname.startsWith("/tickets/") && pathname !== "/tickets/new") : pathname === href;
            return <Link key={href} href={href} title={label} aria-label={label} aria-current={active ? "page" : undefined} onClick={onCloseMobile} className={cn("sidebar-nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors md:justify-center lg:justify-start", active && "sidebar-nav-link-active shadow-sm")}><Icon size={18} aria-hidden="true" /><span className="sidebar-rail-only">{label}</span></Link>;
          })}</div>
        </div>)}
      </nav>
      <div className="sidebar-rail-only mt-auto border-t border-white/15 px-5 py-4 text-xs text-[#bfeaff]">{user?.role === "CLIENT" ? "Área do cliente" : "Operação interna"}</div>
    </aside>
  </>;
}
