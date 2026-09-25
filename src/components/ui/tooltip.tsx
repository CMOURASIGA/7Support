"use client";

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return <span className="group relative inline-flex" title={label}><span className="sr-only">{label}</span>{children}<span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--sidebar-deep)] px-2 py-1 text-xs text-white shadow-[var(--shadow-card)] group-hover:block group-focus-within:block">{label}</span></span>;
}
