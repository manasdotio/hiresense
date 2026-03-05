import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> },
) {
  const { resumeId } = await params;

  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
  });

  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const matches = await prisma.matchResult.findMany({
    where: {
      candidateId: resume.candidateId,
    },
    orderBy: {
      score: "desc",
    },
    include: {
      job: true,
    },
  });

  const formatted = matches.map((m) => ({
    jobId: m.job.id,
    jobTitle: m.job.title,
    matchPercentage: m.score,
  }));

  return NextResponse.json(formatted);
}
