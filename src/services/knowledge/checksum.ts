import type { KnowledgeInput } from "@/features/knowledge/types";

export interface ChecksumService {
  calculate(input: KnowledgeInput): string;
}

export function normalizeKnowledgeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, " ").trim();
}

export class LocalChecksumService implements ChecksumService {
  calculate(input: KnowledgeInput) {
    const material = [input.productId, normalizeKnowledgeText(input.title), input.category, input.visibility, normalizeKnowledgeText(input.content)].join("|");
    let hash = 0x811c9dc5;
    for (let index = 0; index < material.length; index += 1) {
      hash ^= material.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }
}

export const localChecksumService = new LocalChecksumService();
