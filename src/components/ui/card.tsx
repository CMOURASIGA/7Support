import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("workspace-card p-4 md:p-5", className)}>{children}</section>;
}
