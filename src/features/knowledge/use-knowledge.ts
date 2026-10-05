"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthorizedKnowledge, KnowledgeFilters, KnowledgeManagementDetail, ManagedKnowledge } from "@/features/knowledge/types";
import { knowledgeService } from "@/services/knowledge/service";
import type { Role } from "@/types/identity";

export function useKnowledgeCatalog(role: Role | undefined, filters: KnowledgeFilters) {
  const [items, setItems] = useState<Array<AuthorizedKnowledge | ManagedKnowledge>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!role) return;
    try {
      setItems(role === "ADMIN" ? await knowledgeService.listAdmin(filters) : await knowledgeService.listAuthorized(filters));
      setError(null);
    } catch (cause) { setItems([]); setError(cause instanceof Error ? cause.message : "Não foi possível carregar a base de conhecimento."); }
    finally { setLoading(false); }
  }, [role, filters]);
  useEffect(() => { void refresh(); return knowledgeService.subscribe(() => void refresh()); }, [refresh]);
  return { items, loading, error, refresh };
}

export function useKnowledgeAdminDetail(sourceId: string) {
  const [detail, setDetail] = useState<KnowledgeManagementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setDetail(await knowledgeService.getAdmin(sourceId)); setError(null); }
    catch (cause) { setDetail(null); setError(cause instanceof Error ? cause.message : "Não foi possível carregar o conteúdo."); }
    finally { setLoading(false); }
  }, [sourceId]);
  useEffect(() => { void refresh(); return knowledgeService.subscribe(() => void refresh()); }, [refresh]);
  return { detail, loading, error, refresh };
}
