import type { NotificationDatabase } from "@/features/notifications/types";

export interface NotificationRepository {
  read(): Promise<NotificationDatabase>;
  transact<T>(update: (database: NotificationDatabase) => T): Promise<T>;
  subscribe(listener: () => void): () => void;
}
