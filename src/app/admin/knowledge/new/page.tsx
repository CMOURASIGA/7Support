"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/app-shell";
import { KnowledgeForm } from "@/components/knowledge/knowledge-ui";
import { BackLink, PageHeading } from "@/components/tickets/ticket-ui";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { RequireAuth } from "@/features/auth/require-auth";
import { useAuth } from "@/features/auth/auth-context";
import type { KnowledgeInput } from "@/features/knowledge/types";
import { knowledgeService } from "@/services/knowledge/service";

function NewKnowledgeContent() {
  const { products } = useAuth(); const { notify } = useToast(); const router = useRouter(); const [busy, setBusy] = useState(false);
  async function create(input: KnowledgeInput) {
    if (busy) return; setBusy(true);
    try { const result = await knowledgeService.create(input); notify("Rascunho criado."); router.push(`/admin/knowledge/${result.source.id}`); }
    catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível criar o conteúdo.", "error"); setBusy(false); }
  }
  return <AppShell><div className="mx-auto w-full max-w-4xl space-y-5"><BackLink href="/knowledge" /><PageHeading eyebrow="Administração" title="Novo conteúdo" description="O conteúdo nasce como rascunho e precisa passar por revisão antes da publicação." /><Card><KnowledgeForm products={products} submitLabel="Criar rascunho" busy={busy} onSubmit={create} /></Card></div></AppShell>;
}
export default function NewKnowledgePage() { return <RequireAuth roles={["ADMIN"]}><NewKnowledgeContent /></RequireAuth>; }
