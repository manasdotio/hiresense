import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const MIN_MATCH_PERCENTAGE = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> },
) {
  void req;

  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resumeId } = await params;

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

    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        candidateId: candidate.id,
      },
      select: {
        id: true,
        _count: {
          select: {
            resumeSkills: true,
          },
        },
      },
    });

    if (!resume) {
      return NextResponse.json(
        { error: "Resume not found for this candidate" },
        { status: 404 },
      );
    }

    if (resume._count.resumeSkills === 0) {
      return NextResponse.json(
        { error: "Process this resume first to view matches" },
        { status: 400 },
      );
    }

    const resumeSkills = await prisma.resumeSkill.findMany({
      where: { resumeId: resume.id },
      select: { skillId: true },
    });

    const candidateSkillIds = new Set(
      resumeSkills.map((resumeSkill) => resumeSkill.skillId),
    );

    const jobs = await prisma.job.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        jobSkills: {
          select: {
            skillId: true,
            weight: true,
          },
        },
      },
    });

    const formatted = jobs
      .map((job) => {
        const totalWeight = job.jobSkills.reduce(
          (sum, jobSkill) => sum + jobSkill.weight,
          0,
        );

        const matchedWeight = job.jobSkills.reduce((sum, jobSkill) => {
          if (candidateSkillIds.has(jobSkill.skillId)) {
            return sum + jobSkill.weight;
          }

          return sum;
        }, 0);

        const score = totalWeight === 0 ? 0 : matchedWeight / totalWeight;
        const matchPercentage = Number((score * 100).toFixed(2));

        return {
          jobId: job.id,
          jobTitle: job.title,
          score,
          matchPercentage,
        };
      })
      .filter((match) => match.matchPercentage > MIN_MATCH_PERCENTAGE)
      .sort((first, second) => second.score - first.score);

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Get Resume Matches Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
