/**
 * Runtime AI configuration store.
 * Provider and model can be changed at runtime via the Settings UI without restarting the server.
 * Falls back to environment variables on startup.
 */

export type LLMProvider = "local" | "groq" | "openrouter";

export const LLM_PROVIDERS: LLMProvider[] = ["local", "groq", "openrouter"];

export function isValidLLMProvider(value: string): value is LLMProvider {
  return LLM_PROVIDERS.includes(value as LLMProvider);
}

export interface AIConfig {
  provider: LLMProvider;
  /** Chat/LLM model for the active provider */
  model: string;
  /** Embedding model — always local (LM Studio) */
  embeddingModel: string;
}

/** Default models per provider */
export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  local: "mistral-7b-instruct-v0.3",
  groq: "llama-3.3-70b-versatile",
  openrouter: "meta-llama/llama-3.1-8b-instruct:free",
};

/** Available model options per provider for the UI */
export const PROVIDER_MODELS: Record<LLMProvider, { id: string; label: string }[]> = {
  local: [
    { id: "mistral-7b-instruct-v0.3", label: "Mistral 7B Instruct v0.3" },
    { id: "llama-3.2-3b-instruct", label: "Llama 3.2 3B Instruct" },
    { id: "llama-3.1-8b-instruct", label: "Llama 3.1 8B Instruct" },
    { id: "phi-3.5-mini-instruct", label: "Phi 3.5 Mini Instruct" },
    { id: "gemma-3-4b-it", label: "Gemma 3 4B IT" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile ⭐" },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant (Fast)" },
    { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B 32K" },
    { id: "gemma2-9b-it", label: "Gemma 2 9B IT" },
    { id: "llama-3.3-70b-specdec", label: "Llama 3.3 70B SpecDec" },
  ],
  openrouter: [
    { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B Instruct (Free)" },
    { id: "meta-llama/llama-3.2-3b-instruct:free", label: "Llama 3.2 3B Instruct (Free)" },
    { id: "mistralai/mistral-7b-instruct:free", label: "Mistral 7B Instruct (Free)" },
    { id: "google/gemma-3-4b-it:free", label: "Gemma 3 4B IT (Free)" },
    { id: "microsoft/phi-3-mini-128k-instruct:free", label: "Phi 3 Mini 128K (Free)" },
  ],
};

export const PROVIDER_LABELS: Record<LLMProvider, string> = {
  local: "Local (LM Studio)",
  groq: "Groq",
  openrouter: "OpenRouter",
};

// ── Runtime singleton (server-side in-memory) ─────────────────────────────

function getInitialProvider(): LLMProvider {
  const env = process.env.LLM_PROVIDER ?? "local";
  if (env === "groq" || env === "openrouter" || env === "local") return env;
  return "local";
}

function getInitialModel(provider: LLMProvider): string {
  return (
    process.env.LLM_MODEL ??
    process.env.CHAT_MODEL ??
    DEFAULT_MODELS[provider]
  );
}

const _config: AIConfig = {
  provider: getInitialProvider(),
  model: getInitialModel(getInitialProvider()),
  embeddingModel:
    process.env.EMBEDDING_MODEL ?? "text-embedding-nomic-embed-text-v1.5",
};

export function getAIConfig(): AIConfig {
  return { ..._config };
}

export function setAIConfig(updates: Partial<Omit<AIConfig, "embeddingModel">>) {
  if (updates.provider) _config.provider = updates.provider;
  if (updates.model) _config.model = updates.model;
}
