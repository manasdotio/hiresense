import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type ApplicationStatusValue = "APPLIED" | "SHORTLISTED" | "INTERVIEW" | "REJECTED";

type UpdateStatusBody = {
  status?: string;
  note?: string;
};

const ALLOWED_STATUSES: ApplicationStatusValue[] = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEW",
  "REJECTED",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; candidateId: string }> },
) {
  const { jobId, candidateId } = await params;

  // 1) Check authentication and role
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "HR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 2) Parse request body
  const body = (await request.json()) as UpdateStatusBody;
  const status = body.status?.trim().toUpperCase();
  const note = body.note?.trim() ?? null;

  if (!status || !ALLOWED_STATUSES.includes(status as ApplicationStatusValue)) {
    return NextResponse.json(
      { error: "Invalid status. Use APPLIED, SHORTLISTED, INTERVIEW, or REJECTED" },
      { status: 400 },
    );
  }

  // 3) Ensure HR profile exists
  const hrProfile = await prisma.hRProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!hrProfile) {
    return NextResponse.json({ error: "HR profile not found" }, { status: 404 });
  }

  // 4) Ensure this job belongs to the logged-in HR
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, hrId: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.hrId !== hrProfile.id) {
    return NextResponse.json(
      { error: "You are not allowed to update this job" },
      { status: 403 },
    );
  }

  // 5) Ensure candidate is part of this job's match results
  const hasMatch = await prisma.matchResult.findFirst({
    where: { jobId, candidateId },
    select: { id: true },
  });

  if (!hasMatch) {
    return NextResponse.json(
      { error: "Candidate match result not found for this job" },
      { status: 404 },
    );
  }

  // 6) Create or update HR decision row
  const decision = await prisma.jobApplication.upsert({
    where: {
      jobId_candidateId: {
        jobId,
        candidateId,
      },
    },
    update: {
      status: status as ApplicationStatusValue,
      note,
    },
    create: {
      jobId,
      candidateId,
      status: status as ApplicationStatusValue,
      note,
    },
  });

  return NextResponse.json({
    message: "Candidate status updated successfully",
    data: decision,
  });
}
