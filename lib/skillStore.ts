import { prisma } from "@/lib/prisma";
import { generateTextEmbedding } from "@/lib/llm";

type SkillRow = {
  id: string;
  name: string;
  embedding: string | null;
};

type SimilarSkillRow = {
  id: string;
  name: string;
  similarity: number;
};

type StoredSkill = {
  id: string;
  name: string;
};

function normalizeSkillName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function skillKey(name: string) {
  return normalizeSkillName(name).toLowerCase();
}

async function setSkillEmbedding(skillId: string, embedding: number[]) {
  if (!embedding.length) {
    return;
  }

  const vectorLiteral = `[${embedding.join(",")}]`;

  await prisma.$executeRaw`
    UPDATE "Skill"
    SET embedding = ${vectorLiteral}::vector
    WHERE id = ${skillId}
  `;
}

async function findNearestSkill(
  embedding: number[],
  minSimilarity: number,
) {
  if (!embedding.length) {
    return null;
  }

  const vectorLiteral = `[${embedding.join(",")}]`;

  const rows = await prisma.$queryRaw<SimilarSkillRow[]>`
    SELECT
      id,
      name,
      1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
    FROM "Skill"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> ${vectorLiteral}::vector
    LIMIT 1
  `;

  const best = rows[0];

  if (!best) {
    return null;
  }

  if (Number(best.similarity) < minSimilarity) {
    return null;
  }

  return {
    id: best.id,
    name: best.name,
  };
}

export async function ensureSkillsWithEmbeddings(skillNames: string[]) {
  const minSimilarity = 0.78;

  const uniqueNames = Array.from(
    new Set(
      skillNames
        .map((name) => normalizeSkillName(name))
        .filter((name) => name.length > 0),
    ),
  );

  if (uniqueNames.length === 0) {
    return [] as StoredSkill[];
  }

  const existingRows = await prisma.$queryRaw<SkillRow[]>`
    SELECT id, name, embedding::text AS embedding
    FROM "Skill"
  `;

  const byKey = new Map(existingRows.map((row) => [skillKey(row.name), row]));
  const ensured: StoredSkill[] = [];

  for (const inputName of uniqueNames) {
    const key = skillKey(inputName);
    const existing = byKey.get(key);

    if (existing) {
      if (!existing.embedding) {
        const embedding = await generateTextEmbedding(existing.name);
        await setSkillEmbedding(existing.id, embedding);
      }

      ensured.push({ id: existing.id, name: existing.name });
      continue;
    }

    const inputEmbedding = await generateTextEmbedding(inputName);

    const nearest = await findNearestSkill(inputEmbedding, minSimilarity);

    if (nearest) {
      ensured.push(nearest);
      continue;
    }

    const created = await prisma.skill.create({
      data: { name: inputName },
      select: { id: true, name: true },
    });

    await setSkillEmbedding(created.id, inputEmbedding);

    ensured.push(created);
  }

  return ensured;
}
