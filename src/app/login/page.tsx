"use client";

import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";

export default function LoginPage() {
  const { login } = useAuth(); const router = useRouter(); const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); if (login(String(data.get("email")), String(data.get("password")))) router.replace("/"); else setError("Credenciais de demonstração inválidas."); }
  return <main className="grid min-h-screen place-items-center bg-[var(--bg-page)] p-4 md:p-6"><Card className="w-full max-w-xl rounded-[1.8rem] p-6 md:p-8"><div className="mx-auto flex h-20 w-44 items-center justify-center rounded-xl bg-white p-2"><Image src="https://i.imgur.com/gxXnYsA.png" unoptimized width={160} height={72} alt="Consult Services Tecnologia" className="max-h-full max-w-full object-contain" /></div><div className="mt-6 text-center"><p className="text-[10px] font-black uppercase tracking-[.24em] text-[var(--accent)]">Acesso ao sistema</p><h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Entrar no 7Support</h1><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Ambiente local de validação da SPEC 02.</p></div><form className="mt-6 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5" onSubmit={submit}><label className="block text-sm font-semibold text-[var(--text-primary)]">E-mail<input required name="email" type="email" className="workspace-input mt-1" placeholder="cliente.alpha@demo.7support.local" /></label><label className="block text-sm font-semibold text-[var(--text-primary)]">Senha<input required name="password" type="password" className="workspace-input mt-1" /></label>{error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</p>}<ActionButton label="Entrar" icon={<LogIn size={18} />} type="submit" variant="primary" className="w-full" /></form><div className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4 text-xs leading-6 text-[var(--text-secondary)]"><strong>Contas de demonstração:</strong><br />CLIENT: cliente.alpha@demo.7support.local / demo-alpha<br />SUPPORT: suporte@demo.7support.local / demo-suporte<br />ADMIN: admin@demo.7support.local / demo-admin</div></Card></main>;
}
