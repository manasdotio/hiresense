import OpenAI from "openai";
import {
  DEFAULT_MODELS,
  getAIConfig,
  type AIConfig,
  type LLMProvider,
} from "./aiConfig";

export type LLMCallConfig = Pick<AIConfig, "provider" | "model">;

/* ---------- Provider Client Factory ---------- */

function createClient(provider: LLMProvider): OpenAI {
  switch (provider) {
    case "groq":
      return new OpenAI({
        baseURL: "https://api.groq.com/openai/v1",
        apiKey: process.env.GROQ_API_KEY ?? "",
      });

    case "openrouter":
      return new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY ?? "",
        defaultHeaders: {
          "HTTP-Referer": "https://hiresense.app",
          "X-Title": "HireSense",
        },
      });

    case "local":
    default:
      return new OpenAI({
        baseURL: process.env.OPENAI_BASE_URL ?? "http://localhost:1234/v1",
        apiKey: "lm-studio",
      });
  }
}

/**
 * Embedding client always uses local LM Studio.
 * Groq does not support embeddings; OpenRouter embeddings are paid.
 */
const embeddingClient = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL ?? "http://localhost:1234/v1",
  apiKey: "lm-studio",
});

/* ---------- LLM Call ---------- */

function resolveLLMCallConfig(overrides?: Partial<LLMCallConfig>): LLMCallConfig {
  const runtimeConfig = getAIConfig();
  const provider = overrides?.provider ?? runtimeConfig.provider;

  const fallbackModel =
    provider === runtimeConfig.provider
      ? runtimeConfig.model
      : DEFAULT_MODELS[provider];

  const requestedModel =
    typeof overrides?.model === "string" && overrides.model.trim().length > 0
      ? overrides.model.trim()
      : fallbackModel;

  return {
    provider,
    model: requestedModel || DEFAULT_MODELS[provider],
  };
}

export async function callLLM(prompt: string, overrides?: Partial<LLMCallConfig>) {
  const config = resolveLLMCallConfig(overrides);
  const client = createClient(config.provider);
  const model = config.model;

  const strictPrompt = `
You are a strict JSON API.
Always return valid JSON only.
No explanation.
No markdown.
No backticks.

${prompt}
`;

  let response;

  try {
    response = await client.chat.completions.create({
      model,
      temperature: 0,
      max_tokens: 1000,
      messages: [{ role: "user", content: strictPrompt }],
    });
  } catch (error) {
    const err = error as { status?: number; param?: string; message?: string };

    // Local LM Studio: fallback to first available model if requested model is missing
    if (config.provider === "local" && err?.status === 400 && err?.param === "model") {
      const models = await listLLMModels();
      const fallback = models[0];

      if (!fallback) {
        throw new Error(
          `Model '${model}' unavailable and no fallback models found on ${
            process.env.OPENAI_BASE_URL ?? "http://localhost:1234/v1"
          }.`
        );
      }

      response = await client.chat.completions.create({
        model: fallback,
        temperature: 0,
        max_tokens: 1000,
        messages: [{ role: "user", content: strictPrompt }],
      });
    } else {
      throw error;
    }
  }

  const content = response.choices[0]?.message?.content ?? "";
  return cleanJSON(content);
}

/* ---------- Embeddings (always local) ---------- */

export async function generateTextEmbedding(
  text: string,
  model = getAIConfig().embeddingModel
) {
  const response = await embeddingClient.embeddings.create({
    model,
    input: text,
    encoding_format: "float",
  });

  const embedding = response.data[0]?.embedding ?? [];

  if (!embedding.length) {
    throw new Error(`Embedding model '${model}' returned an empty vector.`);
  }

  const hasNonZero = embedding.some((v) => Math.abs(v) > 1e-12);

  if (!hasNonZero) {
    throw new Error(`Embedding model '${model}' returned an all-zero vector.`);
  }

  return embedding;
}

/* ---------- List models (local only) ---------- */

export async function listLLMModels() {
  const localClient = new OpenAI({
    baseURL: process.env.OPENAI_BASE_URL ?? "http://localhost:1234/v1",
    apiKey: "lm-studio",
  });
  const response = await localClient.models.list();
  return response.data.map((m) => m.id);
}

/* ---------- Connection Test ---------- */

export async function testLLMConnection(provider?: LLMProvider, model?: string): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  // Temporarily override config for test if provider/model passed
  const config = getAIConfig();
  const testProvider = provider ?? config.provider;
  const testModel = model ?? config.model;
  const client = createClient(testProvider);

  const start = Date.now();
  try {
    const response = await client.chat.completions.create({
      model: testModel,
      temperature: 0,
      max_tokens: 20,
      messages: [{ role: "user", content: 'Reply with exactly: {"ok":true}' }],
    });
    const latencyMs = Date.now() - start;
    const content = response.choices[0]?.message?.content ?? "";
    return {
      ok: true,
      message: `Connected! Response: ${content.slice(0, 80)}`,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const err = error as { message?: string };
    return {
      ok: false,
      message: err?.message ?? "Unknown error",
      latencyMs,
    };
  }
}

/* ---------- Utilities ---------- */

function cleanJSON(text: string) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

// Re-export config type for convenience
export { getAIConfig, setAIConfig } from "./aiConfig";