import type { TechnicalErrorCode } from "@/features/atena/types";
import type { PromptContext } from "@/services/atena/prompt-context";
export interface AIProvider {
  generate(context: PromptContext, signal: AbortSignal): Promise<unknown>;
}
export type AIProviderResponse = { answer: string; citationVersionIds: string[] };
export class ProviderFailure extends Error {
  constructor(public readonly code: TechnicalErrorCode) { super(code); }
}
