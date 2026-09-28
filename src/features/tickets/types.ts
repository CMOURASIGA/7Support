export const ticketTypes = ["QUESTION", "INCIDENT", "SERVICE_REQUEST", "ACCESS", "IMPROVEMENT"] as const;
export type TicketType = (typeof ticketTypes)[number];
export const impacts = ["LOW_IMPACT", "PARTIAL_IMPACT", "BLOCKING"] as const;
export type TicketImpact = (typeof impacts)[number];
export const ticketStatuses = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "UNDER_ANALYSIS", "RESOLVED", "CLOSED", "REOPENED"] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

export type TicketAttachment = {
  id: string;
  ticketId: string;
  messageId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt: string;
  // Apenas o adaptador local guarda bytes em data URL. Um adaptador futuro usará storagePath privado.
  dataUrl: string;
};
export type TicketMessage = {
  id: string;
  ticketId: string;
  authorUserId: string;
  authorName: string;
  authorType: "CLIENT" | "SUPPORT";
  visibility: "PUBLIC_REPLY";
  body: string;
  createdAt: string;
  attachments: TicketAttachment[];
};
export type TicketEvent = {
  id: string;
  ticketId: string;
  eventType: "CREATED" | "PUBLIC_REPLY_CREATED" | "STATUS_CHANGED";
  actorUserId: string | null;
  createdAt: string;
  oldStatus?: TicketStatus;
  newStatus?: TicketStatus;
  description: string;
};
export type Ticket = {
  id: string;
  publicNumber: number;
  publicCode: string;
  clientId: string;
  clientNameSnapshot: string;
  requesterUserId: string;
  requesterNameSnapshot: string;
  requesterEmailSnapshot: string;
  productId: string;
  productNameSnapshot: string;
  type: TicketType;
  impact: TicketImpact;
  status: TicketStatus;
  subject: string;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
  events: TicketEvent[];
};
export type AttachmentInput = { originalFilename: string; mimeType: string; sizeBytes: number; dataUrl: string };
export type NewTicketInput = { productId: string; type: TicketType; impact: TicketImpact; subject: string; description: string; attachments: AttachmentInput[] };
export type ReplyInput = { body: string; attachments: AttachmentInput[] };
export type TicketDatabase = { version: 1; nextPublicNumber: number; tickets: Ticket[] };

export const typeLabels: Record<TicketType, string> = { QUESTION: "Dúvida", INCIDENT: "Incidente", SERVICE_REQUEST: "Solicitação de serviço", ACCESS: "Acesso", IMPROVEMENT: "Melhoria" };
export const impactLabels: Record<TicketImpact, string> = { LOW_IMPACT: "Impacto baixo", PARTIAL_IMPACT: "Impacto parcial", BLOCKING: "Impede o trabalho" };
export const statusLabels: Record<TicketStatus, string> = { OPEN: "Novo", IN_PROGRESS: "Em atendimento", WAITING_CUSTOMER: "Aguardando cliente", UNDER_ANALYSIS: "Em análise", RESOLVED: "Resolvido", CLOSED: "Encerrado", REOPENED: "Reaberto" };
