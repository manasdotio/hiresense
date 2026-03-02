import { extractJobSkills } from "@/lib/jobExtractor";
import { generateTextEmbedding } from "@/lib/llm";

export async function GET() {
  try {
    const description = `
We are hiring a backend engineer.
Must have Node.js, PostgreSQL, Docker, and REST APIs.
Nice to have Redis and AWS.
Minimum 3 years experience.
`;

    const extracted = await extractJobSkills(description);
    const skillNames = [
      ...new Set([
        ...(extracted.required_skills ?? []),
        ...(extracted.preferred_skills ?? []),
      ]),
    ];

    const vectors = [] as {
      skill: string;
      embeddingLength: number;
      preview: number[];
    }[];

    for (const skill of skillNames) {
      const embedding = await generateTextEmbedding(skill);

      console.log(`Skill: ${skill}`);
      console.log(`Embedding length: ${embedding.length}`);
      console.log(`Preview: ${embedding.slice(0, 8).join(", ")}`);

      vectors.push({
        skill,
        embeddingLength: embedding.length,
        preview: embedding.slice(0, 8),
      });
    }

    return Response.json({
      description,
      extracted,
      vectors,
      note: "Embeddings are generated and logged only. Nothing is stored in DB.",
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        embeddingModelEnv:
          process.env.EMBEDDING_MODEL ?? "text-embedding-nomic-embed-text-v1.5",
        baseURL: process.env.OPENAI_BASE_URL ?? "http://localhost:1234/v1",
        hint: "Call /api/test-models and use one exact model ID from that list in EMBEDDING_MODEL.",
      },
      { status: 500 },
    );
  }
}
