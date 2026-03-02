import { listLLMModels } from "@/lib/llm";

export async function GET() {
  try {
    const models = await listLLMModels();

    return Response.json({
      baseURL: process.env.OPENAI_BASE_URL ?? "http://localhost:1234/v1",
      chatModelEnv:
        process.env.LLM_MODEL ?? process.env.CHAT_MODEL ?? "mistral-7b-instruct-v0.3",
      embeddingModelEnv: process.env.EMBEDDING_MODEL ?? null,
      models,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        hint: "Start LM Studio local server and confirm the API base URL/port.",
      },
      { status: 500 },
    );
  }
}
