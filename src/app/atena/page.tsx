"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Archive, BookOpen, Clock3, FlaskConical, MessageCircle, PlusCircle, RotateCcw, Send, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { PageHeading, formatDate } from "@/components/tickets/ticket-ui";
import { RequireAuth } from "@/features/auth/require-auth";
import { useAuth } from "@/features/auth/auth-context";
import type { AtenaConversation, ConversationView } from "@/features/atena/types";
import { AtenaError } from "@/services/atena/errors";
import { localAtenaDemoService, localDemoPresets, type LocalDemoPreset } from "@/services/atena/local-demo";
import { atenaService } from "@/services/atena/service";
import type { AuthorizedKnowledge } from "@/features/knowledge/types";

const demoLabels: Record<LocalDemoPreset, string> = {
  PRIMARY_SUCCESS: "Primário com sucesso",
  FALLBACK_SUCCESS: "Falha primária, fallback com sucesso",
  TOTAL_FAILURE: "Falha total",
  RATE_LIMIT: "Rate limit no primário",
  EMPTY_RESPONSE: "Resposta vazia no primário",
  INVALID_RESPONSE: "Resposta inválida no primário",
  LATENCY: "Latência simulada",
};

function friendlyError(error: unknown) {
  return error instanceof AtenaError ? error.message : "Não foi possível concluir a ação local. Tente novamente.";
}

