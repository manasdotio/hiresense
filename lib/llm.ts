import OpenAI from "openai";

/* ---------- OpenAI Client ---------- */

export const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL ?? "http://localhost:1234/v1",
  apiKey: "lm-studio", // required but can be anything
});

/* ---------- Model Helpers ---------- */

function getChatModel() {
  return (
    process.env.LLM_MODEL ??
    process.env.CHAT_MODEL ??
    "mistral-7b-instruct-v0.3"
  );
}

async function createChatCompletion(model: string, content: string) {
  return openai.chat.completions.create({
    model,
    temperature: 0,
    max_tokens: 500,
    messages: [{ role: "user", content }],
  });
}

/* ---------- LLM Call ---------- */

export async function callLLM(prompt: string) {
  const strictPrompt = `
You are a strict JSON API.
Always return valid JSON only.
No explanation.
No markdown.
No backticks.

${prompt}
`;

  const model = getChatModel();
  let response;

  try {
    response = await createChatCompletion(model, strictPrompt);
  } catch (error) {
    const err = error as {
      status?: number;
      param?: string;
    };

    const modelFailed = err?.status === 400 && err?.param === "model";

    if (!modelFailed) throw error;

    const models = await listLLMModels();
    const fallback = models[0];

    if (!fallback) {
      throw new Error(
        `Model '${model}' unavailable and no fallback models found on ${
          process.env.OPENAI_BASE_URL ?? "http://localhost:1234/v1"
        }.`
      );
    }

    response = await createChatCompletion(fallback, strictPrompt);
  }

  const content = response.choices[0]?.message?.content ?? "";
  return cleanJSON(content);
}

/* ---------- Embeddings ---------- */

export async function generateTextEmbedding(
  text: string,
  model = process.env.EMBEDDING_MODEL ??
    "text-embedding-nomic-embed-text-v1.5"
) {
  const response = await openai.embeddings.create({
    model,
    input: text,
    encoding_format: "float",
  });

  const embedding = response.data[0]?.embedding ?? [];

  if (!embedding.length) {
    throw new Error(
      `Embedding model '${model}' returned an empty vector.`
    );
  }

  const hasNonZero = embedding.some((v) => Math.abs(v) > 1e-12);

  if (!hasNonZero) {
    throw new Error(
      `Embedding model '${model}' returned an all-zero vector.`
    );
  }

  return embedding;
}

/* ---------- Utilities ---------- */

export async function listLLMModels() {
  const response = await openai.models.list();
  return response.data.map((m) => m.id);
}

function cleanJSON(text: string) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}