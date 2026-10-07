import { AtenaError } from "@/services/atena/errors";
import { LocalFallbackProvider, LocalPrimaryProvider, type LocalProviderOptions } from "@/services/atena/local-providers";
import { localIdentityStore } from "@/services/local-identity/store";

export const localPrimaryProvider = new LocalPrimaryProvider();
export const localFallbackProvider = new LocalFallbackProvider();

export const localDemoPresets = ["PRIMARY_SUCCESS", "FALLBACK_SUCCESS", "TOTAL_FAILURE", "RATE_LIMIT", "EMPTY_RESPONSE", "INVALID_RESPONSE", "LATENCY"] as const;
export type LocalDemoPreset = (typeof localDemoPresets)[number];

const presets: Record<LocalDemoPreset, { primary: LocalProviderOptions; fallback: LocalProviderOptions }> = {
  PRIMARY_SUCCESS: { primary: { scenario: "SUCCESS" }, fallback: { scenario: "SUCCESS" } },
  FALLBACK_SUCCESS: { primary: { scenario: "UNAVAILABLE" }, fallback: { scenario: "SUCCESS" } },
  TOTAL_FAILURE: { primary: { scenario: "UNAVAILABLE" }, fallback: { scenario: "TECHNICAL_ERROR" } },
  RATE_LIMIT: { primary: { scenario: "RATE_LIMIT" }, fallback: { scenario: "SUCCESS" } },
  EMPTY_RESPONSE: { primary: { scenario: "EMPTY_RESPONSE" }, fallback: { scenario: "SUCCESS" } },
  INVALID_RESPONSE: { primary: { scenario: "INVALID_RESPONSE" }, fallback: { scenario: "SUCCESS" } },
  LATENCY: { primary: { scenario: "SUCCESS", latencyMs: 650 }, fallback: { scenario: "SUCCESS" } },
};

let selected: LocalDemoPreset = "PRIMARY_SUCCESS";
function requireAdmin() {
  if (localIdentityStore.currentUser()?.role !== "ADMIN") throw new AtenaError("FORBIDDEN");
}
export const localAtenaDemoService = {
  current() { requireAdmin(); return selected; },
  reset() {
    selected = "PRIMARY_SUCCESS";
    localPrimaryProvider.configure(presets.PRIMARY_SUCCESS.primary);
    localFallbackProvider.configure(presets.PRIMARY_SUCCESS.fallback);
  },
  configure(preset: LocalDemoPreset) {
    requireAdmin();
    if (!Object.prototype.hasOwnProperty.call(presets, preset)) throw new AtenaError("VALIDATION");
    selected = preset;
    localPrimaryProvider.configure(presets[preset].primary);
    localFallbackProvider.configure(presets[preset].fallback);
  },
};
