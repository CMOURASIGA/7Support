import type { CycleDatabase, PolicyDatabase, SlaCycleRepository, SlaPolicyRepository, SlaPolicyVersion } from "./types";
import { priorities } from "@/features/tickets/types";
export const POLICY_STORAGE_KEY = "7support.spec09.sla-policies.v1";
export const CYCLE_STORAGE_KEY = "7support.spec09.sla-cycles.v1";
const values = { LOW: [240, 2880], MEDIUM: [120, 1440], HIGH: [60, 480], CRITICAL: [15, 240] };
function demoPolicies(): SlaPolicyVersion[] {
  return ["product-commander", "product-finance"].flatMap(productId => priorities.map(priority => ({
    id: `demo:${productId}:${priority}:1`, productId, priority, version: 1, status: "PUBLISHED" as const,
    firstResponseMinutes: values[priority][0], resolutionMinutes: values[priority][1],
    pauseResolutionWhileWaitingCustomer: true, publishedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z", createdBy: "DEMO", demo: true,
    audit: [{ action: "PUBLISHED" as const, at: "2026-01-01T00:00:00.000Z", actorUserId: "DEMO" }],
  })));
}
class LocalStore<D extends { version: 1 }> {
  constructor(private readonly key: string, private readonly initial: () => D) {}
  async read(): Promise<D> {
    try {
      const raw = window.localStorage.getItem(this.key);
      const database = raw ? JSON.parse(raw) as D : this.initial();
      if (database.version !== 1) throw new Error();
      return database;
    } catch { throw new Error("Não foi possível ler o SLA local."); }
  }
  async transact<T>(work: (database: D) => T | Promise<T>): Promise<T> {
    if (typeof navigator === "undefined" || !navigator.locks?.request) throw new Error("O SLA requer um navegador com transações locais seguras.");
    return navigator.locks.request(this.key, async () => {
      const database = await this.read();
      const before = JSON.stringify(database);
      const result = await work(database);
      const after = JSON.stringify(database);
      if (after !== before || !window.localStorage.getItem(this.key)) {
        window.localStorage.setItem(this.key, after);
        window.dispatchEvent(new Event(this.key));
      }
      return structuredClone(result);
    });
  }
  subscribe(listener: () => void) {
    const storage = (event: StorageEvent) => { if (event.key === this.key || event.key === null) listener(); };
    window.addEventListener("storage", storage); window.addEventListener(this.key, listener);
    return () => { window.removeEventListener("storage", storage); window.removeEventListener(this.key, listener); };
  }
}
export class LocalSlaPolicyRepository extends LocalStore<PolicyDatabase> implements SlaPolicyRepository {
  constructor() { super(POLICY_STORAGE_KEY, () => ({ version: 1, policies: demoPolicies() })); }
}
export class LocalSlaCycleRepository extends LocalStore<CycleDatabase> implements SlaCycleRepository {
  constructor() { super(CYCLE_STORAGE_KEY, () => ({ version: 1, cycles: [], alerts: [] })); }
}
export const slaPolicyRepository = new LocalSlaPolicyRepository();
export const slaCycleRepository = new LocalSlaCycleRepository();
