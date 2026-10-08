import type { SatisfactionDatabase, SatisfactionRepository } from "./types";
export const SATISFACTION_STORAGE_KEY = "7support.spec10.satisfaction.v1";
export class LocalSatisfactionRepository implements SatisfactionRepository {
  async read(): Promise<SatisfactionDatabase> {
    const raw = window.localStorage.getItem(SATISFACTION_STORAGE_KEY);
    const database = raw ? JSON.parse(raw) as SatisfactionDatabase : { version: 1 as const, feedback: [] };
    if (database.version !== 1 || !Array.isArray(database.feedback)) throw new Error("Avaliações locais inválidas.");
    return structuredClone(database);
  }
  async transact<T>(work: (database: SatisfactionDatabase) => T) {
    if (typeof navigator === "undefined" || !navigator.locks?.request) throw new Error("Avaliação requer transação local segura.");
    return navigator.locks.request(SATISFACTION_STORAGE_KEY, async () => {
      const database = await this.read(); const before = JSON.stringify(database); const result = work(database); const after = JSON.stringify(database);
      if (after !== before) { window.localStorage.setItem(SATISFACTION_STORAGE_KEY, after); window.dispatchEvent(new Event(SATISFACTION_STORAGE_KEY)); }
      return structuredClone(result);
    });
  }
  subscribe(listener: () => void) {
    const storage = (event: StorageEvent) => { if (event.key === SATISFACTION_STORAGE_KEY || event.key === null) listener(); };
    window.addEventListener("storage", storage); window.addEventListener(SATISFACTION_STORAGE_KEY, listener);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener(SATISFACTION_STORAGE_KEY, listener); };
  }
}
export const satisfactionRepository = new LocalSatisfactionRepository();
