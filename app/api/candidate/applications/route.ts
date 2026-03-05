import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

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

  // Create new application
  const application = await prisma.jobApplication.create({
    data: {
      candidateId: candidate.id,
      jobId,
      status: "APPLIED",
    },
    include: {
      job: true,
    },
  });

  return NextResponse.json({
    id: application.id,
    jobTitle: application.job.title,
    status: application.status,
  });
}
