import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string; candidateId: string }> }
) {
  const { jobId , candidateId} = await params;

const match = await prisma.matchResult.findFirst({
  where: {
    jobId,
    candidateId
  },
  include: {
    missingSkills: {
      include: {
        skill: true
      }
    }
  }
});

  if (!match) {
    return NextResponse.json(
      { error: "No match result found for this job and candidate" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    score: match.score,
    missingSkills: match.missingSkills.map(ms => ({
      name: ms.skill.name,
      priority: ms.priority
    }))
  });
}
