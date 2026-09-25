"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const panel = closeRef.current?.closest("aside");
        const focusable = panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (!focusable?.length) return;
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; previousFocus?.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-[60] flex justify-end" role="presentation"><button type="button" aria-label="Fechar painel" className="absolute inset-0 bg-slate-900/40" onClick={onClose} /><aside role="dialog" aria-modal="true" aria-labelledby="drawer-title" className="relative flex h-dvh w-full flex-col border-l border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)] sm:max-w-[26rem]"><header className="flex items-center justify-between gap-3 border-b border-[var(--border)] p-4"><div><p className="workspace-section-label">Consulta rápida</p><h2 id="drawer-title" className="mt-1 text-lg font-semibold text-[var(--text-primary)]">{title}</h2></div><button ref={closeRef} type="button" title="Fechar painel" aria-label="Fechar painel" className="workspace-button-secondary h-10 w-10 p-0" onClick={onClose}><X size={18} /></button></header><div className="overflow-y-auto p-5 text-[var(--text-primary)]">{children}</div></aside></div>;
}
