import type { AtenaScope, KnowledgeEvidence } from "@/features/atena/types";
import type { AuthorizedKnowledge } from "@/features/knowledge/types";
import { AtenaError } from "@/services/atena/errors";
import { normalizeKnowledgeText } from "@/services/knowledge/checksum";
import type { KnowledgeService } from "@/services/knowledge/service";
import { localIdentityStore } from "@/services/local-identity/store";

export interface KnowledgeQueryPort {
  searchAuthorized(scope: AtenaScope, query: string): Promise<KnowledgeEvidence[]>;
  getCitationTargetAuthorized(scope: AtenaScope, reference: KnowledgeEvidence): Promise<AuthorizedKnowledge>;
}
export function currentScope(productId: string): AtenaScope {
  const user = localIdentityStore.currentUser();
  if (!user) throw new AtenaError("UNAUTHENTICATED");
  if (!localIdentityStore.productsFor(user).some(product => product.id === productId)) throw new AtenaError("FORBIDDEN");
  if (user.role === "CLIENT" && !localIdentityStore.clientFor(user)) throw new AtenaError("FORBIDDEN");
  return { userId: user.id, tenantId: user.role === "CLIENT" ? user.clientId! : "internal", productId };
}
export function assertScope(scope: AtenaScope) {
  const current = currentScope(scope.productId);
  if (current.userId !== scope.userId || current.tenantId !== scope.tenantId) throw new AtenaError("FORBIDDEN");
}
const stopwords = new Set(["a", "as", "o", "os", "de", "da", "do", "das", "dos", "em", "e", "ou", "um", "uma", "para", "por", "com", "como", "que", "qual", "quais", "no", "na", "nos", "nas", "me", "eu", "onde", "sobre", "posso", "preciso", "quero"]);
function words(value: string) { return normalizeKnowledgeText(value).split(/[^\p{L}\p{N}]+/u); }
export class KnowledgeServiceQueryAdapter implements KnowledgeQueryPort {
  constructor(private readonly knowledge: KnowledgeService) {}
  async searchAuthorized(scope: AtenaScope, query: string): Promise<KnowledgeEvidence[]> {
    assertScope(scope);
    // SPEC06 authorizes before filters/projection. Rank only its already-authorized product slice.
    const values = await this.knowledge.listAuthorized({ productId: scope.productId });
    assertScope(scope);
    const product = localIdentityStore.productsFor(localIdentityStore.currentUser()!).find(item => item.id === scope.productId)!;
    const productTerms = new Set(words(product.displayName));
    const terms = [...new Set(words(query).filter(term => term.length > 1 && !stopwords.has(term) && !productTerms.has(term)))];
    if (!terms.length) return [];
    return values.map(item => {
      // Work in original text offsets: normalized whitespace must not shift excerpts.
      const starts = [0, ...Array.from(item.content.matchAll(/[^\s]+/gu), match => Math.max(0, match.index - 200))];
      const excerpt = starts.map(start => item.content.slice(start, start + 1200)).find(candidate => {
        const corpus = new Set(words(`${item.title} ${candidate}`));
        return terms.every(term => corpus.has(term));
      });
      const title = new Set(words(item.title));
      return { item, excerpt: excerpt ?? "", covered: excerpt !== undefined, score: terms.reduce((score, term) => score + Number(title.has(term)), 0) };
    }).filter(hit => hit.covered).sort((a, b) => b.score - a.score || a.item.sourceId.localeCompare(b.item.sourceId)).slice(0, 4).map(({ item, excerpt }) => ({
      knowledgeSourceId: item.sourceId, knowledgeVersionId: item.versionId, version: item.version, checksum: item.checksum,
      titleSnapshot: item.title, excerpt,
    }));
  }
  async getCitationTargetAuthorized(scope: AtenaScope, reference: KnowledgeEvidence) {
    assertScope(scope);
    const values = await this.knowledge.listAuthorized({ productId: scope.productId });
    assertScope(scope);
    const item = values.find(value => value.sourceId === reference.knowledgeSourceId && value.versionId === reference.knowledgeVersionId && value.version === reference.version && value.checksum === reference.checksum && value.title === reference.titleSnapshot && reference.excerpt.length > 0 && reference.excerpt.length <= 1200 && value.content.includes(reference.excerpt));
    if (!item) throw new AtenaError("NOT_FOUND");
    return item;
  }
}
