"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

type Toast = { id: number; message: string; type: "success" | "error" };
const ToastContext = createContext<{ notify: (message: string, type?: Toast["type"]) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const dismiss = useCallback((id: number) => { setToasts((items) => items.filter((item) => item.id !== id)); const timer = timers.current.get(id); if (timer) clearTimeout(timer); timers.current.delete(id); }, []);
  const notify = useCallback((message: string, type: Toast["type"] = "success") => { const id = ++nextId.current; setToasts((items) => [...items, { id, message, type }]); timers.current.set(id, setTimeout(() => dismiss(id), 5000)); }, [dismiss]);
  useEffect(() => { const active = timers.current; return () => { active.forEach(clearTimeout); active.clear(); }; }, []);
  return <ToastContext.Provider value={{ notify }}>{children}<div className="fixed bottom-4 right-4 z-[80] flex w-[min(360px,calc(100vw-2rem))] flex-col-reverse gap-2" role="region" aria-live="polite" aria-label="Notificações">{toasts.map((toast) => <div key={toast.id} role="status" className={`flex items-start gap-2 rounded-[.9rem] border px-4 py-3 text-sm shadow-[var(--shadow-card)] ${toast.type === "success" ? "border-[#9fe1cb] bg-[var(--success-soft)] text-[#085041]" : "border-[#f09595] bg-[var(--danger-soft)] text-[var(--danger)]"}`}>{toast.type === "success" ? <CheckCircle2 size={18} /> : <XCircle size={18} />}<span className="flex-1">{toast.message}</span><button type="button" aria-label="Fechar notificação" title="Fechar notificação" onClick={() => dismiss(toast.id)}><X size={16} /></button></div>)}</div></ToastContext.Provider>;
}
export function useToast() { const context = useContext(ToastContext); if (!context) throw new Error("useToast deve ser usado dentro de ToastProvider."); return context; }
