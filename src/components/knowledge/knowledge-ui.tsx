"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Eye, Pencil } from "lucide-react";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { knowledgeCategories, knowledgeCategoryLabels, knowledgeStatusLabels, knowledgeVisibilities, knowledgeVisibilityLabels, type KnowledgeCategory, type KnowledgeInput, type KnowledgeStatus, type KnowledgeVisibility } from "@/features/knowledge/types";
import type { LocalProduct } from "@/types/identity";

const statusTones: Record<KnowledgeStatus, "neutral" | "info" | "warning" | "success"> = { DRAFT: "neutral", IN_REVIEW: "warning", PUBLISHED: "success", ARCHIVED: "neutral" };
const visibilityTones: Record<KnowledgeVisibility, "neutral" | "info" | "warning"> = { CLIENT: "info", INTERNAL: "warning", BOTH: "neutral" };

export function KnowledgeStatusBadge({ status }: { status: KnowledgeStatus }) { return <Badge tone={statusTones[status]}>{knowledgeStatusLabels[status]}</Badge>; }
export function KnowledgeVisibilityBadge({ visibility }: { visibility: KnowledgeVisibility }) { return <Badge tone={visibilityTones[visibility]}>{knowledgeVisibilityLabels[visibility]}</Badge>; }
export function KnowledgeCategoryBadge({ category }: { category: KnowledgeCategory }) { return <Badge>{knowledgeCategoryLabels[category]}</Badge>; }

export type KnowledgeDisplay = {
  sourceId: string;
  title: string;
  content: string;
  productName: string;
  category: KnowledgeCategory;
  visibility: KnowledgeVisibility;
  status: KnowledgeStatus;
  version: number;
  publishedAt: string | null;
};

export function KnowledgeCard({ item, admin, onView }: { item: KnowledgeDisplay; admin: boolean; onView: (item: KnowledgeDisplay) => void }) {
  return <Card className="flex flex-col gap-4"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]"><BookOpen size={19} /></span><div className="min-w-0 flex-1"><p className="workspace-section-label">{item.productName}</p><h3 className="mt-1 text-base font-semibold text-[var(--text-primary)]">{item.title}</h3></div></div><p className="line-clamp-3 text-sm leading-6 text-[var(--text-secondary)]">{item.content}</p><div className="flex flex-wrap gap-2"><KnowledgeCategoryBadge category={item.category} /><KnowledgeVisibilityBadge visibility={item.visibility} />{admin && <KnowledgeStatusBadge status={item.status} />}<Badge>v{item.version}</Badge></div><div className="mt-auto flex justify-end gap-2"><ActionButton compact label={`Visualizar ${item.title}`} icon={<Eye size={18} />} onClick={() => onView(item)} />{admin && <Link href={`/admin/knowledge/${item.sourceId}`} aria-label={`Gerenciar ${item.title}`} title="Gerenciar conteúdo" className="workspace-button-secondary workspace-button-icon"><Pencil size={18} /></Link>}</div></Card>;
}

export function KnowledgeDrawer({ item, admin, onClose }: { item: KnowledgeDisplay | null; admin: boolean; onClose: () => void }) {
  return <Drawer open={Boolean(item)} onClose={onClose} title="Conteúdo da base">{item && <div className="space-y-5"><div><p className="workspace-section-label">{item.productName}</p><h3 className="mt-2 text-xl font-semibold">{item.title}</h3></div><div className="flex flex-wrap gap-2"><KnowledgeCategoryBadge category={item.category} /><KnowledgeVisibilityBadge visibility={item.visibility} />{admin && <KnowledgeStatusBadge status={item.status} />}<Badge>Versão {item.version}</Badge></div><div><p className="workspace-section-label">Conteúdo</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{item.content}</p></div>{admin && <Link href={`/admin/knowledge/${item.sourceId}`} onClick={onClose} className="workspace-button-primary">Gerenciar conteúdo <ArrowRight size={17} /></Link>}</div>}</Drawer>;
}

export function KnowledgeForm({ products, initial, lockProduct = false, submitLabel, busy, onSubmit }: { products: LocalProduct[]; initial?: KnowledgeInput; lockProduct?: boolean; submitLabel: string; busy: boolean; onSubmit: (input: KnowledgeInput) => Promise<void> }) {
  const [productId, setProductId] = useState(initial?.productId ?? products[0]?.id ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState<KnowledgeCategory>(initial?.category ?? "GUIDE");
  const [visibility, setVisibility] = useState<KnowledgeVisibility>(initial?.visibility ?? "CLIENT");
  const [content, setContent] = useState(initial?.content ?? "");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({ productId, title, category, visibility, content });
  }
  return <form className="space-y-4" onSubmit={(event) => void submit(event)}><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Produto<select aria-label="Produto" className="workspace-select mt-1" value={productId} disabled={busy || lockProduct} onChange={(event) => setProductId(event.target.value)}>{products.map((product) => <option key={product.id} value={product.id}>{product.displayName}</option>)}</select></label><label className="text-sm font-medium">Categoria<select aria-label="Categoria" className="workspace-select mt-1" value={category} disabled={busy} onChange={(event) => setCategory(event.target.value as KnowledgeCategory)}>{knowledgeCategories.map((item) => <option key={item} value={item}>{knowledgeCategoryLabels[item]}</option>)}</select></label></div><label className="block text-sm font-medium">Título<input aria-label="Título" className="workspace-input mt-1" required maxLength={180} value={title} disabled={busy} onChange={(event) => setTitle(event.target.value)} /></label><label className="block text-sm font-medium">Visibilidade<select aria-label="Visibilidade" className="workspace-select mt-1" value={visibility} disabled={busy} onChange={(event) => setVisibility(event.target.value as KnowledgeVisibility)}>{knowledgeVisibilities.map((item) => <option key={item} value={item}>{knowledgeVisibilityLabels[item]}</option>)}</select></label><label className="block text-sm font-medium">Conteúdo<textarea aria-label="Conteúdo" className="workspace-textarea mt-1 min-h-64" required maxLength={30000} value={content} disabled={busy} onChange={(event) => setContent(event.target.value)} /></label><button type="submit" disabled={busy} className="workspace-button-primary">{busy ? "Salvando..." : submitLabel}<ArrowRight size={17} /></button></form>;
}
