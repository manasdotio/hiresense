import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> },
) {
  void req;
  const { resumeId } = await params;

  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate profile not found" },
        { status: 404 },
      );
    }

    // Verify resume belongs to this candidate
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, candidateId: candidate.id },
      select: { id: true },
    });

    if (!resume) {
      return NextResponse.json(
        { error: "Resume not found" },
        { status: 404 },
      );
    }

    const analyses = await prisma.resumeAnalysis.findMany({
      where: { resumeId },
      orderBy: { createdAt: "desc" },
      include: {
        jobDescription: { select: { content: true } },
        missingSkills: {
          include: { skill: { select: { id: true, name: true } } },
        },
      },
    });

    const formatted = analyses.map((a) => ({
      analysisId: a.id,
      score: a.score,
      matchPercentage: Math.round(a.score * 100),
      createdAt: a.createdAt.toISOString(),
      jobDescriptionPreview: a.jobDescription.content.slice(0, 120) + "...",
      suggestions: a.suggestions,
      missingSkills: a.missingSkills.map((ms) => ({
        skillId: ms.skill.id,
        skillName: ms.skill.name,
        priority: ms.priority ?? "HIGH",
      })),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Get Analyses Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
