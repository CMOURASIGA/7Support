import type { TicketDatabase } from "@/features/tickets/types";

export interface TicketRepository {
  read(): Promise<TicketDatabase>;
  readOnly?(): Promise<TicketDatabase>;
  transact<T>(update: (database: TicketDatabase) => T | Promise<T>): Promise<T>;
  subscribe(listener: () => void): () => void;
}
