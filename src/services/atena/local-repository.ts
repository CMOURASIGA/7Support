import type { AtenaDatabase } from "@/features/atena/types";
import { AtenaError } from "@/services/atena/errors";
import type { AtenaConversationRepository } from "@/services/atena/repository";

export const ATENA_STORAGE_KEY = "7support.spec07.atena.v1";
const CHANGE_EVENT = "7support-atena-changed";
function load(): AtenaDatabase {
  try {
    const raw = window.localStorage.getItem(ATENA_STORAGE_KEY);
    if (!raw) return { version: 1, conversations: [], messages: [], citations: [], executions: [] };
    const value = JSON.parse(raw) as AtenaDatabase;
    if (value.version !== 1 || ![value.conversations, value.messages, value.citations, value.executions].every(Array.isArray)) throw new Error();
    return value;
  } catch { throw new AtenaError("STORAGE_UNAVAILABLE"); }
}
async function lock<T>(name: string, work: () => Promise<T>): Promise<T> {
  // Fail closed: a per-instance Promise cannot ensure uniqueness between browser tabs.
  if (typeof navigator === "undefined" || !navigator.locks?.request) return Promise.reject(new AtenaError("STORAGE_UNAVAILABLE"));
  return await navigator.locks.request(`${ATENA_STORAGE_KEY}:${name}`, work);
}
export class LocalAtenaConversationRepository implements AtenaConversationRepository {
  async read() { return structuredClone(load()); }
  async transact<T>(update: (database: AtenaDatabase) => T) {
    return lock("store", async () => {
      const database = load();
      const result = update(database);
      try { window.localStorage.setItem(ATENA_STORAGE_KEY, JSON.stringify(database)); }
      catch { throw new AtenaError("STORAGE_UNAVAILABLE"); }
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return structuredClone(result);
    });
  }
  withConversationLock<T>(id: string, work: () => Promise<T>) { return lock(`conversation:${id}`, work); }
  subscribe(listener: () => void) {
    const onStorage = (event: StorageEvent) => { if (event.key === ATENA_STORAGE_KEY || event.key === null) listener(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, listener);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(CHANGE_EVENT, listener); };
  }
}
