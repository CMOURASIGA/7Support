import type { KnowledgeDatabase } from "@/features/knowledge/types";

export interface KnowledgeRepository {
  read(): Promise<KnowledgeDatabase>;
  transact<T>(update: (database: KnowledgeDatabase) => T): Promise<T>;
  subscribe(listener: () => void): () => void;
}
