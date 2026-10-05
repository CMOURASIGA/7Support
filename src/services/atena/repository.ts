import type { AtenaDatabase } from "@/features/atena/types";

// Infrastructure contract; only AtenaService exposes authorized public projections.
export interface AtenaConversationRepository {
  read(): Promise<AtenaDatabase>;
  transact<T>(update: (database: AtenaDatabase) => T): Promise<T>;
  withConversationLock<T>(conversationId: string, work: () => Promise<T>): Promise<T>;
  subscribe(listener: () => void): () => void;
}
