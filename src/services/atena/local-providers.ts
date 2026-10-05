import { ProviderFailure, type AIProvider } from "@/services/atena/provider";
import { renderGroundedAnswer, type PromptContext } from "@/services/atena/prompt-context";
export type LocalProviderScenario = "SUCCESS" | "UNAVAILABLE" | "TIMEOUT" | "RATE_LIMIT" | "EMPTY_RESPONSE" | "INVALID_RESPONSE" | "TECHNICAL_ERROR";
export type LocalProviderOptions = { scenario?: LocalProviderScenario; latencyMs?: number };
class LocalProvider implements AIProvider {
  constructor(private readonly options: LocalProviderOptions = {}) {}
  async generate(context: PromptContext, signal: AbortSignal) {
    const latency = Math.min(5000, Math.max(0, this.options.latencyMs ?? 0));
    if (signal.aborted) throw new ProviderFailure("TIMEOUT");
    if (latency) await new Promise<void>((resolve, reject) => {
      const onAbort = () => { clearTimeout(timer); reject(new ProviderFailure("TIMEOUT")); };
      const timer = setTimeout(() => { signal.removeEventListener("abort", onAbort); resolve(); }, latency);
      signal.addEventListener("abort", onAbort, { once: true });
    });
    const scenario = this.options.scenario ?? "SUCCESS";
    if (scenario === "EMPTY_RESPONSE") return { answer: "", citationVersionIds: [] };
    if (scenario === "INVALID_RESPONSE") return { answer: "Resposta sem grounding", citationVersionIds: ["missing"] };
    if (scenario !== "SUCCESS") throw new ProviderFailure(scenario);
    return { answer: renderGroundedAnswer(context.data.evidence), citationVersionIds: context.data.evidence.map(item => item.knowledgeVersionId) };
  }
}
export class LocalPrimaryProvider extends LocalProvider {}
export class LocalFallbackProvider extends LocalProvider {}
