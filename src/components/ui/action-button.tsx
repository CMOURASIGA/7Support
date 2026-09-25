"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { label: string; icon: ReactNode; compact?: boolean; variant?: "primary" | "secondary" };

export function ActionButton({ label, icon, compact = false, variant = "secondary", className, ...props }: Props) {
  return <button aria-label={label} title={label} className={cn(variant === "primary" ? "workspace-button-primary" : "workspace-button-secondary", compact && "w-10 px-0", className)} {...props}>{icon}{!compact && <span>{label}</span>}</button>;
}
