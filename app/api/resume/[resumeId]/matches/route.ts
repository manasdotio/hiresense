import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

    // Current schema stores match results per candidate+job, not per resume.
    const matches = await prisma.matchResult.findMany({
      where: {
        candidateId: candidate.id,
      },
      orderBy: {
        score: "desc",
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    const formatted = matches.map((m) => ({
      jobId: m.job.id,
      jobTitle: m.job.title,
      score: m.score,
      matchPercentage: Number((m.score * 100).toFixed(2)),
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Get Resume Matches Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
