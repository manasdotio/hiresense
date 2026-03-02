import { prisma } from "@/lib/prisma";
import { ensureSkillsWithEmbeddings } from "@/lib/skillStore";

async function main() {
  const skills = await prisma.skill.findMany({
    select: { name: true },
  });

  await ensureSkillsWithEmbeddings(skills.map((skill) => skill.name));

  console.log(`Processed embeddings for ${skills.length} skills.`);
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