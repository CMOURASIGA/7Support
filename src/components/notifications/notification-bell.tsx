"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, List } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { Tooltip } from "@/components/ui/tooltip";
import { NotificationList, NotificationDrawer } from "@/components/notifications/notification-ui";
import { useNotifications } from "@/features/notifications/use-notifications";
import type { NotificationWithDelivery } from "@/features/notifications/types";
import type { Role } from "@/types/identity";
import { notificationService } from "@/services/notifications/service";

export function NotificationBell({ role }: { role: Role }) {
  const { notifications, unreadCount, loading, error } = useNotifications();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<NotificationWithDelivery | null>(null);
  async function markRead(notification: NotificationWithDelivery) {
    if (notification.status === "UNREAD") await notificationService.markAsRead(notification.id);
    setSelected((current) => current?.id === notification.id ? { ...current, status: "READ", readAt: new Date().toISOString() } : current);
  }
  return <>
    <Tooltip label="Notificações"><button type="button" aria-label={`Notificações${unreadCount ? `, ${unreadCount} não ${unreadCount === 1 ? "lida" : "lidas"}` : ""}`} className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white text-[var(--accent)] hover:bg-[var(--bg-muted)]" onClick={() => setOpen(true)}><Bell size={19} />{unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}</button></Tooltip>
    <Drawer open={open} onClose={() => setOpen(false)} title="Notificações"><div className="space-y-4"><div className="flex items-center justify-between gap-2"><p className="text-sm text-[var(--text-secondary)]">{unreadCount} não lida{unreadCount === 1 ? "" : "s"}</p><Link href="/notifications" onClick={() => setOpen(false)} className="workspace-button-secondary"><List size={16} />Ver central</Link></div>{loading ? <p className="text-sm text-[var(--text-secondary)]">Carregando notificações...</p> : error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : <NotificationList notifications={notifications.slice(0, 6)} onSelect={(item) => { setOpen(false); setSelected(item); }} />}</div></Drawer>
    <NotificationDrawer notification={selected} role={role} onClose={() => setSelected(null)} onRead={markRead} />
  </>;
}
