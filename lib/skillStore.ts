import { prisma } from "@/lib/prisma";
import { generateTextEmbedding } from "@/lib/llm";

type SkillRow = {
  id: string;
  name: string;
  embedding: string | null;
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

export async function ensureSkillsWithEmbeddings(skillNames: string[]) {
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

    const created = await prisma.skill.create({
      data: { name: inputName },
      select: { id: true, name: true },
    });

    const embedding = await generateTextEmbedding(created.name);
    await setSkillEmbedding(created.id, embedding);

    byKey.set(key, { id: created.id, name: created.name, embedding: "generated" });
    ensured.push(created);
  }

  return ensured;
}
