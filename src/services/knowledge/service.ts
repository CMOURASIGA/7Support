import { knowledgeCategories, knowledgeCategoryLabels, knowledgeVisibilities, type AuthorizedKnowledge, type KnowledgeAuditType, type KnowledgeDatabase, type KnowledgeFilters, type KnowledgeInput, type KnowledgeManagementDetail, type KnowledgeSource, type KnowledgeVersion, type ManagedKnowledge } from "@/features/knowledge/types";
import { localIdentityStore } from "@/services/local-identity/store";
import { localChecksumService, normalizeKnowledgeText, type ChecksumService } from "@/services/knowledge/checksum";
import { localKnowledgeRepository } from "@/services/knowledge/local-repository";
import type { KnowledgeRepository } from "@/services/knowledge/repository";
import type { LocalProduct, LocalUser } from "@/types/identity";

export class KnowledgeError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION", message: string) { super(message); }
}

function session() {
  const user = localIdentityStore.currentUser();
  if (!user) throw new KnowledgeError("UNAUTHENTICATED", "Faça login para acessar a base de conhecimento.");
  return user;
}
function adminSession() {
  const user = session();
  if (user.role !== "ADMIN") throw new KnowledgeError("FORBIDDEN", "A gestão da base de conhecimento exige perfil ADMIN.");
  return user;
}
function productMap(user: LocalUser) {
  return new Map(localIdentityStore.productsFor(user).map((product) => [product.id, product]));
}
function latestVersion(database: KnowledgeDatabase, source: KnowledgeSource) {
  const version = database.versions.find((item) => item.sourceId === source.id && item.version === source.latestVersion);
  if (!version) throw new KnowledgeError("NOT_FOUND", "Versão de conhecimento não encontrada.");
  return version;
}
function immutablePrevious(database: KnowledgeDatabase, version: KnowledgeVersion) {
  return database.versions
    .filter((item) => item.sourceId === version.sourceId && item.id !== version.id && ["PUBLISHED", "ARCHIVED"].includes(item.status))
    .sort((a, b) => b.version - a.version)[0];
}
function audit(database: KnowledgeDatabase, user: LocalUser, version: KnowledgeVersion, eventType: KnowledgeAuditType, description: string) {
  database.auditEvents.push({ id: crypto.randomUUID(), sourceId: version.sourceId, versionId: version.id, actorUserId: user.id, eventType, createdAt: new Date().toISOString(), description });
}
function validateInput(input: KnowledgeInput, products: Map<string, LocalProduct>) {
  if (!products.has(input.productId)) throw new KnowledgeError("VALIDATION", "Selecione um produto válido.");
  if (!knowledgeCategories.includes(input.category)) throw new KnowledgeError("VALIDATION", "Selecione uma categoria válida.");
  if (!knowledgeVisibilities.includes(input.visibility)) throw new KnowledgeError("VALIDATION", "Selecione uma visibilidade válida.");
  if (!input.title.trim() || input.title.trim().length > 180) throw new KnowledgeError("VALIDATION", "Informe um título com até 180 caracteres.");
  if (!input.content.trim() || input.content.trim().length > 30000) throw new KnowledgeError("VALIDATION", "Informe um conteúdo com até 30.000 caracteres.");
}
function matchesFilters(version: KnowledgeVersion, product: LocalProduct, filters: KnowledgeFilters) {
  if (filters.productId && product.id !== filters.productId) return false;
  if (filters.category && version.category !== filters.category) return false;
  if (filters.status && version.status !== filters.status) return false;
  if (filters.visibility && version.visibility !== filters.visibility) return false;
  const query = normalizeKnowledgeText(filters.query ?? "");
  if (!query) return true;
  const corpus = normalizeKnowledgeText([version.title, version.content, version.category, knowledgeCategoryLabels[version.category], product.displayName].join(" "));
  return corpus.includes(query);
}

export class KnowledgeService {
  constructor(private readonly repository: KnowledgeRepository, private readonly checksum: ChecksumService) {}
  subscribe(listener: () => void) { return this.repository.subscribe(listener); }

  async listAuthorized(filters: KnowledgeFilters = {}): Promise<AuthorizedKnowledge[]> {
    const user = session();
    const products = productMap(user);
    const database = await this.repository.read();
    return database.sources.flatMap((source) => {
      if (!source.currentPublishedVersionId || !products.has(source.productId)) return [];
      const version = database.versions.find((item) => item.id === source.currentPublishedVersionId);
      const product = products.get(source.productId)!;
      if (!version || version.status !== "PUBLISHED") return [];
      if (user.role === "CLIENT" && !["CLIENT", "BOTH"].includes(version.visibility)) return [];
      if (!matchesFilters(version, product, { ...filters, status: "PUBLISHED" })) return [];
      return [{ sourceId: source.id, versionId: version.id, productId: source.productId, productName: product.displayName, title: version.title, category: version.category, content: version.content, visibility: version.visibility, version: version.version, publishedAt: version.publishedAt! }];
    }).sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
  }

