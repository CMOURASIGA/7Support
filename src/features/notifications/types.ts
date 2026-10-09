export const notificationTypes = [
  "SLA_BREACHED",
  "SATISFACTION_ALERT",
  "TICKET_CREATED",
  "TICKET_ASSIGNED",
  "TICKET_TRANSFERRED",
  "SUPPORT_PUBLIC_REPLY",
  "CLIENT_PUBLIC_REPLY",
  "TICKET_RESOLVED",
  "TICKET_REOPENED",
] as const;

export type NotificationType = (typeof notificationTypes)[number];
export type NotificationStatus = "UNREAD" | "READ";
export type DeliveryStatus = "PENDING" | "SENT" | "FAILED";

export type Notification = {
  id: string;
  tenantId: string;
  userId: string;
  ticketId: string;
  eventId: string;
  type: NotificationType;
  title: string;
  body: string;
  status: NotificationStatus;
  readAt: string | null;
  createdAt: string;
  idempotencyKey: string;
};

export type NotificationDelivery = {
  id: string;
  notificationId: string;
  channel: "LOCAL";
  provider: "LOCAL_MOCK";
  status: DeliveryStatus;
  attemptCount: number;
  lastAttemptAt: string | null;
  deliveredAt: string | null;
  providerMessageId: string | null;
  errorCode: string | null;
};

export type NotificationDatabase = {
  version: 1;
  notifications: Notification[];
  deliveries: NotificationDelivery[];
};

export type NotificationWithDelivery = Notification & { delivery: NotificationDelivery | null };

export type TicketNotificationEvent = {
  id: string;
  type: NotificationType;
  tenantId: string;
  ticketId: string;
  ticketCode: string;
  subject: string;
  productName: string;
  clientName: string;
  priority: string;
  requesterUserId: string;
  assignedToUserId: string | null;
};

export const notificationTypeLabels: Record<NotificationType, string> = {
  SLA_BREACHED: "Prazo SLA excedido",
  SATISFACTION_ALERT: "Avaliação requer atenção",
  TICKET_CREATED: "Chamado criado",
  TICKET_ASSIGNED: "Novo chamado atribuído",
  TICKET_TRANSFERRED: "Chamado transferido",
  SUPPORT_PUBLIC_REPLY: "Nova resposta do suporte",
  CLIENT_PUBLIC_REPLY: "Nova resposta do cliente",
  TICKET_RESOLVED: "Chamado resolvido",
  TICKET_REOPENED: "Chamado reaberto",
};
