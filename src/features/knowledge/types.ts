export const knowledgeCategories = ["GUIDE", "FAQ", "ACCESS", "CONFIGURATION", "PROCESS", "KNOWN_ERROR", "INTERNAL_POLICY"] as const;
export type KnowledgeCategory = (typeof knowledgeCategories)[number];

export const knowledgeVisibilities = ["CLIENT", "INTERNAL", "BOTH"] as const;
export type KnowledgeVisibility = (typeof knowledgeVisibilities)[number];

export const knowledgeStatuses = ["DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"] as const;
export type KnowledgeStatus = (typeof knowledgeStatuses)[number];

export type KnowledgeSource = {
  id: string;
  productId: string;
  currentPublishedVersionId: string | null;
  latestVersion: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeVersion = {
  id: string;
  sourceId: string;
  version: number;
  title: string;
  category: KnowledgeCategory;
  content: string;
  visibility: KnowledgeVisibility;
  status: KnowledgeStatus;
  checksum: string;
  authorUserId: string;
  reviewerUserId: string | null;
  createdAt: string;
  updatedAt: string;
  submittedForReviewAt: string | null;
  publishedAt: string | null;
  archivedAt: string | null;
};

export type KnowledgeAuditType = "CREATED" | "UPDATED" | "SUBMITTED_FOR_REVIEW" | "RETURNED_TO_DRAFT" | "PUBLISHED" | "NEW_VERSION_CREATED" | "ARCHIVED";
export type KnowledgeAuditEvent = {
  id: string;
  sourceId: string;
  versionId: string;
  actorUserId: string;
  eventType: KnowledgeAuditType;
  createdAt: string;
  description: string;
};

export type KnowledgeDatabase = {
  version: 1;
  sources: KnowledgeSource[];
  versions: KnowledgeVersion[];
  auditEvents: KnowledgeAuditEvent[];
};

export type KnowledgeInput = {
  productId: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  visibility: KnowledgeVisibility;
};

export type KnowledgeFilters = {
  query?: string;
  productId?: string;
  category?: KnowledgeCategory | "";
  status?: KnowledgeStatus | "";
  visibility?: KnowledgeVisibility | "";
};

export type AuthorizedKnowledge = {
  sourceId: string;
  versionId: string;
  productId: string;
  productName: string;
  title: string;
  category: KnowledgeCategory;
  content: string;
  visibility: KnowledgeVisibility;
  version: number;
  checksum: string;
  publishedAt: string;
};

export type ManagedKnowledge = {
  source: KnowledgeSource;
  latestVersion: KnowledgeVersion;
  productName: string;
};

export type KnowledgeManagementDetail = {
  source: KnowledgeSource;
  versions: KnowledgeVersion[];
  auditEvents: KnowledgeAuditEvent[];
  productName: string;
};

export const knowledgeCategoryLabels: Record<KnowledgeCategory, string> = {
  GUIDE: "Guia",
  FAQ: "Perguntas frequentes",
  ACCESS: "Acesso",
  CONFIGURATION: "Configuração",
  PROCESS: "Processo",
  KNOWN_ERROR: "Erro conhecido",
  INTERNAL_POLICY: "Política interna",
};

export const knowledgeVisibilityLabels: Record<KnowledgeVisibility, string> = { CLIENT: "Cliente", INTERNAL: "Interno", BOTH: "Cliente e interno" };
export const knowledgeStatusLabels: Record<KnowledgeStatus, string> = { DRAFT: "Rascunho", IN_REVIEW: "Em revisão", PUBLISHED: "Publicado", ARCHIVED: "Arquivado" };
