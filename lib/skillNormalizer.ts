import { prisma } from "@/lib/prisma";

export async function normalizeSkills(skillNames: string[]) {
  const dbSkills = await prisma.skill.findMany();

  const normalized = [];

  for (const name of skillNames) {
    const match = dbSkills.find(
      (s) => s.name.toLowerCase() === name.toLowerCase(),
    );

    if (match) {
      normalized.push(match);
    }
  }

  return normalized;
}
