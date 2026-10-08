import type { LocalUser, Role } from "@/types/identity";
import type { Notification, NotificationDelivery, NotificationType, NotificationWithDelivery, TicketNotificationEvent } from "@/features/notifications/types";
import { localIdentityStore } from "@/services/local-identity/store";
import { localNotificationRepository } from "@/services/notifications/local-repository";
import type { NotificationRepository } from "@/services/notifications/repository";
import { localDeliveryProvider } from "@/services/notifications/local-delivery-provider";
import { demoOperators } from "@/services/tickets/operators";
import type { DeliveryProvider } from "@/services/notifications/provider";

export class NotificationError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND", message: string) { super(message); }
}

type Candidate = { userId: string; title: string; body: string };

function currentUser() {
  const user = localIdentityStore.currentUser();
  if (!user) throw new NotificationError("UNAUTHENTICATED", "Faça login para acessar notificações.");
  return user;
}

function candidateFor(event: TicketNotificationEvent): Candidate | null {
  switch (event.type) {
    case "SLA_BREACHED":
      return event.assignedToUserId && demoOperators.some(operator => operator.id === event.assignedToUserId)
        ? { userId: event.assignedToUserId, title: `Prazo excedido em ${event.ticketCode}`, body: `Revise o SLA do chamado ${event.subject} em ${event.productName}.` } : null;
    case "TICKET_CREATED":
      return { userId: event.requesterUserId, title: `${event.ticketCode} aberto com sucesso`, body: `Recebemos seu chamado sobre ${event.subject} em ${event.productName}.` };
    case "TICKET_ASSIGNED":
      return event.assignedToUserId ? { userId: event.assignedToUserId, title: `${event.ticketCode} atribuído a você`, body: `${event.clientName} · ${event.subject} · Prioridade ${event.priority}.` } : null;
    case "TICKET_TRANSFERRED":
      return event.assignedToUserId ? { userId: event.assignedToUserId, title: `${event.ticketCode} transferido para você`, body: `${event.clientName} · ${event.subject} · Prioridade ${event.priority}.` } : null;
    case "SUPPORT_PUBLIC_REPLY":
      return { userId: event.requesterUserId, title: `Nova resposta em ${event.ticketCode}`, body: `O suporte publicou uma nova resposta no chamado ${event.subject}. Consulte o histórico.` };
    case "CLIENT_PUBLIC_REPLY":
      return event.assignedToUserId ? { userId: event.assignedToUserId, title: `Cliente respondeu em ${event.ticketCode}`, body: `${event.clientName} respondeu ao chamado ${event.subject}. Consulte o histórico.` } : null;
    case "TICKET_RESOLVED":
      return { userId: event.requesterUserId, title: `${event.ticketCode} foi resolvido`, body: `O chamado ${event.subject} foi resolvido. Consulte o histórico para ver os detalhes.` };
    case "TICKET_REOPENED":
      return event.assignedToUserId ? { userId: event.assignedToUserId, title: `${event.ticketCode} foi reaberto`, body: `O chamado ${event.subject} voltou para atendimento. Consulte o histórico.` } : null;
  }
}

function canRead(user: LocalUser, notification: Notification) {
  if (notification.userId !== user.id) return false;
  return user.role !== "CLIENT" || notification.tenantId === user.clientId;
}

export class NotificationService {
  constructor(private readonly repository: NotificationRepository, private readonly provider: DeliveryProvider) {}

  subscribe(listener: () => void) { return this.repository.subscribe(listener); }

  async list(): Promise<NotificationWithDelivery[]> {
    const user = currentUser();
    const database = await this.repository.read();
    return database.notifications
      .filter((item) => canRead(user, item))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => ({ ...item, delivery: database.deliveries.find((delivery) => delivery.notificationId === item.id) ?? null }));
  }

  async unreadCount() { return (await this.list()).filter((item) => item.status === "UNREAD").length; }

  async get(id: string) {
    const user = currentUser();
    const database = await this.repository.read();
    const notification = database.notifications.find((item) => item.id === id);
    if (!notification || !canRead(user, notification)) throw new NotificationError("NOT_FOUND", "Notificação não encontrada.");
    return { ...notification, delivery: database.deliveries.find((item) => item.notificationId === notification.id) ?? null };
  }

  async markAsRead(id: string) {
    const user = currentUser();
    return this.repository.transact((database) => {
      const notification = database.notifications.find((item) => item.id === id);
      if (!notification || !canRead(user, notification)) throw new NotificationError("NOT_FOUND", "Notificação não encontrada.");
      if (notification.status === "UNREAD") {
        notification.status = "READ";
        notification.readAt = new Date().toISOString();
      }
      return notification;
    });
  }

  navigationPath(notification: Notification, role: Role) {
    return role === "CLIENT" ? `/tickets/${notification.ticketId}` : `/support/tickets/${notification.ticketId}`;
  }

  async process(event: TicketNotificationEvent): Promise<NotificationWithDelivery | null> {
    const candidate = candidateFor(event);
    if (!candidate) return null;
    const idempotencyKey = event.type === "SLA_BREACHED" ? event.id : `${event.id}:${candidate.userId}:${event.type}`;
    const createdAt = new Date().toISOString();
    const result = await this.repository.transact((database) => {
      const existing = database.notifications.find((item) => item.idempotencyKey === idempotencyKey);
      if (existing) return { created: false, notification: existing, delivery: database.deliveries.find((item) => item.notificationId === existing.id) ?? null };
      const notification: Notification = {
        id: crypto.randomUUID(), tenantId: event.tenantId, userId: candidate.userId, ticketId: event.ticketId,
        eventId: event.id, type: event.type, title: candidate.title, body: candidate.body,
        status: "UNREAD", readAt: null, createdAt, idempotencyKey,
      };
      const delivery: NotificationDelivery = {
        id: crypto.randomUUID(), notificationId: notification.id, channel: "LOCAL", provider: "LOCAL_MOCK",
        status: "PENDING", attemptCount: 0, lastAttemptAt: null, deliveredAt: null, providerMessageId: null, errorCode: null,
      };
      database.notifications.push(notification);
      database.deliveries.push(delivery);
      return { created: true, notification, delivery };
    });
    if (!result.created || !result.delivery) return { ...result.notification, delivery: result.delivery };
    const attemptedAt = new Date().toISOString();
    try {
      const sent = await this.provider.send({ notificationId: result.notification.id, recipientUserId: candidate.userId, title: candidate.title, body: candidate.body });
      const delivery = await this.repository.transact((database) => {
        const current = database.deliveries.find((item) => item.id === result.delivery!.id)!;
        current.status = "SENT"; current.attemptCount = 1; current.lastAttemptAt = attemptedAt;
        current.deliveredAt = sent.deliveredAt; current.providerMessageId = sent.providerMessageId; current.errorCode = null;
        return current;
      });
      return { ...result.notification, delivery };
    } catch {
      const delivery = await this.repository.transact((database) => {
        const current = database.deliveries.find((item) => item.id === result.delivery!.id)!;
        current.status = "FAILED"; current.attemptCount = 1; current.lastAttemptAt = attemptedAt;
        current.deliveredAt = null; current.providerMessageId = null; current.errorCode = "LOCAL_PROVIDER_FAILURE";
        return current;
      });
      return { ...result.notification, delivery };
    }
  }
}

export const notificationService = new NotificationService(localNotificationRepository, localDeliveryProvider);

export function ticketNotificationEvent(event: Omit<TicketNotificationEvent, "type">, type: NotificationType): TicketNotificationEvent {
  return { ...event, type };
}
