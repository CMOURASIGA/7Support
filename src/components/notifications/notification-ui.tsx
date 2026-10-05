"use client";

import Link from "next/link";
import { ArrowRight, Bell, Check, Circle, MailCheck, MailWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/states";
import { cn } from "@/lib/cn";
import { formatDate } from "@/components/tickets/ticket-ui";
import type { NotificationWithDelivery } from "@/features/notifications/types";
import { notificationTypeLabels } from "@/features/notifications/types";
import type { Role } from "@/types/identity";
import { notificationService } from "@/services/notifications/service";

export function DeliveryBadge({ notification }: { notification: NotificationWithDelivery }) {
  if (notification.delivery?.status === "FAILED") return <Badge tone="danger"><MailWarning size={13} />Falha local</Badge>;
  if (notification.delivery?.status === "SENT") return <Badge tone="success"><MailCheck size={13} />Entregue localmente</Badge>;
  return <Badge tone="warning">Pendente</Badge>;
}

export function NotificationList({ notifications, onSelect }: { notifications: NotificationWithDelivery[]; onSelect: (notification: NotificationWithDelivery) => void }) {
  if (!notifications.length) return <EmptyState />;
  return <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
    {notifications.map((notification) => <button key={notification.id} type="button" onClick={() => onSelect(notification)} className={cn("flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-[var(--bg-muted)]", notification.status === "UNREAD" && "bg-[var(--accent-soft)]/45")}>
      <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", notification.status === "UNREAD" ? "bg-[var(--accent)] text-white" : "bg-[var(--bg-muted)] text-[var(--text-tertiary)]")}><Bell size={17} /></span>
      <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-[var(--text-primary)]">{notification.title}</strong>{notification.status === "UNREAD" && <span className="h-2 w-2 rounded-full bg-[var(--brand-highlight)]" aria-label="Não lida" />}</span><span className="mt-1 block line-clamp-2 text-sm leading-5 text-[var(--text-secondary)]">{notification.body}</span><span className="mt-2 block text-xs text-[var(--text-tertiary)]">{formatDate(notification.createdAt)}</span></span>
      <ArrowRight size={17} className="mt-2 shrink-0 text-[var(--text-tertiary)]" />
    </button>)}
  </div>;
}

export function NotificationDrawer({ notification, role, onClose, onRead }: { notification: NotificationWithDelivery | null; role: Role; onClose: () => void; onRead: (notification: NotificationWithDelivery) => Promise<void> }) {
  const href = notification ? notificationService.navigationPath(notification, role) : "#";
  return <Drawer open={Boolean(notification)} onClose={onClose} title="Detalhe da notificação">{notification && <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-2"><Badge tone={notification.status === "UNREAD" ? "info" : "neutral"}>{notification.status === "UNREAD" ? <><Circle size={12} />Não lida</> : <><Check size={12} />Lida</>}</Badge><DeliveryBadge notification={notification} /></div>
    <div><p className="workspace-section-label">{notificationTypeLabels[notification.type]}</p><h3 className="mt-2 text-xl font-semibold">{notification.title}</h3><p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{notification.body}</p></div>
    <dl className="grid gap-3 rounded-xl bg-[var(--bg-muted)] p-4 text-sm"><div><dt className="text-[var(--text-tertiary)]">Criada em</dt><dd className="mt-1">{formatDate(notification.createdAt)}</dd></div>{notification.readAt && <div><dt className="text-[var(--text-tertiary)]">Lida em</dt><dd className="mt-1">{formatDate(notification.readAt)}</dd></div>}</dl>
    <div className="flex flex-wrap gap-2">{notification.status === "UNREAD" && <button type="button" className="workspace-button-secondary" onClick={() => void onRead(notification)}><Check size={17} />Marcar como lida</button>}<Link href={href} onClick={() => { void onRead(notification); onClose(); }} className="workspace-button-primary">Abrir chamado <ArrowRight size={17} /></Link></div>
  </div>}</Drawer>;
}
