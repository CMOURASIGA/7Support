"use client";

import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";

export default function LoginPage() {
  const { login } = useAuth(); const router = useRouter(); const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const data = new FormData(event.currentTarget); if (login(String(data.get("email")), String(data.get("password")))) router.replace("/"); else setError("Credenciais de demonstração inválidas."); }
  return <main className="min-h-screen bg-slate-950 p-5 sm:grid sm:place-items-center"><Card className="mx-auto max-w-md border-slate-700 bg-white sm:w-full"><p className="text-sm font-semibold text-support-700">7Support</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Acessar central de atendimento</h1><p className="mt-2 text-sm text-slate-600">Ambiente local de validação da SPEC 02.</p><form className="mt-7 space-y-4" onSubmit={submit}><label className="block text-sm font-medium text-slate-700">E-mail<input required name="email" type="email" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="cliente.alpha@demo.7support.local" /></label><label className="block text-sm font-medium text-slate-700">Senha<input required name="password" type="password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>{error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<ActionButton label="Entrar" icon={<LogIn size={18} />} type="submit" className="w-full justify-center border-support-500 bg-support-500 text-white hover:bg-support-700" /></form><div className="mt-6 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600"><strong>Contas de demonstração:</strong><br />CLIENT: cliente.alpha@demo.7support.local / demo-alpha<br />SUPPORT: suporte@demo.7support.local / demo-suporte<br />ADMIN: admin@demo.7support.local / demo-admin</div></Card></main>;
}
