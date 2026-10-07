import { AtenaError } from "@/services/atena/errors";
import type { AtenaEscalationRepository, EscalationDatabase } from "./types";
export const ESCALATION_STORAGE_KEY = "7support.spec08.escalations.v1";
const CHANGE_EVENT = "7support-escalations-changed";
async function lock<T>(name: string, work: () => Promise<T>) {
  if (typeof navigator === "undefined" || !navigator.locks?.request) throw new AtenaError("STORAGE_UNAVAILABLE");
  return navigator.locks.request(`${ESCALATION_STORAGE_KEY}:${name}`, work);
}
export class LocalAtenaEscalationRepository implements AtenaEscalationRepository {
  async read(): Promise<EscalationDatabase> {
    try {
      const raw = window.localStorage.getItem(ESCALATION_STORAGE_KEY);
      if (!raw) return { version: 1, escalations: [] };
      const data = JSON.parse(raw) as EscalationDatabase;
      if (data.version !== 1 || !Array.isArray(data.escalations)) throw new Error();
      return data;
    } catch { throw new AtenaError("STORAGE_UNAVAILABLE"); }
  }
  async transact<T>(update: (database: EscalationDatabase) => T) {
    return lock("store", async () => {
      const database = await this.read();
      const result = update(database);
      try { window.localStorage.setItem(ESCALATION_STORAGE_KEY, JSON.stringify(database)); }
      catch { throw new AtenaError("STORAGE_UNAVAILABLE"); }
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return structuredClone(result);
    });
  }
  withLock<T>(conversationId: string, work: () => Promise<T>) { return lock(`conversation:${conversationId}`, work); }
  subscribe(listener: () => void) {
    const storage = (event: StorageEvent) => { if (event.key === ESCALATION_STORAGE_KEY || event.key === null) listener(); };
    window.addEventListener("storage", storage); window.addEventListener(CHANGE_EVENT, listener);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener(CHANGE_EVENT, listener); };
  }
}
