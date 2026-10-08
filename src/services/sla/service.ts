import { localIdentityStore } from "@/services/local-identity/store";
import { ticketService, type TicketService } from "@/services/tickets/service";
import { notificationService, type NotificationService } from "@/services/notifications/service";
import { priorities } from "@/features/tickets/types";
import { calculateSla, emptyEvaluation, temporalPolicy, validHistory } from "./calculator";
import { slaCycleRepository, slaPolicyRepository } from "./local-repository";
import { systemClock, type ClientSlaView, type Clock, type InternalSlaView, type Metric, type PolicyInput, type SlaCycle, type SlaCycleRepository, type SlaPolicyRepository, type SlaHistory } from "./types";
function session() {
  const user = localIdentityStore.currentUser();
  if (!user) throw new Error("Faça login para acessar o SLA.");
  return user;
}
function admin() { const user = session(); if (user.role !== "ADMIN") throw new Error("Somente ADMIN configura políticas SLA."); return user; }
function internal() { const user = session(); if (user.role === "CLIENT") throw new Error("Configuração e histórico SLA restritos à operação interna."); return user; }
function sameSession(user: ReturnType<typeof session>) {
  const current = session();
  if (user.id !== current.id || user.role !== current.role || user.clientId !== current.clientId) throw new Error("A sessão mudou. Reabra o chamado.");
}
export class SlaService {
  constructor(private readonly policies: SlaPolicyRepository, private readonly cycles: SlaCycleRepository,
    private readonly tickets: TicketService, private readonly notifications: NotificationService, private readonly clock: Clock = systemClock) {}
  subscribe(listener: () => void) { const off = [this.policies.subscribe(listener), this.tickets.subscribe(listener)]; return () => off.forEach(stop => stop()); }
  async listPolicies() { const user = internal(); const result = await this.policies.read(); sameSession(user); return result.policies; }
  async createPolicy(input: PolicyInput) {
    const user = admin();
    if (!localIdentityStore.productsFor(user).some(product => product.id === input.productId) || !priorities.includes(input.priority)
      || ![input.firstResponseMinutes, input.resolutionMinutes].every(value => Number.isSafeInteger(value) && value > 0 && value <= 5256000)
      || typeof input.pauseResolutionWhileWaitingCustomer !== "boolean") throw new Error("Selecione produto, prioridade e metas inteiras positivas de até 5.256.000 minutos.");
    return this.policies.transact(database => {
      sameSession(user); admin();
      const versions = database.policies.filter(policy => policy.productId === input.productId && policy.priority === input.priority);
      const published = versions.filter(policy => policy.status === "PUBLISHED").sort((a, b) => b.version - a.version)[0];
      const at = this.clock.now().toISOString();
      const policy = { ...input, id: crypto.randomUUID(), version: Math.max(0, ...versions.map(item => item.version)) + 1,
        status: "DRAFT" as const, publishedAt: null, createdAt: at, createdBy: user.id, demo: false,
        basedOnPublishedId: published?.id ?? null, audit: [{ action: "CREATED" as const, at, actorUserId: user.id }] };
      database.policies.push(policy); return policy;
    });
  }
  async publishPolicy(id: string) {
    const user = admin();
    return this.policies.transact(database => {
      sameSession(user); admin();
      const policy = database.policies.find(item => item.id === id);
      if (!policy) throw new Error("Política não encontrada.");
      if (policy.status === "PUBLISHED") return policy;
      const latest = database.policies.filter(item => item.productId === policy.productId && item.priority === policy.priority && item.status === "PUBLISHED")
        .sort((a, b) => b.version - a.version)[0];
      const at = this.clock.now().toISOString();
      if ((latest?.id ?? null) !== policy.basedOnPublishedId || (latest && (at <= latest.publishedAt! || policy.version <= latest.version)) || at < policy.createdAt) throw new Error("Outra versão foi publicada ou o relógio é inválido. Crie uma nova versão.");
      policy.status = "PUBLISHED"; policy.publishedAt = at;
      policy.audit.push({ action: "PUBLISHED", at, actorUserId: user.id }); return policy;
    });
  }
  private async evaluate(ticketId: string, emitAlerts: boolean): Promise<InternalSlaView> {
    const user = session();
    await this.tickets.slaHistory(ticketId); sameSession(user);
    const result = await this.cycles.transact(async database => {
      sameSession(user);
      const history = await this.tickets.slaHistory(ticketId);
      const policyDatabase = await this.policies.read(); sameSession(user);
      const clockDate = this.clock.now();
      const now = Number.isFinite(clockDate.getTime()) ? clockDate.toISOString() : "INVALID";
      const priorCycles = database.cycles.filter(cycle => cycle.ticketId === ticketId);
      const valid = validHistory(history, now) && priorCycles.every(cycle => !cycle.evaluatedAt
        || (Number.isFinite(Date.parse(cycle.evaluatedAt)) && Date.parse(cycle.evaluatedAt) <= Date.parse(now)));
      const starts = history.events.filter(event => event.slaStart && (event.eventType === "CREATED" || event.newStatus === "REOPENED"));
      for (const [index, event] of starts.entries()) {
        const key = `SLA:${ticketId}:${event.id}`;
        let cycle = database.cycles.find(item => item.originKey === key);
        if (!cycle && valid) {
          const policy = temporalPolicy(policyDatabase.policies, history.productId, event.slaStart!.priority, event.createdAt);
          cycle = { id: crypto.randomUUID(), originKey: key, ticketId, tenantId: history.tenantId, startEventId: event.id,
            cycleNumber: index + 1, startedAt: event.createdAt, priorityAtCycleStart: event.slaStart!.priority,
            policyVersionId: policy?.id ?? null, policySnapshot: policy ? structuredClone(policy) : null, evaluatedAt: null, evaluation: null,
            audit: [{ action: "STARTED", at: event.createdAt }, { action: "RECONCILED", at: now }] };
          database.cycles.push(cycle);
        }
        if (!cycle) continue;
        const evaluation = valid ? calculateSla(cycle, history, now) : emptyEvaluation("INVALID_HISTORY");
        // Completed cycles retain their original evaluation timestamp and result.
        if (!cycle.evaluation?.resolvedAt) {
          cycle.evaluation = evaluation;
          if (evaluation.state !== "INVALID_HISTORY") cycle.evaluatedAt = now;
        }
        if (emitAlerts && user.role !== "CLIENT" && valid && evaluation.state !== "INVALID_HISTORY") {
          for (const metric of ["firstResponse", "resolution"] as Metric[]) {
            const value = evaluation[metric];
            if (value.state !== "BREACHED" || value.activeElapsedMinutes! <= value.targetMinutes!) continue;
            const key = `SLA:${cycle.id}:${metric}:BREACHED`;
            if (!database.alerts.some(alert => alert.key === key)) {
              database.alerts.push({ key, cycleId: cycle.id, metric, detectedAt: now, recipientUserId: history.assignedToUserId, notified: !history.assignedToUserId });
              cycle.audit.push({ action: "BREACHED", at: now, metric });
            }
          }
        }
      }
      const cycles = database.cycles.filter(item => item.ticketId === ticketId).sort((a, b) => a.cycleNumber - b.cycleNumber);
      const current = cycles.at(-1);
      const currentEvaluation = current ? calculateSla(current, history, now) : null;
      const visibleCycles = cycles.map(cycle => {
        const evaluated = valid ? calculateSla(cycle, history, now) : emptyEvaluation("INVALID_HISTORY");
        return evaluated.state === "INVALID_HISTORY" ? { ...cycle, evaluation: evaluated } : cycle;
      });
      return { state: valid ? currentEvaluation?.state ?? "NOT_CONFIGURED" : "INVALID_HISTORY", cycles: visibleCycles };
    });
    sameSession(user);
    if (emitAlerts && user.role !== "CLIENT" && result.state !== "INVALID_HISTORY") await this.deliverAlerts(ticketId, user);
    return result;
  }
  private async deliverAlerts(ticketId: string, user: ReturnType<typeof session>) {
    const database = await this.cycles.read(); sameSession(user);
    const ids = new Set(database.cycles.filter(cycle => cycle.ticketId === ticketId).map(cycle => cycle.id));
    for (const alert of database.alerts.filter(item => ids.has(item.cycleId) && !item.notified)) {
      const history = await this.tickets.slaHistory(ticketId); sameSession(user); internal();
      if (!validHistory(history, this.clock.now().toISOString())) continue;
      const result = await this.notifications.process({ id: alert.key, type: "SLA_BREACHED", tenantId: history.tenantId,
        ticketId, ticketCode: history.publicCode, subject: history.subject, productName: history.productName,
        clientName: history.clientName, priority: history.priority, requesterUserId: history.requesterUserId,
        assignedToUserId: history.assignedToUserId });
      await this.cycles.transact(db => { sameSession(user); const current = db.alerts.find(item => item.key === alert.key)!; current.notified = Boolean(result) || !history.assignedToUserId; current.recipientUserId = history.assignedToUserId; });
    }
  }
  async getInternal(ticketId: string) { internal(); return this.evaluate(ticketId, true); }
  async getClient(ticketId: string): Promise<ClientSlaView> {
    if (session().role !== "CLIENT") throw new Error("Resumo disponível para CLIENT.");
    const view = await this.evaluate(ticketId, false);
    const current = view.state === "INVALID_HISTORY" ? emptyEvaluation("INVALID_HISTORY") : view.cycles.at(-1)?.evaluation ?? emptyEvaluation("NOT_CONFIGURED");
    const text = (metric: Metric) => {
      const value = current[metric];
      if (value.state === "INVALID_HISTORY") return "Não foi possível calcular o prazo";
      if (value.state === "NOT_CONFIGURED") return "SLA não configurado";
      if (value.result === "MET") return "Atendida no prazo";
      if (value.result === "NOT_MET" || value.state === "BREACHED") return "Prazo excedido";
      if (value.state === "PAUSED") return "Prazo pausado enquanto aguardamos sua resposta";
      return "Em andamento";
    };
    return { state: view.state, firstResponse: text("firstResponse"), resolution: text("resolution") };
  }
  async demoScenario(policyId: string, scenario: "BOUNDARY" | "BREACH" | "PAUSE" | "RESOLVED" | "NO_REPLY") {
    const user = admin(); const policy = (await this.policies.read()).policies.find(item => item.id === policyId && item.status === "PUBLISHED"); sameSession(user);
    if (!policy) throw new Error("Escolha uma política publicada.");
    const startedAt = this.clock.now().toISOString();
    const start = Date.parse(startedAt);
    const time = (minutes: number) => new Date(start + minutes * 60000).toISOString();
    const history: SlaHistory = { ticketId: "demo", tenantId: "demo", productId: policy.productId, publicCode: "Demonstração", subject: "Demonstração SLA", productName: "Demo", clientName: "Demo", requesterUserId: "demo", assignedToUserId: null, priority: policy.priority, status: "OPEN",
      events: [{ id: "start", createdAt: startedAt, eventType: "CREATED" as const, newStatus: "OPEN" as const, slaStart: { priority: policy.priority } }], replies: [] };
    let elapsed = policy.firstResponseMinutes;
    if (scenario === "BREACH") elapsed += 1 / 60000;
    if (["PAUSE", "RESOLVED", "NO_REPLY"].includes(scenario)) {
      history.events.push({ id: "progress", createdAt: time(0), eventType: "STATUS_CHANGED", oldStatus: "OPEN", newStatus: "IN_PROGRESS" }); history.status = "IN_PROGRESS";
      if (scenario === "PAUSE") {
        history.events.push({ id: "waiting", createdAt: time(1), eventType: "STATUS_CHANGED", oldStatus: "IN_PROGRESS", newStatus: "WAITING_CUSTOMER" }); history.status = "WAITING_CUSTOMER"; elapsed = 2;
      } else {
        elapsed = Math.min(policy.firstResponseMinutes, policy.resolutionMinutes) / 2;
        if (scenario === "RESOLVED") { history.events.push({ id: "reply", createdAt: time(elapsed), eventType: "PUBLIC_REPLY_CREATED" }); history.replies.push({ id: "reply-message", eventId: "reply", createdAt: time(elapsed) }); }
        history.events.push({ id: "resolved", createdAt: time(elapsed), eventType: "STATUS_CHANGED", oldStatus: "IN_PROGRESS", newStatus: "RESOLVED" }); history.status = "RESOLVED";
      }
    }
    const cycle: SlaCycle = { id: "demo", originKey: "demo", ticketId: "demo", tenantId: "demo", startEventId: "start", cycleNumber: 1, startedAt, priorityAtCycleStart: policy.priority, policyVersionId: policy.id, policySnapshot: policy, evaluatedAt: null, evaluation: null, audit: [] };
    return calculateSla(cycle, history, time(elapsed));
  }
  async listInternal() {
    const user = internal(); const tickets = await this.tickets.listInternal(); sameSession(user);
    const views: Record<string, InternalSlaView> = {};
    for (const ticket of tickets) views[ticket.id] = await this.getInternal(ticket.id);
    return views;
  }
}
export const slaService = new SlaService(slaPolicyRepository, slaCycleRepository, ticketService, notificationService);
