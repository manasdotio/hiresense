import { authOptions } from "@/lib/auth";
import { computeMatch } from "@/lib/matchingEngine";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const MIN_MATCH_PERCENTAGE = 30;
const MIN_MATCH_SCORE = MIN_MATCH_PERCENTAGE / 100;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CANDIDATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const candidate = await prisma.candidateProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!candidate) {
    return NextResponse.json(
      { error: "Candidate profile not found" },
      { status: 404 },
    );
  }

  const apps = await prisma.jobApplication.findMany({
    where: { candidateId: candidate.id },
    include: {
      job: true,
    },
  });

  const formattedApps = apps.map((app) => ({
    jobId: app.job.id,
    jobTitle: app.job.title,
    status: app.status,
    appliedAt: app.createdAt,
  }));

  return NextResponse.json(formattedApps);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "CANDIDATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { jobId } = await req.json();

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 });
  }

  const candidate = await prisma.candidateProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!candidate) {
    return NextResponse.json(
      { error: "Candidate profile not found" },
      { status: 404 },
    );
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, title: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const latestProcessedResume = await prisma.resume.findFirst({
    where: {
      candidateId: candidate.id,
      resumeSkills: {
        some: {},
      },
    },
    orderBy: { extractedAt: "desc" },
    select: { id: true },
  });

  if (!latestProcessedResume) {
    return NextResponse.json(
      {
        error: "Please upload and process at least one resume before applying.",
      },
      { status: 400 },
    );
  }

  // Check for existing application
  const existing = await prisma.jobApplication.findUnique({
    where: {
      jobId_candidateId: {
        candidateId: candidate.id,
        jobId,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "Already applied" }, { status: 409 });
  }

  // Compute match from the latest processed resume before creating application.
  const computed = await computeMatch(latestProcessedResume.id, jobId);

  if (computed.score <= MIN_MATCH_SCORE) {
    return NextResponse.json(
      {
        error: `You can only apply to jobs with match score above ${MIN_MATCH_PERCENTAGE}%.`,
      },
      { status: 403 },
    );
  }

  const created = await prisma.$transaction(async (tx) => {
    await tx.matchResult.deleteMany({
      where: {
        candidateId: candidate.id,
        jobId,
      },
    });

    const matchResult = await tx.matchResult.create({
      data: {
        candidateId: candidate.id,
        jobId,
        score: computed.score,
        missingSkills: {
          create: computed.missingSkills.map((skill) => ({
            skillId: skill.skillId,
            priority: skill.required ? "HIGH" : "MEDIUM",
          })),
        },
      },
      select: {
        id: true,
        score: true,
      },
    });

    const application = await tx.jobApplication.create({
      data: {
        candidateId: candidate.id,
        jobId,
        status: "APPLIED",
      },
      include: {
        job: true,
      },
    });

    return {
      application,
      matchResult,
    };
  });

  return NextResponse.json({
    id: created.application.id,
    jobTitle: created.application.job.title,
    status: created.application.status,
    match: {
      matchId: created.matchResult.id,
      score: created.matchResult.score,
    },
  });
}
