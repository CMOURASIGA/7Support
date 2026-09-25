"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type Toast = { id: number; message: string; type: "success" | "error" };
const ToastContext = createContext<{ notify: (message: string, type?: Toast["type"]) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const notify = useCallback((message: string, type: Toast["type"] = "success") => { const id = Date.now(); setToasts((items) => [...items, { id, message, type }]); window.setTimeout(() => setToasts((items) => items.filter((item) => item.id !== id)), 4000); }, []);
  return <ToastContext.Provider value={{ notify }}>{children}<div className="fixed bottom-4 right-4 z-50 space-y-2" aria-live="polite">{toasts.map((toast) => <div key={toast.id} className="flex max-w-sm items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">{toast.type === "success" ? <CheckCircle2 className="text-emerald-300" size={18} /> : <XCircle className="text-red-300" size={18} />}<span>{toast.message}</span></div>)}</div></ToastContext.Provider>;
}
export function useToast() { const context = useContext(ToastContext); if (!context) throw new Error("useToast deve ser usado dentro de ToastProvider."); return context; }
