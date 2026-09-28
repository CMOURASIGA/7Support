"use client";

import { useCallback, useEffect, useState } from "react";
import { ticketService } from "@/services/tickets/service";
import type { Ticket } from "@/features/tickets/types";

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setTickets(await ticketService.list()); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível carregar chamados."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); return ticketService.subscribe(() => void refresh()); }, [refresh]);
  return { tickets, loading, error, refresh };
}
export function useTicket(id: string) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setTicket(await ticketService.get(id)); setError(null); }
    catch (cause) { setTicket(null); setError(cause instanceof Error ? cause.message : "Não foi possível carregar o chamado."); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { void refresh(); return ticketService.subscribe(() => void refresh()); }, [refresh]);
  return { ticket, loading, error, refresh };
}
