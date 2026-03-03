// lib/normalizeSkills.ts
import { prisma } from "@/lib/prisma";
import { generateEmbedding } from "@/lib/embeddings";

const SIMILARITY_THRESHOLD = 0.75;

type NormalizedSkill = {
  id: string;
  similarityScore: number;
};

export async function normalizeSkills(
  extractedSkills: string[]
): Promise<NormalizedSkill[]> {
  const results: NormalizedSkill[] = [];
  const seenSkillIds = new Set<string>();

  for (const rawSkill of extractedSkills) {
    const embedding = await generateEmbedding(rawSkill);

    // pgvector cosine similarity query
    const matches = await prisma.$queryRaw<
      {
        id: string;
        similarity: number;
      }[]
    >`
      SELECT
        id,
        1 - (embedding <=> ${embedding}::vector) AS similarity
      FROM "Skill"
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${embedding}::vector
      LIMIT 1;
    `;

    if (!matches.length) continue;

    const bestMatch = matches[0];

    if (bestMatch.similarity < SIMILARITY_THRESHOLD) continue;

    if (seenSkillIds.has(bestMatch.id)) continue;

    seenSkillIds.add(bestMatch.id);

    results.push({
      id: bestMatch.id,
      similarityScore: Number(bestMatch.similarity.toFixed(3)),
    });
  }

  return results;
}