function AtenaContent() {
  const { user, products } = useAuth();
  const { notify } = useToast();
  const [conversations, setConversations] = useState<AtenaConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<ConversationView | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [productId, setProductId] = useState("");
  const [message, setMessage] = useState("");
  const [citation, setCitation] = useState<AuthorizedKnowledge | null>(null);
  const [citationError, setCitationError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<Awaited<ReturnType<typeof atenaService.getDiagnostics>>>([]);
  const [demoPreset, setDemoPreset] = useState<LocalDemoPreset>("PRIMARY_SUCCESS");

  const refresh = useCallback(async (id: string | null) => {
    const list = await atenaService.listConversations();
    const [detail, runs] = id ? await Promise.all([
      atenaService.getConversation(id),
      user?.role === "ADMIN" ? atenaService.getDiagnostics(id) : Promise.resolve([]),
    ]) : [null, []];
    setConversations(list);
    setView(detail);
    setDiagnostics(runs);
    setError(null);
  }, [user?.role]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) { setLoading(true); setError(null); } });
    void atenaService.listConversations().then((list) => {
      if (active) { setConversations(list); setLoading(false); }
    }).catch((cause) => { if (active) { setError(friendlyError(cause)); setLoading(false); } });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    if (!selectedId) return;
    Promise.resolve().then(() => { if (active) { setDetailLoading(true); setError(null); } });
    void Promise.all([atenaService.getConversation(selectedId), user?.role === "ADMIN" ? atenaService.getDiagnostics(selectedId) : Promise.resolve([])]).then(([detail, runs]) => {
      if (active) { setView(detail); setDiagnostics(runs); setDetailLoading(false); }
    }).catch((cause) => { if (active) { setError(friendlyError(cause)); setDetailLoading(false); } });
    return () => { active = false; };
  }, [selectedId, user?.role]);

  useEffect(() => {
    let scheduled = false;
    return atenaService.subscribe(() => {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        void refresh(selectedId).catch((cause) => setError(friendlyError(cause)));
      });
    });
  }, [refresh, selectedId]);

  useEffect(() => {
    if (!products.some((item) => item.id === productId)) {
      Promise.resolve().then(() => setProductId(products[0]?.id ?? ""));
    }
  }, [products, productId]);

  useEffect(() => {
    if (user?.role !== "ADMIN") { localAtenaDemoService.reset(); return; }
    Promise.resolve().then(() => setDemoPreset(localAtenaDemoService.current()));
  }, [user?.role]);

  async function create() {
    if (busy || !productId) return;
    setBusy(true);
    try {
      const conversation = await atenaService.startConversation({ productId });
      setSelectedId(conversation.id);
      await refresh(conversation.id);
      notify("Conversa iniciada.");
    } catch (cause) { notify(friendlyError(cause), "error"); }
    finally { setBusy(false); }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || busy || !message.trim()) return;
    const content = message.trim();
    const conversationId = selectedId;
    setBusy(true);
    try {
      await atenaService.sendMessage(conversationId, { clientRequestId: crypto.randomUUID(), content });
      setMessage("");
      await refresh(conversationId);
    } catch (cause) { notify(friendlyError(cause), "error"); await refresh(conversationId).catch(() => undefined); }
    finally { setBusy(false); }
  }

  async function retry(clientRequestId: string, content: string) {
    if (!selectedId || busy) return;
    setBusy(true);
    try {
      await atenaService.retryMessage(selectedId, { clientRequestId, content });
      await refresh(selectedId);
      notify("Tentativa concluída.");
    } catch (cause) { notify(friendlyError(cause), "error"); await refresh(selectedId).catch(() => undefined); }
    finally { setBusy(false); }
  }

  async function archive() {
    if (!selectedId || busy || !window.confirm("Arquivar esta conversa? O histórico ficará preservado.")) return;
    setBusy(true);
    try {
      await atenaService.archiveConversation(selectedId);
      setSelectedId(null); setView(null); setDiagnostics([]);
      await refresh(null);
      notify("Conversa arquivada.");
    } catch (cause) { notify(friendlyError(cause), "error"); }
    finally { setBusy(false); }
  }

  async function openCitation(citationId: string) {
    if (!selectedId) return;
    setCitationError(null);
    try {
      const result = await atenaService.getAuthorizedCitation(selectedId, citationId);
      setCitation(result.target);
    } catch (cause) { setCitation(null); setCitationError(friendlyError(cause)); notify("A fonte não está disponível para esta identidade.", "error"); }
  }

  function configureDemo(preset: LocalDemoPreset) {
    try { localAtenaDemoService.configure(preset); setDemoPreset(preset); notify("Simulação local atualizada para a próxima resposta."); }
    catch (cause) { notify(friendlyError(cause), "error"); }
  }

  const activeView = view?.conversation.id === selectedId ? view : null;
  const activeProduct = products.find((item) => item.id === activeView?.conversation.productId);
  return <AppShell><div className="mx-auto w-full max-w-7xl space-y-5">
    <PageHeading eyebrow="Conhecimento autorizado" title="Atena" description="Converse sobre um produto usando somente conteúdo publicado e autorizado da base de conhecimento." />
    <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[310px_minmax(0,1fr)]">
      <Card className="h-fit"><div className="flex items-center gap-2"><MessageCircle size={18} className="text-[var(--accent)]" /><h3 className="font-semibold">Suas conversas</h3></div>
        <label className="mt-5 block text-sm font-medium">Produto da nova conversa<select aria-label="Produto da nova conversa" className="workspace-select mt-1" value={productId} disabled={busy || !products.length} onChange={(event) => setProductId(event.target.value)}>{products.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
        <button type="button" className="workspace-button-primary mt-3 w-full justify-center" disabled={busy || !productId} onClick={() => void create()}><PlusCircle size={17} />Nova conversa</button>
        <div className="mt-5 border-t border-[var(--border)] pt-4">{loading ? <LoadingState /> : error && !view ? <div role="alert"><ErrorState /><p className="mt-2 text-sm text-[var(--danger)]">{error}</p><button type="button" className="workspace-button-secondary mt-3" onClick={() => void refresh(selectedId).catch((cause) => setError(friendlyError(cause)))}>Tentar novamente</button></div> : conversations.length ? <div className="space-y-2" role="list" aria-label="Conversas ativas">{conversations.map((item) => <button type="button" role="listitem" key={item.id} aria-current={item.id === selectedId ? "true" : undefined} onClick={() => { setSelectedId(item.id); setCitation(null); setError(null); }} className={`w-full rounded-xl border p-3 text-left transition-colors ${item.id === selectedId ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)] hover:bg-[var(--bg-muted)]"}`}><span className="block truncate text-sm font-semibold">{item.title}</span><span className="mt-1 block text-xs text-[var(--text-secondary)]">{products.find((product) => product.id === item.productId)?.displayName ?? "Produto"} · {formatDate(item.updatedAt)}</span></button>)}</div> : <div className="py-8 text-center text-sm text-[var(--text-secondary)]">Nenhuma conversa ativa. Escolha um produto para começar.</div>}</div>
      </Card>
      <div className="min-w-0 space-y-5">
        {detailLoading ? <LoadingState /> : error && selectedId ? <div role="alert"><ErrorState /><p className="mt-2 text-sm text-[var(--danger)]">{error}</p><button type="button" className="workspace-button-secondary mt-3" onClick={() => void refresh(selectedId).catch((cause) => setError(friendlyError(cause)))}>Tentar novamente</button></div> : activeView ? <>
          <Card><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="workspace-section-label">{activeProduct?.displayName ?? "Produto autorizado"}</p><h3 className="mt-2 text-xl font-semibold">{activeView.conversation.title}</h3><p className="mt-1 text-xs text-[var(--text-tertiary)]">Iniciada em {formatDate(activeView.conversation.createdAt)}</p></div><ActionButton compact label="Arquivar conversa" icon={<Archive size={18} />} disabled={busy || activeView.conversation.status === "ARCHIVED"} onClick={() => void archive()} /></div></Card>
          <Card className="space-y-4" ><div className="flex items-center gap-2"><Sparkles size={18} className="text-[var(--accent)]" /><h3 className="font-semibold">Histórico</h3></div>
            {activeView.messages.length ? <div className="max-h-[min(62vh,700px)] space-y-4 overflow-y-auto pr-1" aria-live="polite">{activeView.messages.map((item) => <div key={item.id} className={`rounded-2xl border p-4 ${item.role === "USER" ? "ml-auto border-[var(--accent-soft)] bg-[var(--accent-soft)] sm:max-w-[85%]" : "mr-auto border-[var(--border)] bg-white sm:max-w-[92%]"}`}><div className="mb-2 flex flex-wrap items-center gap-2"><strong className="text-sm">{item.role === "USER" ? "Você" : "Atena"}</strong>{item.status === "PENDING" && <Badge tone="info">Aguardando resposta</Badge>}{item.status === "FAILED" && <Badge tone="danger">Falha local</Badge>}<span className="text-xs text-[var(--text-tertiary)]">{formatDate(item.createdAt)}</span></div><p className="whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-secondary)]">{item.content}</p>{item.role === "ASSISTANT" && item.citations.length > 0 && <div className="mt-4 border-t border-[var(--border)] pt-3"><p className="workspace-section-label">Fontes utilizadas</p><div className="mt-2 flex flex-wrap gap-2">{item.citations.map((source) => <button key={source.id} type="button" title={`Abrir fonte ${source.titleSnapshot}`} className="workspace-button-secondary max-w-full text-left" onClick={() => void openCitation(source.id)}><BookOpen size={16} /><span className="truncate">{source.titleSnapshot} · v{source.version}</span></button>)}</div><div className="mt-3 space-y-2">{item.citations.map((source) => <p key={source.id} className="line-clamp-3 whitespace-pre-wrap break-words rounded-lg bg-[var(--bg-muted)] p-3 text-xs leading-5 text-[var(--text-secondary)]">{source.excerpt}</p>)}</div></div>}{item.role === "USER" && (item.status === "FAILED" || item.status === "PENDING") && !busy && <button type="button" title="Tentar novamente" className="workspace-button-secondary mt-3" onClick={() => void retry(item.clientRequestId, item.content)}><RotateCcw size={16} />Tentar novamente</button>}</div>)}</div> : <div className="rounded-2xl bg-[var(--bg-muted)] p-8 text-center text-sm text-[var(--text-secondary)]">Faça uma pergunta para iniciar o histórico desta conversa.</div>}
          </Card>
          {activeView.conversation.status === "ACTIVE" && <Card><form onSubmit={(event) => void send(event)}><label htmlFor="atena-composer" className="block text-sm font-semibold">Sua pergunta</label><textarea id="atena-composer" aria-label="Sua pergunta" className="workspace-textarea mt-2 min-h-28" placeholder="Escreva uma pergunta sobre o produto desta conversa" maxLength={4000} value={message} disabled={busy} onChange={(event) => setMessage(event.target.value)} /><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[var(--text-tertiary)]">Resposta completa, com fontes quando houver conhecimento autorizado.</p><button type="submit" className="workspace-button-primary" disabled={busy || !message.trim()}><Send size={17} />{busy ? "Aguardando resposta..." : "Enviar mensagem"}</button></div></form></Card>}
          {user?.role === "ADMIN" && <Card><div className="flex items-center gap-2"><FlaskConical size={18} className="text-[var(--accent)]" /><h3 className="font-semibold">Diagnóstico local</h3></div><p className="mt-2 text-xs text-[var(--text-secondary)]">Metadados sanitizados das suas próprias execuções.</p>{diagnostics.length ? <div className="mt-4 space-y-3">{diagnostics.map((run) => <dl key={run.id} className="grid gap-2 rounded-xl border border-[var(--border)] p-3 text-xs sm:grid-cols-2 xl:grid-cols-3">{([["Policy", run.policy], ["Provider lógico", run.provider], ["Model alias", run.modelAlias], ["Status", run.status], ["Fallback", run.fallbackUsed ? "Sim" : "Não"], ["Motivo do fallback", run.fallbackReason], ["Tentativas", run.attemptCount], ["Duração", `${run.durationMs} ms`], ["Tokens de entrada, estimativa", run.inputTokenEstimate], ["Tokens de saída, estimativa", run.outputTokenEstimate], ["Código de erro", run.errorCode]] as const).map(([label, value]) => <div key={label}><dt className="text-[var(--text-tertiary)]">{label}</dt><dd className="mt-1 break-words font-semibold">{value ?? "-"}</dd></div>)}</dl>)}</div> : <p className="mt-4 text-sm text-[var(--text-secondary)]">Nenhuma execução nesta conversa.</p>}</Card>}
        </> : <EmptyState />}
        {user?.role === "ADMIN" && <Card><div className="flex items-center gap-2"><Clock3 size={18} className="text-[var(--accent)]" /><h3 className="font-semibold">Demonstração local</h3></div><p className="mt-2 text-sm text-[var(--text-secondary)]">Simule o próximo envio nesta aba. Estes controles não usam serviços externos.</p><label className="mt-4 block text-sm font-medium">Cenário do provider<select aria-label="Cenário do provider" className="workspace-select mt-1" value={demoPreset} disabled={busy} onChange={(event) => configureDemo(event.target.value as LocalDemoPreset)}>{localDemoPresets.map((preset) => <option key={preset} value={preset}>{demoLabels[preset]}</option>)}</select></label></Card>}
      </div>
    </div>
    <Drawer open={Boolean(citation || citationError)} title="Fonte autorizada" onClose={() => { setCitation(null); setCitationError(null); }}>{citationError ? <div role="alert" className="text-sm text-[var(--danger)]">{citationError}</div> : citation && <div className="space-y-4"><div><p className="workspace-section-label">Base de conhecimento</p><h3 className="mt-2 text-xl font-semibold">{citation.title}</h3></div><Badge>Versão {citation.version}</Badge><div><p className="workspace-section-label">Trecho e conteúdo autorizado</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[var(--text-secondary)]">{citation.content}</p></div></div>}</Drawer>
  </div></AppShell>;
}

export default function AtenaPage() { const { user } = useAuth(); return <RequireAuth><AtenaContent key={user?.id} /></RequireAuth>; }