  async getAuthorized(sourceId: string) {
    const values = await this.listAuthorized();
    const result = values.find((item) => item.sourceId === sourceId);
    if (!result) throw new KnowledgeError("NOT_FOUND", "Conteúdo não encontrado.");
    return result;
  }

  async listAdmin(filters: KnowledgeFilters = {}): Promise<ManagedKnowledge[]> {
    const user = adminSession();
    const products = productMap(user);
    const database = await this.repository.read();
    return database.sources.flatMap((source) => {
      const product = products.get(source.productId);
      if (!product) return [];
      const version = latestVersion(database, source);
      return matchesFilters(version, product, filters) ? [{ source, latestVersion: version, productName: product.displayName }] : [];
    }).sort((a, b) => b.source.updatedAt.localeCompare(a.source.updatedAt));
  }

  async getAdmin(sourceId: string): Promise<KnowledgeManagementDetail> {
    const user = adminSession();
    const products = productMap(user);
    const database = await this.repository.read();
    const source = database.sources.find((item) => item.id === sourceId);
    const product = source ? products.get(source.productId) : undefined;
    if (!source || !product) throw new KnowledgeError("NOT_FOUND", "Conteúdo não encontrado.");
    return {
      source,
      productName: product.displayName,
      versions: database.versions.filter((item) => item.sourceId === source.id).sort((a, b) => b.version - a.version),
      auditEvents: database.auditEvents.filter((item) => item.sourceId === source.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  }

  async create(input: KnowledgeInput) {
    const user = adminSession();
    const products = productMap(user); validateInput(input, products);
    const now = new Date().toISOString();
    return this.repository.transact((database) => {
      const source: KnowledgeSource = { id: crypto.randomUUID(), productId: input.productId, currentPublishedVersionId: null, latestVersion: 1, createdBy: user.id, createdAt: now, updatedAt: now };
      const version: KnowledgeVersion = { id: crypto.randomUUID(), sourceId: source.id, version: 1, title: input.title.trim(), category: input.category, content: input.content.trim(), visibility: input.visibility, status: "DRAFT", checksum: this.checksum.calculate(input), authorUserId: user.id, reviewerUserId: null, createdAt: now, updatedAt: now, submittedForReviewAt: null, publishedAt: null, archivedAt: null };
      database.sources.push(source); database.versions.push(version); audit(database, user, version, "CREATED", "Conteúdo criado como rascunho");
      return { source, version };
    });
  }

  async updateDraft(versionId: string, input: KnowledgeInput) {
    const user = adminSession(); const products = productMap(user); validateInput(input, products);
    return this.repository.transact((database) => {
      const version = database.versions.find((item) => item.id === versionId);
      const source = version ? database.sources.find((item) => item.id === version.sourceId) : undefined;
      if (!version || !source) throw new KnowledgeError("NOT_FOUND", "Versão não encontrada.");
      if (version.status !== "DRAFT") throw new KnowledgeError("VALIDATION", "Somente rascunhos podem ser editados.");
      if (source.productId !== input.productId) throw new KnowledgeError("VALIDATION", "O produto não pode mudar entre versões.");
      version.title = input.title.trim(); version.category = input.category; version.content = input.content.trim(); version.visibility = input.visibility;
      version.checksum = this.checksum.calculate(input); version.updatedAt = new Date().toISOString(); source.updatedAt = version.updatedAt;
      audit(database, user, version, "UPDATED", "Rascunho atualizado"); return version;
    });
  }

  async submitForReview(versionId: string) {
    const user = adminSession();
    return this.repository.transact((database) => {
      const version = database.versions.find((item) => item.id === versionId);
      if (!version) throw new KnowledgeError("NOT_FOUND", "Versão não encontrada.");
      if (version.status !== "DRAFT") throw new KnowledgeError("VALIDATION", "Somente rascunhos podem ser enviados para revisão.");
      const previous = immutablePrevious(database, version);
      if (previous?.checksum === version.checksum) throw new KnowledgeError("VALIDATION", "A nova versão é materialmente idêntica à versão publicada anterior.");
      version.status = "IN_REVIEW"; version.submittedForReviewAt = new Date().toISOString(); version.updatedAt = version.submittedForReviewAt;
      audit(database, user, version, "SUBMITTED_FOR_REVIEW", "Conteúdo enviado para revisão"); return version;
    });
  }

  async returnToDraft(versionId: string) {
    const user = adminSession();
    return this.repository.transact((database) => {
      const version = database.versions.find((item) => item.id === versionId);
      if (!version) throw new KnowledgeError("NOT_FOUND", "Versão não encontrada.");
      if (version.status !== "IN_REVIEW") throw new KnowledgeError("VALIDATION", "Somente conteúdo em revisão pode voltar para rascunho.");
      version.status = "DRAFT"; version.submittedForReviewAt = null; version.updatedAt = new Date().toISOString();
      audit(database, user, version, "RETURNED_TO_DRAFT", "Conteúdo devolvido para ajustes"); return version;
    });
  }

  async publish(versionId: string) {
    const user = adminSession();
    return this.repository.transact((database) => {
      const version = database.versions.find((item) => item.id === versionId);
      const source = version ? database.sources.find((item) => item.id === version.sourceId) : undefined;
      if (!version || !source) throw new KnowledgeError("NOT_FOUND", "Versão não encontrada.");
      if (version.status !== "IN_REVIEW") throw new KnowledgeError("VALIDATION", "A publicação exige status Em revisão.");
      const previous = immutablePrevious(database, version);
      if (previous?.checksum === version.checksum) throw new KnowledgeError("VALIDATION", "A nova versão é materialmente idêntica à versão publicada anterior.");
      const now = new Date().toISOString();
      const current = source.currentPublishedVersionId ? database.versions.find((item) => item.id === source.currentPublishedVersionId) : undefined;
      if (current) { current.status = "ARCHIVED"; current.archivedAt = now; current.updatedAt = now; audit(database, user, current, "ARCHIVED", "Versão anterior arquivada por nova publicação"); }
      version.status = "PUBLISHED"; version.reviewerUserId = user.id; version.publishedAt = now; version.updatedAt = now; version.archivedAt = null;
      source.currentPublishedVersionId = version.id; source.updatedAt = now;
      audit(database, user, version, "PUBLISHED", "Conteúdo publicado"); return version;
    });
  }

  async createNewVersion(sourceId: string, input: KnowledgeInput) {
    const user = adminSession(); const products = productMap(user); validateInput(input, products);
    return this.repository.transact((database) => {
      const source = database.sources.find((item) => item.id === sourceId);
      if (!source) throw new KnowledgeError("NOT_FOUND", "Conteúdo não encontrado.");
      if (source.productId !== input.productId) throw new KnowledgeError("VALIDATION", "O produto não pode mudar entre versões.");
      const currentLatest = latestVersion(database, source);
      if (!["PUBLISHED", "ARCHIVED"].includes(currentLatest.status)) throw new KnowledgeError("VALIDATION", "Conclua a versão atual antes de criar outra versão.");
      const checksum = this.checksum.calculate(input);
      if (checksum === currentLatest.checksum) throw new KnowledgeError("VALIDATION", "A nova versão deve possuir alteração material.");
      const now = new Date().toISOString();
      const version: KnowledgeVersion = { id: crypto.randomUUID(), sourceId: source.id, version: source.latestVersion + 1, title: input.title.trim(), category: input.category, content: input.content.trim(), visibility: input.visibility, status: "DRAFT", checksum, authorUserId: user.id, reviewerUserId: null, createdAt: now, updatedAt: now, submittedForReviewAt: null, publishedAt: null, archivedAt: null };
      source.latestVersion = version.version; source.updatedAt = now; database.versions.push(version);
      audit(database, user, version, "NEW_VERSION_CREATED", `Versão ${version.version} criada como rascunho`); return version;
    });
  }

  async archive(versionId: string) {
    const user = adminSession();
    return this.repository.transact((database) => {
      const version = database.versions.find((item) => item.id === versionId);
      const source = version ? database.sources.find((item) => item.id === version.sourceId) : undefined;
      if (!version || !source) throw new KnowledgeError("NOT_FOUND", "Versão não encontrada.");
      if (version.status !== "PUBLISHED") throw new KnowledgeError("VALIDATION", "Somente conteúdo publicado pode ser arquivado.");
      const now = new Date().toISOString(); version.status = "ARCHIVED"; version.archivedAt = now; version.updatedAt = now;
      if (source.currentPublishedVersionId === version.id) source.currentPublishedVersionId = null;
      source.updatedAt = now; audit(database, user, version, "ARCHIVED", "Conteúdo arquivado"); return version;
    });
  }
}

export const knowledgeService = new KnowledgeService(localKnowledgeRepository, localChecksumService);
