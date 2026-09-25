import type { BadgeTone } from "@/types/ui";
import { cn } from "@/lib/cn";

const tones: Record<BadgeTone, string> = {
  neutral: "border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text-secondary)]",
  info: "border-[#a8d8ef] bg-[var(--accent-soft)] text-[var(--accent-strong)]",
  warning: "border-[#eed69f] bg-[var(--warning-soft)] text-[var(--warning)]",
  success: "border-[#9fe1cb] bg-[var(--success-soft)] text-[#0f6e56]",
  danger: "border-[#f09595] bg-[var(--danger-soft)] text-[var(--danger)]",
};

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: BadgeTone }) {
  return <span className={cn("inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold", tones[tone])}>{children}</span>;
}
