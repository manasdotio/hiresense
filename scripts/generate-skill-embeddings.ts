import { prisma } from "@/lib/prisma";
import { generateTextEmbedding } from "@/lib/llm";

type SkillRow = {
  id: string;
  name: string;
  embedding: string | null;
};

async function main() {
  const skills = await prisma.$queryRaw<SkillRow[]>`
    SELECT id, name, embedding::text AS embedding
    FROM "Skill"
  `;

  let generatedCount = 0;

  for (const skill of skills) {
    if (!skill.embedding) {
      const embedding = await generateTextEmbedding(skill.name);
      generatedCount += 1;
      console.log(`Skill: ${skill.name}`);
      console.log(`Embedding length: ${embedding.length}`);
      console.log(`Preview: ${embedding.slice(0, 8).join(", ")}`);
      console.log("---");
    }
  }

  console.log(`Generated embeddings (not stored): ${generatedCount}`);
}

main()
  .then(() => {
    console.log("Skill embedding backfill complete.");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });