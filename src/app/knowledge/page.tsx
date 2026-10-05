"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PlusCircle, Search } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { KnowledgeCard, KnowledgeDrawer, type KnowledgeDisplay } from "@/components/knowledge/knowledge-ui";
import { PageHeading } from "@/components/tickets/ticket-ui";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { RequireAuth } from "@/features/auth/require-auth";
import { useAuth } from "@/features/auth/auth-context";
import { knowledgeCategories, knowledgeCategoryLabels, knowledgeStatuses, knowledgeStatusLabels, knowledgeVisibilities, knowledgeVisibilityLabels, type AuthorizedKnowledge, type KnowledgeCategory, type KnowledgeFilters, type KnowledgeStatus, type KnowledgeVisibility, type ManagedKnowledge } from "@/features/knowledge/types";
import { useKnowledgeCatalog } from "@/features/knowledge/use-knowledge";

function display(item: AuthorizedKnowledge | ManagedKnowledge): KnowledgeDisplay {
  if ("source" in item) return { sourceId: item.source.id, title: item.latestVersion.title, content: item.latestVersion.content, productName: item.productName, category: item.latestVersion.category, visibility: item.latestVersion.visibility, status: item.latestVersion.status, version: item.latestVersion.version, publishedAt: item.latestVersion.publishedAt };
  return { sourceId: item.sourceId, title: item.title, content: item.content, productName: item.productName, category: item.category, visibility: item.visibility, status: "PUBLISHED", version: item.version, publishedAt: item.publishedAt };
}

function KnowledgeContent() {
  const { user, products } = useAuth();
  const [query, setQuery] = useState(""); const [productId, setProductId] = useState("");
  const [category, setCategory] = useState<KnowledgeCategory | "">(""); const [status, setStatus] = useState<KnowledgeStatus | "">("");
  const [visibility, setVisibility] = useState<KnowledgeVisibility | "">(""); const [selected, setSelected] = useState<KnowledgeDisplay | null>(null);
  const filters = useMemo<KnowledgeFilters>(() => ({ query, productId, category, status: user?.role === "ADMIN" ? status : "", visibility: user?.role === "CLIENT" ? "" : visibility }), [query, productId, category, status, visibility, user?.role]);
  const { items, loading, error, refresh } = useKnowledgeCatalog(user?.role, filters);
  const admin = user?.role === "ADMIN";
  return <AppShell><div className="mx-auto w-full max-w-7xl space-y-5"><PageHeading eyebrow="Conhecimento autorizado" title="Base de conhecimento" description={admin ? "Gerencie o ciclo editorial e consulte todas as versões atuais." : "Consulte orientações publicadas e autorizadas para o seu perfil."} action={admin ? <Link href="/admin/knowledge/new" className="workspace-button-primary"><PlusCircle size={17} />Novo conteúdo</Link> : undefined} />
    <Card><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"><label className="relative text-sm font-medium xl:col-span-2"><span className="sr-only">Busca</span><Search size={17} className="pointer-events-none absolute left-3 top-3 text-[var(--text-tertiary)]" /><input aria-label="Busca" className="workspace-input pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título, conteúdo, categoria ou produto" /></label><select aria-label="Produto" className="workspace-select" value={productId} onChange={(event) => setProductId(event.target.value)}><option value="">Todos os produtos</option>{products.map((product) => <option key={product.id} value={product.id}>{product.displayName}</option>)}</select><select aria-label="Categoria" className="workspace-select" value={category} onChange={(event) => setCategory(event.target.value as KnowledgeCategory | "")}><option value="">Todas as categorias</option>{knowledgeCategories.map((item) => <option key={item} value={item}>{knowledgeCategoryLabels[item]}</option>)}</select>{admin ? <select aria-label="Status" className="workspace-select" value={status} onChange={(event) => setStatus(event.target.value as KnowledgeStatus | "")}><option value="">Todos os status</option>{knowledgeStatuses.map((item) => <option key={item} value={item}>{knowledgeStatusLabels[item]}</option>)}</select> : user?.role === "SUPPORT" ? <select aria-label="Visibilidade" className="workspace-select" value={visibility} onChange={(event) => setVisibility(event.target.value as KnowledgeVisibility | "")}><option value="">Todas as visibilidades</option>{knowledgeVisibilities.map((item) => <option key={item} value={item}>{knowledgeVisibilityLabels[item]}</option>)}</select> : null}</div></Card>
    {loading ? <LoadingState /> : error ? <div role="alert"><ErrorState /><p className="mt-2 text-sm text-[var(--danger)]">{error}</p><button type="button" className="workspace-button-secondary mt-3" onClick={() => void refresh()}>Tentar novamente</button></div> : items.length ? <><p className="text-sm text-[var(--text-secondary)]">{items.length} conteúdo{items.length === 1 ? " autorizado" : "s autorizados"} encontrado{items.length === 1 ? "" : "s"}.</p><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((item) => { const value = display(item); return <KnowledgeCard key={`${value.sourceId}-${value.version}`} item={value} admin={admin} onView={setSelected} />; })}</div></> : <EmptyState />}
    <KnowledgeDrawer item={selected} admin={admin} onClose={() => setSelected(null)} />
  </div></AppShell>;
}

export default function KnowledgePage() { return <RequireAuth><KnowledgeContent /></RequireAuth>; }
