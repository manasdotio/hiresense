import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

//Job → list of candidates → sorted by score

/* 
output: list of candidates with their score and missing skills, sorted by score desc
[
  {
    "candidateId": "c1",
    "name": "Manas",
    "score": 0.82,
    "missingSkills": ["Docker"]
  },
  {
    "candidateId": "c2",
    "name": "Rahul",
    "score": 0.65,
    "missingSkills": ["Docker", "PostgreSQL"]
  }
] */

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  const { jobId } = params;

  const results = await prisma.matchResult.findMany({
    where: { jobId },
    orderBy: { score: "desc" },
    include: {
      candidate: {
        include: {
          user: true,
        },
      },
      missingSkills: {
        include: {
          skill: true,
        },
      },
    },
  });

  const formatted = results.map((r) => ({
    candidateId: r.candidate.id,
    name: r.candidate.user.fullname,
    score: r.score,
    missingSkills: r.missingSkills.map((ms) => ms.skill.name),
  }));

  return NextResponse.json(formatted);
}
