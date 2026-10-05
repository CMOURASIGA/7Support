import type { KnowledgeAuditEvent, KnowledgeDatabase, KnowledgeSource, KnowledgeStatus, KnowledgeVersion } from "@/features/knowledge/types";
import { localChecksumService } from "@/services/knowledge/checksum";

const createdAt = "2026-09-01T12:00:00.000Z";
function version(sourceId: string, number: number, productId: string, title: string, category: KnowledgeVersion["category"], content: string, visibility: KnowledgeVersion["visibility"], status: KnowledgeStatus): KnowledgeVersion {
  const id = `${sourceId}-v${number}`;
  return {
    id, sourceId, version: number, title, category, content, visibility, status,
    checksum: localChecksumService.calculate({ productId, title, category, content, visibility }),
    authorUserId: "user-admin", reviewerUserId: ["PUBLISHED", "ARCHIVED"].includes(status) ? "user-admin" : null,
    createdAt, updatedAt: createdAt,
    submittedForReviewAt: ["IN_REVIEW", "PUBLISHED", "ARCHIVED"].includes(status) ? createdAt : null,
    publishedAt: ["PUBLISHED", "ARCHIVED"].includes(status) ? createdAt : null,
    archivedAt: status === "ARCHIVED" ? createdAt : null,
  };
}
function source(id: string, productId: string, latestVersion: number, currentPublishedVersionId: string | null): KnowledgeSource {
  return { id, productId, latestVersion, currentPublishedVersionId, createdBy: "user-admin", createdAt, updatedAt: createdAt };
}
function audit(sourceId: string, versionId: string, eventType: KnowledgeAuditEvent["eventType"], description: string): KnowledgeAuditEvent {
  return { id: `audit-${sourceId}-${eventType.toLowerCase()}`, sourceId, versionId, actorUserId: "user-admin", eventType, createdAt, description };
}

export function createKnowledgeDemoDatabase(): KnowledgeDatabase {
  const sources = [
    source("knowledge-commander-guide", "product-commander", 2, "knowledge-commander-guide-v2"),
    source("knowledge-commander-error", "product-commander", 1, "knowledge-commander-error-v1"),
    source("knowledge-finance-faq", "product-finance", 1, "knowledge-finance-faq-v1"),
    source("knowledge-commander-access", "product-commander", 1, null),
    source("knowledge-finance-config", "product-finance", 1, null),
    source("knowledge-finance-legacy", "product-finance", 1, null),
  ];
  const versions = [
    version("knowledge-commander-guide", 1, "product-commander", "Como acompanhar um projeto", "GUIDE", "Acesse Projetos, selecione o projeto desejado e consulte o resumo de andamento.", "BOTH", "ARCHIVED"),
    version("knowledge-commander-guide", 2, "product-commander", "Como acompanhar um projeto", "GUIDE", "Acesse Projetos, selecione o projeto desejado e consulte o resumo, as etapas e as últimas atualizações.", "BOTH", "PUBLISHED"),
    version("knowledge-commander-error", 1, "product-commander", "Falha conhecida na atualização de etapa", "KNOWN_ERROR", "Valide internamente o responsável e o estado anterior antes de repetir a operação.", "INTERNAL", "PUBLISHED"),
    version("knowledge-finance-faq", 1, "product-finance", "Onde consultar lançamentos", "FAQ", "Use a área de lançamentos para consultar os registros disponíveis no período selecionado.", "CLIENT", "PUBLISHED"),
    version("knowledge-commander-access", 1, "product-commander", "Solicitação de novo acesso", "ACCESS", "Rascunho fictício para validar o fluxo de criação e edição.", "CLIENT", "DRAFT"),
    version("knowledge-finance-config", 1, "product-finance", "Configuração inicial de centro de custo", "CONFIGURATION", "Conteúdo fictício enviado para revisão antes da publicação.", "INTERNAL", "IN_REVIEW"),
    version("knowledge-finance-legacy", 1, "product-finance", "Processo financeiro antigo", "PROCESS", "Conteúdo fictício arquivado e indisponível nas consultas correntes.", "BOTH", "ARCHIVED"),
  ];
  return {
    version: 1, sources, versions,
    auditEvents: [
      audit("knowledge-commander-guide", "knowledge-commander-guide-v2", "PUBLISHED", "Versão 2 publicada"),
      audit("knowledge-commander-error", "knowledge-commander-error-v1", "PUBLISHED", "Conteúdo interno publicado"),
      audit("knowledge-finance-faq", "knowledge-finance-faq-v1", "PUBLISHED", "FAQ publicada"),
      audit("knowledge-commander-access", "knowledge-commander-access-v1", "CREATED", "Rascunho criado"),
      audit("knowledge-finance-config", "knowledge-finance-config-v1", "SUBMITTED_FOR_REVIEW", "Conteúdo enviado para revisão"),
      audit("knowledge-finance-legacy", "knowledge-finance-legacy-v1", "ARCHIVED", "Conteúdo arquivado"),
    ],
  };
}
