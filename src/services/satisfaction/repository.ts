import type { SatisfactionDatabase } from "@/features/satisfaction/types";

export interface SatisfactionRepository {
  read(): Promise<SatisfactionDatabase>;
  transact<T>(work: (database: SatisfactionDatabase) => T | Promise<T>): Promise<T>;
  subscribe(listener: () => void): () => void;
}
