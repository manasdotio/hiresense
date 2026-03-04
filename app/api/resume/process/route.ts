import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractResumeData } from "@/lib/resumeExtractor";
import { ensureSkillsWithEmbeddings } from "@/lib/skillStore";

export async function POST(request: NextRequest) {
  const { resumeId } = await request.json();

  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
  });

  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const extracted = await extractResumeData(resume.rawText);

  // Update candidate profile with experience years if available
  if (extracted.experienceYears !== null) {
    await prisma.candidateProfile.update({
      where: { id: resume.candidateId },
      data: {
        experienceYears: extracted.experienceYears,
      },
    });
  }
  // Clear old skills for this resume before inserting new ones
  await prisma.resumeSkill.deleteMany({
    where: { resumeId: resume.id },
  });

  // Normalize skills first
  const normalizedSkills = await ensureSkillsWithEmbeddings(
    extracted.skills,
    false,
  );
  //Insert into ResumeSkill
  await prisma.resumeSkill.createMany({
    data: normalizedSkills.map((skill) => ({
      resumeId: resume.id,
      skillId: skill.id,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({
    extractedSkills: extracted.skills,
    experienceYears: extracted.experienceYears,
  });
}
