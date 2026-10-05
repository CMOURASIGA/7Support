"use client";

import { use, useState } from "react";
import { Archive, ArrowRight, History, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { KnowledgeForm, KnowledgeStatusBadge, KnowledgeVisibilityBadge } from "@/components/knowledge/knowledge-ui";
import { BackLink, formatDate, PageHeading } from "@/components/tickets/ticket-ui";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { RequireAuth } from "@/features/auth/require-auth";
import { useAuth } from "@/features/auth/auth-context";
import { knowledgeCategoryLabels, type KnowledgeInput } from "@/features/knowledge/types";
import { useKnowledgeAdminDetail } from "@/features/knowledge/use-knowledge";
import { knowledgeService } from "@/services/knowledge/service";

function KnowledgeAdminDetail({ sourceId }: { sourceId: string }) {
  const { products } = useAuth(); const { notify } = useToast();
  const { detail, loading, error, refresh } = useKnowledgeAdminDetail(sourceId);
  const [busy, setBusy] = useState(false); const [newVersionOpen, setNewVersionOpen] = useState(false);
  async function action(success: string, operation: () => Promise<unknown>) {
    if (busy) return; setBusy(true);
    try { await operation(); notify(success); setNewVersionOpen(false); await refresh(); }
    catch (cause) { notify(cause instanceof Error ? cause.message : "Ação não concluída.", "error"); }
    finally { setBusy(false); }
  }
  const latest = detail?.versions[0];
  const initial: KnowledgeInput | undefined = latest && detail ? { productId: detail.source.productId, title: latest.title, category: latest.category, content: latest.content, visibility: latest.visibility } : undefined;
  return <AppShell><div className="mx-auto w-full max-w-5xl space-y-5"><BackLink href="/knowledge" />{loading ? <LoadingState /> : error ? <div role="alert"><ErrorState /><p className="mt-2 text-sm text-[var(--danger)]">{error}</p></div> : detail && latest ? <>
    <PageHeading eyebrow={`${detail.productName} · versão ${latest.version}`} title={latest.title} description={`Checksum ${latest.checksum}`} action={<div className="flex flex-wrap gap-2"><KnowledgeStatusBadge status={latest.status} /><KnowledgeVisibilityBadge visibility={latest.visibility} /></div>} />
    <Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Workflow editorial</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Somente rascunhos podem ser editados. Publicação exige revisão.</p></div><div className="flex flex-wrap gap-2">{latest.status === "DRAFT" && <button type="button" disabled={busy} className="workspace-button-primary" onClick={() => void action("Conteúdo enviado para revisão.", () => knowledgeService.submitForReview(latest.id))}><Send size={17} />Enviar para revisão</button>}{latest.status === "IN_REVIEW" && <><button type="button" disabled={busy} className="workspace-button-secondary" onClick={() => void action("Conteúdo devolvido para rascunho.", () => knowledgeService.returnToDraft(latest.id))}><RotateCcw size={17} />Devolver para ajustes</button><button type="button" disabled={busy} className="workspace-button-primary" onClick={() => { if (window.confirm("Publicar esta versão? A versão publicada anterior será preservada no histórico como arquivada.")) void action("Conteúdo publicado.", () => knowledgeService.publish(latest.id)); }}><ShieldCheck size={17} />Publicar</button></>}{latest.status === "PUBLISHED" && <><button type="button" disabled={busy} className="workspace-button-secondary" onClick={() => setNewVersionOpen((value) => !value)}><ArrowRight size={17} />Nova versão</button><button type="button" disabled={busy} className="workspace-button-secondary text-[var(--danger)]" onClick={() => { if (window.confirm("Arquivar este conteúdo? Ele deixará de aparecer nas consultas autorizadas.")) void action("Conteúdo arquivado.", () => knowledgeService.archive(latest.id)); }}><Archive size={17} />Arquivar</button></>}{latest.status === "ARCHIVED" && <button type="button" disabled={busy} className="workspace-button-primary" onClick={() => setNewVersionOpen((value) => !value)}><ArrowRight size={17} />Criar nova versão</button>}</div></div></Card>
    {latest.status === "DRAFT" && <Card><h3 className="mb-4 font-semibold">Editar rascunho</h3><KnowledgeForm key={latest.id} products={products} initial={initial} lockProduct submitLabel="Salvar alterações" busy={busy} onSubmit={(input) => action("Rascunho atualizado.", () => knowledgeService.updateDraft(latest.id, input))} /></Card>}
    {latest.status === "IN_REVIEW" && <Card className="border-amber-300 bg-amber-50"><h3 className="font-semibold text-amber-900">Versão bloqueada para edição</h3><p className="mt-2 text-sm leading-6 text-amber-900">O conteúdo está em revisão. Devolva para rascunho se precisar alterar título, categoria, visibilidade ou texto.</p></Card>}
    {newVersionOpen && initial && <Card><h3 className="font-semibold">Nova versão</h3><p className="mb-4 mt-2 text-sm text-[var(--text-secondary)]">Altere materialmente o conteúdo antes de salvar. Uma cópia idêntica será bloqueada pelo checksum.</p><KnowledgeForm key={`new-${latest.id}`} products={products} initial={initial} lockProduct submitLabel="Criar nova versão em rascunho" busy={busy} onSubmit={(input) => action("Nova versão criada.", () => knowledgeService.createNewVersion(detail.source.id, input))} /></Card>}
    <Card><div className="flex items-center gap-2"><History size={18} className="text-[var(--accent)]" /><h3 className="font-semibold">Histórico de versões</h3></div><div className="mt-4 space-y-3">{detail.versions.map((version) => <div key={version.id} className="rounded-xl border border-[var(--border)] p-4"><div className="flex flex-wrap items-center gap-2"><strong>Versão {version.version}</strong><KnowledgeStatusBadge status={version.status} /><KnowledgeVisibilityBadge visibility={version.visibility} /><Badge>{knowledgeCategoryLabels[version.category]}</Badge></div><p className="mt-2 text-sm text-[var(--text-secondary)]">{version.title}</p><dl className="mt-3 grid gap-2 text-xs text-[var(--text-tertiary)] sm:grid-cols-2"><div><dt>Autor</dt><dd>{version.authorUserId}</dd></div><div><dt>Revisor</dt><dd>{version.reviewerUserId ?? "Não definido"}</dd></div><div><dt>Atualizado</dt><dd>{formatDate(version.updatedAt)}</dd></div><div><dt>Checksum</dt><dd className="break-all">{version.checksum}</dd></div></dl></div>)}</div></Card>
    <Card><h3 className="font-semibold">Auditoria funcional</h3><div className="mt-4 space-y-2">{detail.auditEvents.map((event) => <div key={event.id} className="rounded-xl bg-[var(--bg-muted)] p-3 text-sm"><strong>{event.eventType}</strong> · {event.description}<span className="ml-2 text-xs text-[var(--text-tertiary)]">{formatDate(event.createdAt)}</span></div>)}</div></Card>
  </> : null}</div></AppShell>;
}

export default function KnowledgeAdminPage({ params }: { params: Promise<{ sourceId: string }> }) { const { sourceId } = use(params); return <RequireAuth roles={["ADMIN"]}><KnowledgeAdminDetail sourceId={sourceId} /></RequireAuth>; }
