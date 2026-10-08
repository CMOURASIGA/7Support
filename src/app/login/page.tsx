"use client";

import { FormEvent, useState } from "react";
import { LogIn, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ActionButton } from "@/components/ui/action-button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";

const demoProfiles = [
  {
    label: "Cliente Alpha",
    description: "CLIENT · 7Commander",
    email: "cliente.alpha@demo.7support.local",
    password: "demo-alpha",
    icon: UserRound,
  },
  {
    label: "Cliente Beta",
    description: "CLIENT · 7Finance",
    email: "cliente.beta@demo.7support.local",
    password: "demo-beta",
    icon: UserRound,
  },
  {
    label: "Suporte",
    description: "SUPPORT · operação interna",
    email: "suporte@demo.7support.local",
    password: "demo-suporte",
    icon: UsersRound,
  },
  {
    label: "Admin",
    description: "ADMIN · administração",
    email: "admin@demo.7support.local",
    password: "demo-admin",
    icon: ShieldCheck,
  },
] as const;

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function selectDemoProfile(profile: (typeof demoProfiles)[number]) {
    setEmail(profile.email);
    setPassword(profile.password);
    setError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (login(email, password)) router.replace("/");
    else setError("Credenciais de demonstração inválidas.");
  }

  return <main className="grid min-h-screen place-items-center bg-[var(--bg-page)] p-4 md:p-6">
    <Card className="w-full max-w-xl rounded-[1.8rem] p-6 md:p-8">
      <div className="mx-auto flex h-20 w-44 items-center justify-center rounded-xl bg-white p-2">
        <Image src="https://i.imgur.com/gxXnYsA.png" unoptimized width={160} height={72} alt="Consult Services Tecnologia" className="max-h-full max-w-full object-contain" />
      </div>

      <div className="mt-6 text-center">
        <p className="text-[10px] font-black uppercase tracking-[.24em] text-[var(--accent)]">Acesso ao sistema</p>
        <h1 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Entrar no 7Support</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Ambiente local de validação. Escolha um perfil para preencher as credenciais e confirme em Entrar.</p>
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-muted)] p-4">
        <p className="text-xs font-black uppercase tracking-[.14em] text-[var(--text-tertiary)]">Acesso rápido para validação</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {demoProfiles.map((profile) => {
            const Icon = profile.icon;
            const selected = email === profile.email && password === profile.password;
            return <button
              key={profile.email}
              type="button"
              aria-pressed={selected}
              onClick={() => selectDemoProfile(profile)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${selected ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] bg-white hover:bg-[var(--bg-elevated)]"}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]"><Icon size={18} /></span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--text-primary)]">{profile.label}</span>
                <span className="block truncate text-xs text-[var(--text-secondary)]">{profile.description}</span>
              </span>
            </button>;
          })}
        </div>
      </div>

      <form className="mt-4 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5" onSubmit={submit}>
        <label className="block text-sm font-semibold text-[var(--text-primary)]">
          E-mail
          <input
            required
            name="email"
            type="email"
            className="workspace-input mt-1"
            placeholder="cliente.alpha@demo.7support.local"
            value={email}
            onChange={(event) => { setEmail(event.target.value); setError(""); }}
          />
        </label>
        <label className="block text-sm font-semibold text-[var(--text-primary)]">
          Senha
          <input
            required
            name="password"
            type="password"
            className="workspace-input mt-1"
            value={password}
            onChange={(event) => { setPassword(event.target.value); setError(""); }}
          />
        </label>
        {error && <p role="alert" className="rounded-xl bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">{error}</p>}
        <ActionButton label="Entrar" icon={<LogIn size={18} />} type="submit" variant="primary" className="w-full" />
      </form>

      <p className="mt-4 text-center text-xs leading-5 text-[var(--text-tertiary)]">Recurso exclusivo do ambiente local de demonstração. O perfil selecionado apenas preenche as credenciais; o acesso continua dependendo da confirmação em Entrar.</p>
    </Card>
  </main>;
}
