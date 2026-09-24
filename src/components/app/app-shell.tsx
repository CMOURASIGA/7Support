import { Header } from "@/components/app/header";
import { Sidebar } from "@/components/app/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) { return <div className="min-h-screen bg-slate-50 lg:flex"><Sidebar /><div className="min-w-0 flex-1"><Header /><main className="mx-auto max-w-7xl p-5 lg:p-7">{children}</main></div></div>; }
