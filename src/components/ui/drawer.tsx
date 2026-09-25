"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === "Escape" && onClose(); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose]);
  if (!open) return null;
  return <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={title}><button aria-label="Fechar painel" className="absolute inset-0 bg-slate-950/35" onClick={onClose} /><aside className="relative h-full w-full max-w-lg overflow-y-auto bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-200 p-5"><h2 className="text-lg font-semibold text-slate-900">{title}</h2><button aria-label="Fechar painel" className="rounded p-2 hover:bg-slate-100" onClick={onClose}><X size={20} /></button></header><div className="p-5">{children}</div></aside></div>;
}
