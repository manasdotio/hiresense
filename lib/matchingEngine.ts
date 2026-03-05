import { prisma } from "@/lib/prisma";

export async function computeMatch(resumeId: string, jobId: string) {
  const jobSkills = await prisma.jobSkill.findMany({
    where: { jobId }
  });

  const resumeSkills = await prisma.resumeSkill.findMany({
    where: { resumeId }
  });

  const candidateSkillIds = new Set(resumeSkills.map(s => s.skillId));

  let totalWeight = 0;
  let matchedWeight = 0;

  const missingSkills = [];

  for (const js of jobSkills) {
    totalWeight += js.weight;

    if (candidateSkillIds.has(js.skillId)) {
      matchedWeight += js.weight;
    } else {
      missingSkills.push({
        skillId: js.skillId,
        required: js.required
      });
    }
  }

  const score = totalWeight === 0 ? 0 : matchedWeight / totalWeight;

  return {
    score,
    missingSkills
  };
}