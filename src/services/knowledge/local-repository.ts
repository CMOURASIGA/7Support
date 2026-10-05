import type { KnowledgeDatabase } from "@/features/knowledge/types";
import { createKnowledgeDemoDatabase } from "@/services/knowledge/demo-data";
import type { KnowledgeRepository } from "@/services/knowledge/repository";

const STORAGE_KEY = "7support.spec06.knowledge.v1";
const CHANGE_EVENT = "7support-knowledge-changed";

function load(): KnowledgeDatabase {
  if (typeof window === "undefined") throw new Error("O repositório local de conhecimento exige um navegador.");
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const initial = createKnowledgeDemoDatabase();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  const parsed: unknown = JSON.parse(stored);
  if (!parsed || typeof parsed !== "object" || (parsed as KnowledgeDatabase).version !== 1 || !Array.isArray((parsed as KnowledgeDatabase).sources) || !Array.isArray((parsed as KnowledgeDatabase).versions) || !Array.isArray((parsed as KnowledgeDatabase).auditEvents)) {
    throw new Error("A base local de conhecimento está inválida. Os dados foram preservados para análise.");
  }
  return parsed as KnowledgeDatabase;
}

export class LocalKnowledgeRepository implements KnowledgeRepository {
  private queue: Promise<unknown> = Promise.resolve();
  async read() { return structuredClone(load()); }
  async transact<T>(update: (database: KnowledgeDatabase) => T): Promise<T> {
    const work = async () => {
      const current = structuredClone(load());
      const result = update(current);
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); }
      catch { throw new Error("Não foi possível salvar a base de conhecimento localmente."); }
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

export const localKnowledgeRepository = new LocalKnowledgeRepository();
