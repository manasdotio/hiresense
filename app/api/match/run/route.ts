import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeMatch } from "@/lib/matchingEngine";

export async function POST(req: NextRequest) {
  const { resumeId, jobId } = await req.json();

  if (!resumeId || !jobId) {
    return NextResponse.json(
      { error: "resumeId and jobId are required" },
      { status: 400 },
    );
  }

  const result = await computeMatch(resumeId, jobId);

  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
  });

  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  // First delete related MissingSkill records to avoid foreign key constraint violation
  const existingMatches = await prisma.matchResult.findMany({
    where: {
      candidateId: resume.candidateId,
      jobId,
    },
    select: { id: true },
  });

  if (existingMatches.length > 0) {
    // Delete MatchResult records (MissingSkill records will be automatically deleted due to onDelete: Cascade)
    await prisma.matchResult.deleteMany({
      where: {
        candidateId: resume.candidateId,
        jobId,
      },
    });
  }

  const match = await prisma.matchResult.create({
    data: {
      candidateId: resume.candidateId,
      jobId,
      score: result.score,
      missingSkills: {
        create: result.missingSkills.map((skill) => ({
          skillId: skill.skillId,
          priority: skill.required ? "HIGH" : "MEDIUM",
        })),
      },
    },
  });

  return NextResponse.json({
    score: result.score,
    missingSkills: result.missingSkills,
    matchId: match.id,
  });
}
