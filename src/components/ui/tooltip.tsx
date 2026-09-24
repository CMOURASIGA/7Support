"use client";

export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return <span className="group relative inline-flex" tabIndex={0} aria-label={label}>{children}<span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white group-hover:block group-focus:block">{label}</span></span>;
}
