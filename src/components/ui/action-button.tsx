"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: ReactNode; compact?: boolean };

export function ActionButton({ label, icon, compact = false, className, ...props }: Props) {
  return <button aria-label={label} title={label} className={cn("inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-support-500 disabled:cursor-not-allowed disabled:opacity-50", compact && "w-10 px-0", className)} {...props}>{icon}{!compact && <span>{label}</span>}</button>;
}
