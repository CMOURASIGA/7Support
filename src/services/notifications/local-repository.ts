import type { NotificationDatabase } from "@/features/notifications/types";
import type { NotificationRepository } from "@/services/notifications/repository";

const STORAGE_KEY = "7support.spec05.notifications.v1";
const CHANGE_EVENT = "7support-notifications-changed";

function emptyDatabase(): NotificationDatabase {
  return { version: 1, notifications: [], deliveries: [] };
}

function load(): NotificationDatabase {
  if (typeof window === "undefined") throw new Error("O repositório local de notificações exige um navegador.");
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const initial = emptyDatabase();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  const parsed: unknown = JSON.parse(stored);
  if (!parsed || typeof parsed !== "object" || (parsed as NotificationDatabase).version !== 1 || !Array.isArray((parsed as NotificationDatabase).notifications) || !Array.isArray((parsed as NotificationDatabase).deliveries)) {
    throw new Error("A base local de notificações está inválida. Os dados foram preservados para análise.");
  }
  return parsed as NotificationDatabase;
}

export class LocalNotificationRepository implements NotificationRepository {
  private queue: Promise<unknown> = Promise.resolve();

  async read() { return structuredClone(load()); }

  async transact<T>(update: (database: NotificationDatabase) => T): Promise<T> {
    const work = async () => {
      const current = structuredClone(load());
      const result = update(current);
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); }
      catch { throw new Error("Não foi possível salvar a notificação localmente."); }
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return result;
    };
    const run = () => {
      const result = this.queue.then(work, work);
      this.queue = result.then(() => undefined, () => undefined);
      return result;
    };
    if (typeof navigator !== "undefined" && navigator.locks?.request) return navigator.locks.request(STORAGE_KEY, run);
    return run();
  }

  subscribe(listener: () => void) {
    const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) listener(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, listener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(CHANGE_EVENT, listener);
    };
  }
}

export const localNotificationRepository = new LocalNotificationRepository();
