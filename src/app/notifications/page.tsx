"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCheck, FlaskConical } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { PageHeading } from "@/components/tickets/ticket-ui";
import { NotificationDrawer, NotificationList } from "@/components/notifications/notification-ui";
import { RequireAuth } from "@/features/auth/require-auth";
import { useAuth } from "@/features/auth/auth-context";
import { useNotifications } from "@/features/notifications/use-notifications";
import type { NotificationWithDelivery } from "@/features/notifications/types";
import { notificationService } from "@/services/notifications/service";
import { localDeliveryProvider, type LocalDeliveryMode } from "@/services/notifications/local-delivery-provider";
import { useToast } from "@/components/ui/toast";

function NotificationsContent() {
  const { user } = useAuth();
  const { notifications, unreadCount, loading, error, refresh } = useNotifications();
  const { notify } = useToast();
  const [filter, setFilter] = useState<"ALL" | "UNREAD">("ALL");
  const [selected, setSelected] = useState<NotificationWithDelivery | null>(null);
  const [deliveryMode, setDeliveryMode] = useState<LocalDeliveryMode>("SUCCESS");
  useEffect(() => {
    setDeliveryMode(localDeliveryProvider.mode());
    return localDeliveryProvider.subscribe(() => setDeliveryMode(localDeliveryProvider.mode()));
  }, []);
  async function markRead(notification: NotificationWithDelivery) {
    try {
      await notificationService.markAsRead(notification.id);
      setSelected((current) => current?.id === notification.id ? { ...current, status: "READ", readAt: new Date().toISOString() } : current);
      notify("Notificação marcada como lida.");
      await refresh();
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível atualizar a notificação.", "error"); }
  }
  async function markAllRead() {
    try {
      await Promise.all(notifications.filter((item) => item.status === "UNREAD").map((item) => notificationService.markAsRead(item.id)));
      notify("Todas as notificações foram marcadas como lidas.");
      await refresh();
    } catch (cause) { notify(cause instanceof Error ? cause.message : "Não foi possível atualizar as notificações.", "error"); }
  }
  function changeMode(mode: LocalDeliveryMode) {
    localDeliveryProvider.setMode(mode); setDeliveryMode(mode);
    notify(mode === "FAILURE" ? "A próxima entrega local será simulada como falha." : "Entregas locais voltarão a simular sucesso.");
  }
  const visible = filter === "UNREAD" ? notifications.filter((item) => item.status === "UNREAD") : notifications;
  return <AppShell><div className="mx-auto w-full max-w-6xl space-y-5">
    <PageHeading eyebrow="Comunicação local" title="Central de notificações" description="Acompanhe eventos dos chamados destinados à sua identidade. Toasts continuam sendo apenas feedback imediato das ações." action={unreadCount > 0 ? <button type="button" className="workspace-button-secondary" onClick={() => void markAllRead()}><CheckCheck size={17} />Marcar todas como lidas</button> : undefined} />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Suas notificações</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">{unreadCount} não lida{unreadCount === 1 ? "" : "s"}</p></div><div className="flex gap-2" role="group" aria-label="Filtrar notificações"><button type="button" aria-pressed={filter === "ALL"} className={filter === "ALL" ? "workspace-button-primary" : "workspace-button-secondary"} onClick={() => setFilter("ALL")}>Todas</button><button type="button" aria-pressed={filter === "UNREAD"} className={filter === "UNREAD" ? "workspace-button-primary" : "workspace-button-secondary"} onClick={() => setFilter("UNREAD")}>Não lidas</button></div></div>{loading ? <LoadingState /> : error ? <div role="alert"><ErrorState /><button type="button" className="workspace-button-secondary mt-3" onClick={() => void refresh()}>Tentar novamente</button></div> : <NotificationList notifications={visible} onSelect={setSelected} />}</Card>
      <Card><div className="flex items-center gap-2"><FlaskConical size={18} className="text-[var(--accent)]" /><h3 className="font-semibold">Provider local</h3></div><p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Controle exclusivo da demonstração. A falha não remove a notificação persistida.</p><label className="mt-4 block text-sm font-medium" htmlFor="delivery-mode">Simulação de entrega</label><select id="delivery-mode" className="workspace-select mt-1" value={deliveryMode} onChange={(event) => changeMode(event.target.value as LocalDeliveryMode)}><option value="SUCCESS">Sucesso</option><option value="FAILURE">Falha</option></select><div className="mt-4 rounded-xl bg-[var(--bg-muted)] p-3 text-xs leading-5 text-[var(--text-secondary)]"><Bell size={15} className="mb-2 text-[var(--accent)]" />Sem Gmail, credenciais, cloud ou serviços externos.</div></Card>
    </div>
    {user && <NotificationDrawer notification={selected} role={user.role} onClose={() => setSelected(null)} onRead={markRead} />}
  </div></AppShell>;
}

export default function NotificationsPage() { return <RequireAuth><NotificationsContent /></RequireAuth>; }
