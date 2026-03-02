import { prisma } from "@/lib/prisma";
import { generateTextEmbedding } from "@/lib/llm";

type SimilarSkillRow = {
  id: string;
  similarity: number;
};

export async function normalizeSkills(skillNames: string[], minSimilarity = 0.78) {
  const dbSkills = await prisma.skill.findMany();
  const byName = new Map(dbSkills.map((skill) => [skill.name.toLowerCase(), skill]));
  const byId = new Map(dbSkills.map((skill) => [skill.id, skill]));

  const normalized = [];

  for (const name of skillNames) {
    const exactMatch = byName.get(name.toLowerCase());

    if (exactMatch) {
      normalized.push(exactMatch);
      continue;
    }

    const embedding = await generateTextEmbedding(name);

    if (embedding.length === 0) {
      continue;
    }

    const vectorLiteral = `[${embedding.join(",")}]`;

    const semanticMatch = await prisma.$queryRaw<SimilarSkillRow[]>`
      SELECT id, 1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "Skill"
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorLiteral}::vector
      LIMIT 1
    `;

    const best = semanticMatch[0];

    if (best && Number(best.similarity) >= minSimilarity) {
      const resolved = byId.get(best.id);

      if (resolved) {
        normalized.push(resolved);
      }
    }
  }

  return normalized;
}
