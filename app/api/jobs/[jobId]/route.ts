import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractJobSkills } from "@/lib/jobExtractor";
import { ensureSkillsWithEmbeddings } from "@/lib/skillStore";

/* ---------------- TYPES ---------------- */

type ApplicationStatusKey =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "REJECTED";

type StatusCounts = Record<ApplicationStatusKey, number>;

type UpdateJobBody = {
  title?: string;
  description?: string;
};

type ExtractedSkills = {
  required_skills?: unknown;
  preferred_skills?: unknown;
  minExperience?: number;
};

const MIN_MATCH_PERCENTAGE = 30;
const MIN_MATCH_SCORE = MIN_MATCH_PERCENTAGE / 100;

/* ---------------- HELPERS ---------------- */

function emptyStatusCounts(): StatusCounts {
  return {
    APPLIED: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    REJECTED: 0,
  };
}

function isApplicationStatus(value: string): value is ApplicationStatusKey {
  return ["APPLIED", "SHORTLISTED", "INTERVIEW", "REJECTED"].includes(value);
}

function normalizeSkill(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/* ======================================================
   GET JOB DETAIL
====================================================== */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  void req;
  const { jobId } = await params;

  try {
    /* Auth */
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* Load job */
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        hr: { include: { user: { select: { id: true, fullname: true } } } },
        jobSkills: {
          include: { skill: { select: { id: true, name: true } } },
        },
        _count: { select: { applications: true, matches: true } },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const role = session.user.role;
    let candidateId: string | null = null;
    let candidateResumeSkillIds = new Set<string>();

    /* Role access checks */

    if (role === "HR") {
      const hrProfile = await prisma.hRProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!hrProfile)
        return NextResponse.json(
          { error: "HR profile not found" },
          { status: 404 },
        );

      if (job.hrId !== hrProfile.id)
        return NextResponse.json(
          { error: "Not allowed to view this job" },
          { status: 403 },
        );
    }

    if (role === "CANDIDATE") {
      const profile = await prisma.candidateProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!profile)
        return NextResponse.json(
          { error: "Candidate profile not found" },
          { status: 404 },
        );

      candidateId = profile.id;

      const latestProcessedResume = await prisma.resume.findFirst({
        where: {
          candidateId: profile.id,
          resumeSkills: {
            some: {},
          },
        },
        orderBy: { extractedAt: "desc" },
        select: {
          id: true,
        },
      });

      if (!latestProcessedResume) {
        return NextResponse.json(
          { error: "Upload and process at least one resume to see matched jobs." },
          { status: 400 },
        );
      }

      const resumeSkills = await prisma.resumeSkill.findMany({
        where: { resumeId: latestProcessedResume.id },
        select: { skillId: true },
      });

      candidateResumeSkillIds = new Set(
        resumeSkills.map((resumeSkill) => resumeSkill.skillId),
      );
    }

    if (role !== "HR" && role !== "CANDIDATE" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* Candidate application state */

    let hasApplied = false;
    let myApplicationStatus: string | null = null;

    if (candidateId) {
      const app = await prisma.jobApplication.findUnique({
        where: {
          jobId_candidateId: { jobId, candidateId },
        },
        select: { status: true },
      });

      hasApplied = Boolean(app);
      myApplicationStatus = app?.status ?? null;
    }

    /* HR pipeline summary */

    let pipeline: StatusCounts | null = null;

    if (role === "HR" || role === "ADMIN") {
      pipeline = emptyStatusCounts();

      const rows = await prisma.jobApplication.groupBy({
        by: ["status"],
        where: { jobId },
        _count: { _all: true },
      });

      for (const r of rows) {
        if (isApplicationStatus(r.status)) {
          pipeline[r.status] = r._count._all;
        }
      }
    }

    /* Skill separation */

    const requiredSkills = job.jobSkills
      .filter((s) => s.required)
      .map((s) => ({
        id: s.skill.id,
        name: s.skill.name,
        weight: s.weight,
      }));

    const preferredSkills = job.jobSkills
      .filter((s) => !s.required)
      .map((s) => ({
        id: s.skill.id,
        name: s.skill.name,
        weight: s.weight,
      }));

    let matchPercentage: number | null = null;

    if (role === "CANDIDATE") {
      const totalWeight = job.jobSkills.reduce((sum, skill) => sum + skill.weight, 0);

      const matchedWeight = job.jobSkills.reduce((sum, skill) => {
        if (candidateResumeSkillIds.has(skill.skillId)) {
          return sum + skill.weight;
        }

        return sum;
      }, 0);

      const score = totalWeight === 0 ? 0 : matchedWeight / totalWeight;
      matchPercentage = Number((score * 100).toFixed(2));

      if (score <= MIN_MATCH_SCORE && !hasApplied) {
        return NextResponse.json(
          {
            error: `This job requires a match score above ${MIN_MATCH_PERCENTAGE}%.`,
          },
          { status: 404 },
        );
      }
    }

    return NextResponse.json({
      job: {
        id: job.id,
        title: job.title,
        description: job.description,
        minExperience: job.minExperience,
        createdAt: job.createdAt,
        postedBy: {
          id: job.hr.user.id,
          fullname: job.hr.user.fullname,
        },
        requiredSkills,
        preferredSkills,
        applicationsCount: job._count.applications,
        matchesCount: job._count.matches,
        hasApplied,
        myApplicationStatus,
        matchPercentage,
      },
      pipeline,
    });
  } catch (err) {
    console.error("Get Job Detail Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/* ======================================================
   UPDATE JOB
====================================================== */

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = session.user.role;
    if (role !== "HR" && role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as UpdateJobBody;

    const title = body.title?.trim();
    const description = body.description?.trim();

    if (title === "" || description === "") {
      return NextResponse.json(
        { error: "Fields cannot be empty" },
        { status: 400 },
      );
    }

    if (!title && !description) {
      return NextResponse.json(
        { error: "Provide title or description to update" },
        { status: 400 },
      );
    }

    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, hrId: true, description: true },
    });

    if (!existingJob)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (role === "HR") {
      const hr = await prisma.hRProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!hr || hr.id !== existingJob.hrId)
        return NextResponse.json(
          { error: "Not allowed to update this job" },
          { status: 403 },
        );
    }

    const updateData: {
      title?: string;
      description?: string;
      minExperience?: number;
    } = {};

    if (title) updateData.title = title;
    if (description) updateData.description = description;

    const descriptionChanged =
      description && description !== existingJob.description;

    let skills: { id: string; name: string }[] = [];
    let requiredSet = new Set<string>();

    if (descriptionChanged && description) {
      const extracted: ExtractedSkills = await extractJobSkills(description);

      const required = [...new Set(safeStringArray(extracted.required_skills))];
      const preferred = [
        ...new Set(safeStringArray(extracted.preferred_skills)),
      ];

      const stored = await ensureSkillsWithEmbeddings([
        ...required,
        ...preferred,
      ]);

      requiredSet = new Set(required.map(normalizeSkill));

      skills = Array.from(
        new Map(stored.map((s) => [normalizeSkill(s.name), s])).values(),
      );

      updateData.minExperience = extracted.minExperience ?? 0;
    }

    const updatedJob = await prisma.$transaction(async (tx) => {
      await tx.job.update({ where: { id: jobId }, data: updateData });

      if (descriptionChanged) {
        await tx.jobSkill.deleteMany({ where: { jobId } });

        if (skills.length) {
          await tx.jobSkill.createMany({
            data: skills.map((s) => ({
              jobId,
              skillId: s.id,
              required: requiredSet.has(normalizeSkill(s.name)),
              weight: requiredSet.has(normalizeSkill(s.name)) ? 2 : 1,
            })),
          });
        }
      }

      return tx.job.findUnique({
        where: { id: jobId },
        include: {
          hr: { include: { user: { select: { id: true, fullname: true } } } },
          jobSkills: {
            include: { skill: { select: { id: true, name: true } } },
          },
          _count: { select: { applications: true, matches: true } },
        },
      });
    });

    if (!updatedJob)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const requiredSkills = updatedJob.jobSkills
      .filter((s) => s.required)
      .map((s) => ({
        id: s.skill.id,
        name: s.skill.name,
        weight: s.weight,
      }));

    const preferredSkills = updatedJob.jobSkills
      .filter((s) => !s.required)
      .map((s) => ({
        id: s.skill.id,
        name: s.skill.name,
        weight: s.weight,
      }));

    return NextResponse.json({
      message: "Job updated successfully",
      skillsRegenerated: descriptionChanged,
      job: {
        id: updatedJob.id,
        title: updatedJob.title,
        description: updatedJob.description,
        minExperience: updatedJob.minExperience,
        createdAt: updatedJob.createdAt,
        postedBy: {
          id: updatedJob.hr.user.id,
          fullname: updatedJob.hr.user.fullname,
        },
        requiredSkills,
        preferredSkills,
        applicationsCount: updatedJob._count.applications,
        matchesCount: updatedJob._count.matches,
      },
    });
  } catch (err) {
    console.error("Update Job Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

/* ======================================================
   DELETE JOB
====================================================== */

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  void req;
  const { jobId } = await params;

  try {
    const session = await getServerSession(authOptions);
    if (!session)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const role = session.user.role;
    if (role !== "HR" && role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, hrId: true, title: true },
    });

    if (!job)
      return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (role === "HR") {
      const hr = await prisma.hRProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!hr || hr.id !== job.hrId)
        return NextResponse.json(
          { error: "Not allowed to delete this job" },
          { status: 403 },
        );
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const apps = await tx.jobApplication.deleteMany({ where: { jobId } });
      const skills = await tx.jobSkill.deleteMany({ where: { jobId } });
      const matches = await tx.matchResult.deleteMany({ where: { jobId } });

      const jobDeleted = await tx.job.delete({
        where: { id: jobId },
        select: { id: true, title: true },
      });

      return {
        apps: apps.count,
        skills: skills.count,
        matches: matches.count,
        job: jobDeleted,
      };
    });

    return NextResponse.json({
      message: "Job deleted successfully",
      job: deleted.job,
      deletedCounts: {
        applications: deleted.apps,
        jobSkills: deleted.skills,
        matches: deleted.matches,
      },
    });
  } catch (err) {
    console.error("Delete Job Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
