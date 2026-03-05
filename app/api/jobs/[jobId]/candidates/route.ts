import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

//Job → list of candidates → sorted by score

/* 
output: list of candidates with their score and missing skills, sorted by score desc
[
  {
    "candidateId": "c1",
    "name": "Manas",
    "matchPercentage": 0.82,
    "missingSkills": ["Docker"]
  },
  {
    "candidateId": "c2",
    "name": "Rahul",
    "matchPercentage": 0.65,
    "missingSkills": ["Docker", "PostgreSQL"]
  }
] */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  // 1) Check login and role
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "HR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2) Get HR profile for current user
  const hrProfile = await prisma.hRProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!hrProfile) {
    return NextResponse.json({ error: "HR profile not found" }, { status: 404 });
  }

  // 3) Make sure this HR owns the job
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, hrId: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.hrId !== hrProfile.id) {
    return NextResponse.json(
      { error: "You are not allowed to view candidates for this job" },
      { status: 403 },
    );
  }

  // 4) Load match results + HR decisions
  const [results, decisions] = await Promise.all([
    prisma.matchResult.findMany({
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
    }),
    prisma.jobApplication.findMany({
      where: { jobId },
      select: {
        candidateId: true,
        status: true,
        note: true,
        updatedAt: true,
      },
    }),
  ]);

  // 5) Build lookup for quick status mapping
  const decisionByCandidateId = new Map(
    decisions.map((decision) => [decision.candidateId, decision]),
  );

  const formatted = results.map((r) => ({
    candidateId: r.candidate.id,
    name: r.candidate.user.fullname,
    matchPercentage: r.score * 100, // Convert to percentage
    missingSkills: r.missingSkills.map((ms) => ms.skill.name),
    status: decisionByCandidateId.get(r.candidate.id)?.status ?? "PENDING",
    note: decisionByCandidateId.get(r.candidate.id)?.note ?? null,
    statusUpdatedAt:
      decisionByCandidateId.get(r.candidate.id)?.updatedAt ?? null,
  }));

  return NextResponse.json(formatted);
}
