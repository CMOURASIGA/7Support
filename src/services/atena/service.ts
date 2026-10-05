import type { AIPolicy, AtenaConversation, AtenaDatabase, AtenaMessage, AtenaScope, ConversationView, KnowledgeEvidence, RouterDiagnostics } from "@/features/atena/types";
import { AtenaError } from "@/services/atena/errors";
import { assertScope, currentScope, KnowledgeServiceQueryAdapter, type KnowledgeQueryPort } from "@/services/atena/knowledge-query";
import { LocalAtenaConversationRepository } from "@/services/atena/local-repository";
import { LocalFallbackProvider, LocalPrimaryProvider } from "@/services/atena/local-providers";
import { PromptContextBuilder } from "@/services/atena/prompt-context";
import type { AtenaConversationRepository } from "@/services/atena/repository";
import { AIRouter } from "@/services/atena/router";
import { knowledgeService } from "@/services/knowledge/service";
import { localIdentityStore } from "@/services/local-identity/store";
export const NO_KNOWLEDGE_ANSWER = "Não encontrei conteúdo suficiente na base autorizada para responder isso com segurança.";
export type SendMessageInput = { clientRequestId: string; content: string; policy?: AIPolicy };
function now() { return new Date().toISOString(); }
function user() {
  const current = localIdentityStore.currentUser();
  if (!current) throw new AtenaError("UNAUTHENTICATED");
  return current;
}
function authorized(database: AtenaDatabase, id: string): AtenaConversation {
  const current = user();
  const conversation = database.conversations.find(item => item.id === id && item.userId === current.id);
  if (!conversation) throw new AtenaError("NOT_FOUND");
  const scope = currentScope(conversation.productId);
  if (scope.tenantId !== conversation.tenantId) throw new AtenaError("NOT_FOUND");
  return conversation;
}
function diagnostics(policy: AIPolicy): RouterDiagnostics {
  return { policy, provider: null, modelAlias: null, status: "PENDING", fallbackUsed: false, fallbackReason: null, attemptCount: 0, durationMs: 0, inputTokenEstimate: null, outputTokenEstimate: null, errorCode: null };
}
function belongs(message: AtenaScope & { conversationId: string }, conversation: AtenaConversation) {
  return message.conversationId === conversation.id && message.userId === conversation.userId && message.tenantId === conversation.tenantId && message.productId === conversation.productId;
}
export class AtenaService {
  constructor(private readonly repository: AtenaConversationRepository, private readonly knowledge: KnowledgeQueryPort, private readonly builder: PromptContextBuilder, private readonly router: AIRouter) {}
  subscribe(listener: () => void) { return this.repository.subscribe(listener); }
  async startConversation(input: { productId: string }) {
    const scope = currentScope(input.productId);
    return this.repository.transact(database => {
      assertScope(scope);
      const timestamp = now();
      const conversation: AtenaConversation = { ...scope, id: crypto.randomUUID(), title: "Conversa com Atena", status: "ACTIVE", createdAt: timestamp, updatedAt: timestamp, lastMessageAt: null };
      database.conversations.push(conversation);
      return conversation;
    });
  }
  async listConversations() {
    const identity = user();
    const database = await this.repository.read();
    if (user().id !== identity.id) throw new AtenaError("FORBIDDEN");
    return database.conversations.filter(item => {
      if (item.userId !== identity.id || item.status !== "ACTIVE") return false;
      try { return currentScope(item.productId).tenantId === item.tenantId; } catch { return false; }
    }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  private async evidenceAuthorized(scope: AtenaScope, evidence: KnowledgeEvidence[]) {
    for (const citation of evidence) {
      try { await this.knowledge.getCitationTargetAuthorized(scope, citation); }
      catch (error) {
        assertScope(scope);
        if (error instanceof AtenaError && error.code === "NOT_FOUND") return false;
        throw new AtenaError("FORBIDDEN");
      }
    }
    assertScope(scope);
    return true;
  }
  private async project(database: AtenaDatabase, conversation: AtenaConversation): Promise<ConversationView> {
    const messages: ConversationView["messages"] = [];
    for (const message of database.messages.filter(item => belongs(item, conversation))) {
      const citations = database.citations.filter(item => item.messageId === message.id);
      if (message.role === "ASSISTANT" && !(await this.evidenceAuthorized(conversation, citations))) continue;
      messages.push({ ...message, citations });
    }
    assertScope(conversation);
    return { conversation, messages };
  }
  async getConversation(conversationId: string) {
    const identity = user();
    const database = await this.repository.read();
    if (user().id !== identity.id) throw new AtenaError("FORBIDDEN");
    return this.project(database, authorized(database, conversationId));
  }
  async archiveConversation(conversationId: string) {
    const identity = user();
    return this.repository.withConversationLock(conversationId, () => this.repository.transact(database => {
      if (user().id !== identity.id) throw new AtenaError("FORBIDDEN");
      const conversation = authorized(database, conversationId);
      conversation.status = "ARCHIVED"; conversation.updatedAt = now();
      return conversation;
    }));
  }
  async getAuthorizedCitation(conversationId: string, citationId: string) {
    const view = await this.getConversation(conversationId);
    const citation = view.messages.flatMap(message => message.citations).find(item => item.id === citationId);
    if (!citation) throw new AtenaError("NOT_FOUND");
    const target = await this.knowledge.getCitationTargetAuthorized(view.conversation, citation);
    assertScope(view.conversation);
    // Read-only published surface, never the administrative version/history surface.
    return { surface: "AUTHORIZED_KNOWLEDGE" as const, target };
  }
  async getDiagnostics(conversationId: string) {
    const identity = user();
    if (identity.role !== "ADMIN") throw new AtenaError("FORBIDDEN");
    const database = await this.repository.read();
    if (user().id !== identity.id || user().role !== "ADMIN") throw new AtenaError("FORBIDDEN");
    const conversation = authorized(database, conversationId);
    return database.executions.filter(item => belongs(item, conversation)).map(item => ({
      id: item.id, policy: item.policy, provider: item.provider, modelAlias: item.modelAlias, status: item.status,
      fallbackUsed: item.fallbackUsed, fallbackReason: item.fallbackReason, attemptCount: item.attemptCount,
      durationMs: item.durationMs, inputTokenEstimate: item.inputTokenEstimate, outputTokenEstimate: item.outputTokenEstimate,
      errorCode: item.errorCode, runCount: item.runCount, createdAt: item.createdAt, completedAt: item.completedAt,
    }));
  }
  async sendMessage(conversationId: string, input: SendMessageInput) { return this.send(conversationId, input, false); }
  async retryMessage(conversationId: string, input: SendMessageInput) { return this.send(conversationId, input, true); }
  private async send(conversationId: string, input: SendMessageInput, retry: boolean): Promise<ConversationView> {
    const identity = user();
    if (typeof input.content !== "string" || !input.content.trim() || input.content.length > 4000 || typeof input.clientRequestId !== "string" || !/^[\w-]{1,128}$/.test(input.clientRequestId)) throw new AtenaError("VALIDATION");
    const content = input.content.trim();
    const clientRequestId = input.clientRequestId;
    const policy = input.policy ?? "LOCAL";
    this.router.assertPolicy(policy);
    return this.repository.withConversationLock(conversationId, async () => {
      if (user().id !== identity.id) throw new AtenaError("FORBIDDEN");
      const reservation = await this.repository.transact(database => {
        const conversation = authorized(database, conversationId);
        if (conversation.status !== "ACTIVE") throw new AtenaError("VALIDATION");
        let execution = database.executions.find(item => belongs(item, conversation) && item.clientRequestId === clientRequestId);
        if (execution) {
          const message = database.messages.find(item => item.id === execution!.requestMessageId)!;
          if (message.content !== content || execution.policy !== policy) throw new AtenaError("VALIDATION");
          const finished = execution.responseMessageId !== null;
          if (!retry || finished) return { conversation, execution, message, execute: false };
          execution.status = "PENDING"; execution.completedAt = null; execution.runCount += 1; message.status = "PENDING";
          return { conversation, execution, message, execute: true };
        }
        if (retry) throw new AtenaError("NOT_FOUND");
        const timestamp = now();
        const scope: AtenaScope = { userId: conversation.userId, tenantId: conversation.tenantId, productId: conversation.productId };
        const message: AtenaMessage = { ...scope, id: crypto.randomUUID(), conversationId, clientRequestId, role: "USER", content, status: "PENDING", createdAt: timestamp, completedAt: null };
        execution = { ...scope, ...diagnostics(policy), id: crypto.randomUUID(), conversationId, clientRequestId, requestMessageId: message.id, responseMessageId: null, runCount: 1, createdAt: timestamp, completedAt: null };
        database.messages.push(message); database.executions.push(execution);
        conversation.updatedAt = timestamp; conversation.lastMessageAt = timestamp;
        return { conversation, execution, message, execute: true };
      });
      if (!reservation.execute) return this.getConversation(conversationId);
      const { conversation, message, execution } = reservation;
      const start = Date.now();
      let run = diagnostics(policy);
      let answer: string | null = null;
      let evidence: KnowledgeEvidence[] = [];
      try {
        assertScope(conversation);
        evidence = await this.knowledge.searchAuthorized(conversation, content);
        assertScope(conversation);
        if (!evidence.length) { answer = NO_KNOWLEDGE_ANSWER; run.status = "NO_KNOWLEDGE"; }
        else {
          const view = await this.getConversation(conversationId);
          // Only preceding messages, reauthorized by projection. Current pending message is excluded.
          const index = view.messages.findIndex(item => item.id === message.id);
          const previous = view.messages.slice(0, index).filter(item => item.status === "COMPLETED").slice(-8);
          const context = this.builder.build(conversation, message, previous, evidence);
          const beforeAttempt = async () => {
            assertScope(conversation);
            if (!(await this.evidenceAuthorized(conversation, [...evidence, ...previous.flatMap(item => item.citations)]))) throw new AtenaError("FORBIDDEN");
          };
          const result = await this.router.execute(context, policy, beforeAttempt);
          run = result.diagnostics;
          assertScope(conversation);
          if (!(await this.evidenceAuthorized(conversation, evidence))) throw new AtenaError("FORBIDDEN");
          answer = result.response?.answer ?? null;
        }
      } catch (error) {
        answer = null;
        run.status = "FAILED"; run.errorCode = error instanceof AtenaError ? error.code : "TECHNICAL_ERROR";
      }
      run.durationMs = Math.max(run.durationMs, Date.now() - start);
      await this.repository.transact(database => {
        const persisted = database.executions.find(item => item.id === execution.id)!;
        const request = database.messages.find(item => item.id === message.id)!;
        // Final recheck is synchronous with commit, preventing an identity switch in the save queue.
        try { assertScope(conversation); } catch { answer = null; run.status = "FAILED"; run.errorCode = "FORBIDDEN"; }
        const completedAt = now();
        Object.assign(persisted, run, { attemptCount: execution.attemptCount + run.attemptCount, durationMs: execution.durationMs + run.durationMs, completedAt });
        request.status = answer ? "COMPLETED" : "FAILED"; request.completedAt = completedAt;
        if (answer && !persisted.responseMessageId) {
          const response: AtenaMessage = { ...message, id: crypto.randomUUID(), role: "ASSISTANT", content: answer, status: "COMPLETED", createdAt: completedAt, completedAt };
          database.messages.push(response); persisted.responseMessageId = response.id;
          for (const citation of evidence) database.citations.push({ ...citation, id: crypto.randomUUID(), messageId: response.id });
        }
        const storedConversation = database.conversations.find(item => item.id === conversationId)!;
        storedConversation.updatedAt = completedAt; storedConversation.lastMessageAt = completedAt;
      });
      assertScope(conversation);
      return this.getConversation(conversationId);
    });
  }
}
export const atenaService = new AtenaService(new LocalAtenaConversationRepository(), new KnowledgeServiceQueryAdapter(knowledgeService), new PromptContextBuilder(), new AIRouter(new LocalPrimaryProvider(), new LocalFallbackProvider()));
