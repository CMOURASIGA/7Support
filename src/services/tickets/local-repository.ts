import { createDemoDatabase } from "@/services/tickets/demo-data";
import type { TicketRepository } from "@/services/tickets/repository";
import type { TicketDatabase } from "@/features/tickets/types";

const STORAGE_KEY = "7support.spec03.tickets.v1";
const CHANGE_EVENT = "7support-tickets-changed";

function assertDatabase(value: unknown): asserts value is TicketDatabase {
  if (!value || typeof value !== "object" || !Array.isArray((value as TicketDatabase).tickets) || (value as TicketDatabase).version !== 1 || !Number.isSafeInteger((value as TicketDatabase).nextPublicNumber)) throw new Error("A base local de chamados está inválida. Os dados foram preservados para análise.");
}

function load(): TicketDatabase {
  if (typeof window === "undefined") throw new Error("O repositório local exige um navegador.");
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored) { const parsed: unknown = JSON.parse(stored); assertDatabase(parsed); return parsed; }
  const initial = createDemoDatabase();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

export class LocalTicketRepository implements TicketRepository {
  private queue: Promise<unknown> = Promise.resolve();
  async read() { return structuredClone(load()); }
  async transact<T>(update: (database: TicketDatabase) => T): Promise<T> {
    const work = async () => {
      const current = structuredClone(load());
      const result = update(current);
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); }
      catch { throw new Error("Não foi possível salvar localmente. Verifique o espaço disponível e tente novamente."); }
      window.dispatchEvent(new Event(CHANGE_EVENT));
      return result;
    };
    const run = () => {
      const result = this.queue.then(work, work);
      this.queue = result.then(() => undefined, () => undefined);
      return result;
    };
    // Serializa gravações entre abas quando Web Locks está disponível.
    if (typeof navigator !== "undefined" && navigator.locks?.request) return navigator.locks.request(STORAGE_KEY, run);
    return run();
  }
  subscribe(listener: () => void) {
    const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) listener(); };
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, listener);
    return () => { window.removeEventListener("storage", onStorage); window.removeEventListener(CHANGE_EVENT, listener); };
  }
}

export const localTicketRepository = new LocalTicketRepository();
