import type { TicketDatabase } from "@/features/tickets/types";

export interface TicketRepository {
  read(): Promise<TicketDatabase>;
  transact<T>(update: (database: TicketDatabase) => T): Promise<T>;
  subscribe(listener: () => void): () => void;
}
