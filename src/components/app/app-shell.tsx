"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/app/header";
import { Sidebar } from "@/components/app/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useEffect(() => setMobileNavOpen(false), [pathname]);
  return <div className="min-h-screen bg-[var(--bg-page)] md:flex md:items-stretch">
    <Sidebar isMobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
    <div className="flex min-h-screen min-w-0 flex-1 flex-col">
      <Header onToggleMobileNav={() => setMobileNavOpen((value) => !value)} mobileNavOpen={mobileNavOpen} />
      <main className="min-w-0 flex-1 overflow-x-hidden p-4 md:p-5">{children}</main>
    </div>
  </div>;
}
