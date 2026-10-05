"use client";

import { useCallback, useEffect, useState } from "react";
import type { NotificationWithDelivery } from "@/features/notifications/types";
import { notificationService } from "@/services/notifications/service";

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationWithDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try { setNotifications(await notificationService.list()); setError(null); }
    catch (cause) { setNotifications([]); setError(cause instanceof Error ? cause.message : "Não foi possível carregar notificações."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); return notificationService.subscribe(() => void refresh()); }, [refresh]);
  return { notifications, unreadCount: notifications.filter((item) => item.status === "UNREAD").length, loading, error, refresh };
}
