import type { SatisfactionDatabase } from "@/features/satisfaction/types";
import type { SatisfactionRepository } from "./repository";

const STORAGE_KEY = "7support.spec10.satisfaction.v1";
const CHANGE_EVENT = "7support-satisfaction-changed";

function load(): SatisfactionDatabase {
  if (typeof window === "undefined") throw new Error("O repositório local exige um navegador.");
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) return { version: 1, records: [] };
  const value: unknown = JSON.parse(stored);
  if (!value || typeof value !== "object" || (value as SatisfactionDatabase).version !== 1 || !Array.isArray((value as SatisfactionDatabase).records)) throw new Error("A base local de satisfação está inválida. Os dados foram preservados para análise.");
  return value as SatisfactionDatabase;
}

export class LocalSatisfactionRepository implements SatisfactionRepository {
  private queue: Promise<unknown> = Promise.resolve();
  async read() { return structuredClone(load()); }
  async transact<T>(work: (database: SatisfactionDatabase) => T | Promise<T>): Promise<T> {
    const run = async () => {
      const database = structuredClone(load());
      const result = await work(database);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return result;
    };
    const queued = () => {
      const result = this.queue.then(run, run);
      this.queue = result.then(() => undefined, () => undefined);
      return result;
    };
    if (typeof navigator !== "undefined" && navigator.locks?.request) return navigator.locks.request(STORAGE_KEY, queued);
    return queued();
  }
  subscribe(listener: () => void) {
    const storage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) listener(); };
    window.addEventListener("storage", storage); window.addEventListener(CHANGE_EVENT, listener);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener(CHANGE_EVENT, listener); };
  }
}

export const localSatisfactionRepository = new LocalSatisfactionRepository();
