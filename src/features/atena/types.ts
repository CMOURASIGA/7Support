export const aiPolicies = ["AUTO", "OPENROUTER_FREE", "OPENAI", "LOCAL"] as const;
export type AIPolicy = (typeof aiPolicies)[number];
export type TechnicalErrorCode = "UNAVAILABLE" | "TIMEOUT" | "RATE_LIMIT" | "EMPTY_RESPONSE" | "INVALID_RESPONSE" | "TECHNICAL_ERROR";
export type AtenaErrorCode = "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "POLICY_DISABLED" | "STORAGE_UNAVAILABLE";
export type ExecutionErrorCode = TechnicalErrorCode | AtenaErrorCode;
export type AtenaScope = { userId: string; tenantId: string; productId: string };
export type AtenaConversation = AtenaScope & {
  id: string;
  title: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
};
export type KnowledgeEvidence = {
  knowledgeSourceId: string;
  knowledgeVersionId: string;
  version: number;
  checksum: string;
  titleSnapshot: string;
  excerpt: string;
};
export type AtenaCitation = KnowledgeEvidence & { id: string; messageId: string };
export type AtenaMessage = AtenaScope & {
  id: string;
  conversationId: string;
  clientRequestId: string;
  role: "USER" | "ASSISTANT";
  content: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
  completedAt: string | null;
};
export type RouterDiagnostics = {
  policy: AIPolicy;
  provider: "LOCAL_PRIMARY" | "LOCAL_FALLBACK" | null;
  modelAlias: "local-extractive-v1" | null;
  status: "PENDING" | "SUCCEEDED" | "FALLBACK_SUCCEEDED" | "FAILED" | "FALLBACK_FAILED" | "NO_KNOWLEDGE";
  fallbackUsed: boolean;
  fallbackReason: TechnicalErrorCode | null;
  attemptCount: number;
  durationMs: number;
  inputTokenEstimate: number | null;
  outputTokenEstimate: number | null;
  errorCode: ExecutionErrorCode | null;
};
export type AIRouterExecution = AtenaScope & RouterDiagnostics & {
  id: string;
  conversationId: string;
  clientRequestId: string;
  requestMessageId: string;
  responseMessageId: string | null;
  runCount: number;
  createdAt: string;
  completedAt: string | null;
};
export type AtenaDatabase = { version: 1; conversations: AtenaConversation[]; messages: AtenaMessage[]; citations: AtenaCitation[]; executions: AIRouterExecution[] };
export type ConversationView = { conversation: AtenaConversation; messages: Array<AtenaMessage & { citations: AtenaCitation[] }> };
