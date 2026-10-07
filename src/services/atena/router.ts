import type { AIPolicy, RouterDiagnostics, TechnicalErrorCode } from "@/features/atena/types";
import { AtenaError } from "@/services/atena/errors";
import { ProviderFailure, type AIProvider, type AIProviderResponse } from "@/services/atena/provider";
import { renderGroundedAnswer, type PromptContext } from "@/services/atena/prompt-context";
const eligible = new Set<TechnicalErrorCode>(["UNAVAILABLE", "TIMEOUT", "RATE_LIMIT", "EMPTY_RESPONSE", "INVALID_RESPONSE", "TECHNICAL_ERROR"]);
export type RouterResult = { response: AIProviderResponse | null; diagnostics: RouterDiagnostics };
export class AIRouter {
  constructor(private readonly primary: AIProvider, private readonly fallback: AIProvider, private readonly timeoutMs = 1000) {}
  assertPolicy(policy: AIPolicy) { if (policy !== "LOCAL") throw new AtenaError("POLICY_DISABLED"); }
  classifyFailure(error: unknown): TechnicalErrorCode | null {
    return error instanceof ProviderFailure && eligible.has(error.code) ? error.code : null;
  }
  private async attempt(provider: AIProvider, context: PromptContext): Promise<AIProviderResponse> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const raw = await Promise.race([provider.generate(context, controller.signal), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new ProviderFailure("TIMEOUT")); }, Math.min(10000, Math.max(1, this.timeoutMs)));
      })]);
      if (!raw || typeof raw !== "object") throw new ProviderFailure("INVALID_RESPONSE");
      const value = raw as Partial<AIProviderResponse>;
      if (typeof value.answer === "string" && !value.answer.trim()) throw new ProviderFailure("EMPTY_RESPONSE");
      const ids = context.data.evidence.map(item => item.knowledgeVersionId);
      if (value.answer !== renderGroundedAnswer(context.data.evidence) || !Array.isArray(value.citationVersionIds) || value.citationVersionIds.length !== ids.length || value.citationVersionIds.some((id, index) => id !== ids[index])) throw new ProviderFailure("INVALID_RESPONSE");
      // Explicit projection: discard every extra/raw provider field.
      return { answer: value.answer, citationVersionIds: [...ids] };
    } finally { clearTimeout(timer); }
  }
  async execute(context: PromptContext, policy: AIPolicy, beforeAttempt: () => Promise<void> = async () => {}): Promise<RouterResult> {
    this.assertPolicy(policy);
    if (!context.data.evidence.length) throw new AtenaError("VALIDATION");
    const start = Date.now();
    const diagnostics: RouterDiagnostics = { policy, provider: null, modelAlias: null, status: "PENDING", fallbackUsed: false, fallbackReason: null, attemptCount: 0, durationMs: 0, inputTokenEstimate: Math.ceil(JSON.stringify(context).length / 4), outputTokenEstimate: null, errorCode: null };
    let response: AIProviderResponse | null = null;
    try {
      await beforeAttempt();
      diagnostics.attemptCount = 1; diagnostics.provider = "LOCAL_PRIMARY"; diagnostics.modelAlias = "local-extractive-v1";
      response = await this.attempt(this.primary, context); diagnostics.status = "SUCCEEDED";
    }
    catch (error) {
      const reason = this.classifyFailure(error);
      if (reason) {
        try {
          // The caller owns this gate; the router never interprets identity or authorization.
          await beforeAttempt();
          diagnostics.fallbackUsed = true; diagnostics.fallbackReason = reason; diagnostics.provider = "LOCAL_FALLBACK"; diagnostics.attemptCount = 2;
          response = await this.attempt(this.fallback, context); diagnostics.status = "FALLBACK_SUCCEEDED";
        }
        catch (failure) { diagnostics.status = diagnostics.fallbackUsed ? "FALLBACK_FAILED" : "FAILED"; diagnostics.errorCode = failure instanceof AtenaError ? failure.code : this.classifyFailure(failure) ?? "TECHNICAL_ERROR"; }
      } else {
        // Unknown/untrusted errors are not eligible: never persist their message, stack or payload.
        diagnostics.status = "FAILED"; diagnostics.errorCode = error instanceof AtenaError ? error.code : "TECHNICAL_ERROR";
      }
    }
    diagnostics.durationMs = Math.max(0, Date.now() - start);
    diagnostics.outputTokenEstimate = response ? Math.ceil(response.answer.length / 4) : null;
    return { response, diagnostics };
  }
}
