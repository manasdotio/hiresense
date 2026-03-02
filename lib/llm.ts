import OpenAI from "openai";

export const openai = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL ?? "http://localhost:1234/v1",
  apiKey: "lm-studio", // required but can be anything
});
export async function callLLM(prompt: string) {
  const strictUserPrompt = `
You are a strict JSON API.
Always return valid JSON only.
No explanation.
No markdown.
No backticks.

${prompt}
`;

  const response = await openai.chat.completions.create({
    model: "mistral-7b-instruct-v0.3",
    temperature: 0,
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: strictUserPrompt,
      },
    ],
  });

  const content = response.choices[0].message.content ?? "";

  return cleanJSON(content);
}

export async function generateTextEmbedding(
  text: string,
  model = process.env.EMBEDDING_MODEL ?? "text-embedding-nomic-embed-text-v1.5",
) {
  const response = await openai.embeddings.create({
    model,
    input: text,
    encoding_format: "float",
  });

  const embedding = response.data[0]?.embedding ?? [];

  if (!embedding.length) {
    throw new Error(
      `Embedding model '${model}' returned an empty vector. Check model availability in your local LLM server.`,
    );
  }

  const hasNonZeroValue = embedding.some((value) => Math.abs(value) > 1e-12);

  if (!hasNonZeroValue) {
    throw new Error(
      `Embedding model '${model}' returned an all-zero vector. Use a real embedding-capable model ID loaded in LM Studio (set EMBEDDING_MODEL to the exact loaded model name).`,
    );
  }

  return embedding;
}

export async function listLLMModels() {
  const response = await openai.models.list();
  return response.data.map((model) => model.id);
}

function cleanJSON(text: string) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}


