"use client";
import { useCallback, useEffect, useState } from "react";
import type { SatisfactionOpportunity } from "./types";
import { satisfactionService } from "@/services/satisfaction/service";

export function useSatisfaction(ticketId: string) {
  const [opportunities, setOpportunities] = useState<SatisfactionOpportunity[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const refresh = useCallback(async () => { setLoading(true); setError(""); try { setOpportunities(await satisfactionService.listForTicket(ticketId)); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar a avaliação."); } finally { setLoading(false); } }, [ticketId]);
  useEffect(() => { void refresh(); return satisfactionService.subscribe(() => void refresh()); }, [refresh]);
  return { opportunities, loading, error, refresh };
}
