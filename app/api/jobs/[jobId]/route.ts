import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractJobSkills } from "@/lib/jobExtractor";
import { ensureSkillsWithEmbeddings } from "@/lib/skillStore";

type ApplicationStatusKey = "APPLIED" | "SHORTLISTED" | "INTERVIEW" | "REJECTED";
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

function emptyStatusCounts(): StatusCounts {
  return {
    APPLIED: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    REJECTED: 0,
  };
}

function isApplicationStatus(value: string): value is ApplicationStatusKey {
  return (
    value === "APPLIED" ||
    value === "SHORTLISTED" ||
    value === "INTERVIEW" ||
    value === "REJECTED"
  );
}

function normalizeSkill(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  void req;
  const { jobId } = await params;

  try {
    // 1) Auth check
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) Load job with relations needed for Job Detail page
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        hr: {
          include: {
            user: {
              select: {
                id: true,
                fullname: true,
              },
            },
          },
        },
        jobSkills: {
          include: {
            skill: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            applications: true,
            matches: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const role = session.user.role;
    let candidateId: string | null = null;

    // 3) Role checks
    if (role === "HR") {
      const hrProfile = await prisma.hRProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!hrProfile) {
        return NextResponse.json(
          { error: "HR profile not found" },
          { status: 404 },
        );
      }

      if (job.hrId !== hrProfile.id) {
        return NextResponse.json(
          { error: "You are not allowed to view this job" },
          { status: 403 },
        );
      }
    } else if (role === "CANDIDATE") {
      const candidateProfile = await prisma.candidateProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!candidateProfile) {
        return NextResponse.json(
          { error: "Candidate profile not found" },
          { status: 404 },
        );
      }

      candidateId = candidateProfile.id;
    } else if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 4) Candidate-specific status (for Apply button state)
    let hasApplied = false;
    let myApplicationStatus: string | null = null;

    if (candidateId) {
      const myApplication = await prisma.jobApplication.findUnique({
        where: {
          jobId_candidateId: {
            jobId,
            candidateId,
          },
        },
        select: {
          status: true,
        },
      });

      hasApplied = Boolean(myApplication);
      myApplicationStatus = myApplication?.status ?? null;
    }

    // 5) HR/Admin pipeline summary
    let pipeline: StatusCounts | null = null;

    if (role === "HR" || role === "ADMIN") {
      pipeline = emptyStatusCounts();

      const pipelineRows = await prisma.jobApplication.groupBy({
        by: ["status"],
        where: { jobId },
        _count: { _all: true },
      });

      for (const row of pipelineRows) {
        if (isApplicationStatus(row.status)) {
          pipeline[row.status] = row._count._all;
        }
      }
    }

    const requiredSkills = job.jobSkills
      .filter((jobSkill) => jobSkill.required)
      .map((jobSkill) => ({
        id: jobSkill.skill.id,
        name: jobSkill.skill.name,
        weight: jobSkill.weight,
      }));

    const preferredSkills = job.jobSkills
      .filter((jobSkill) => !jobSkill.required)
      .map((jobSkill) => ({
        id: jobSkill.skill.id,
        name: jobSkill.skill.name,
        weight: jobSkill.weight,
      }));

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
      },
      pipeline,
    });
  } catch (error) {
    console.error("Get Job Detail Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await params;

  try {
    // 1) Auth check
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;

    if (role !== "HR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) Parse and validate body
    const body = (await request.json()) as UpdateJobBody;

    let trimmedTitle: string | undefined;
    let trimmedDescription: string | undefined;

    if (typeof body.title === "string") {
      trimmedTitle = body.title.trim();

      if (!trimmedTitle) {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 },
        );
      }
    }

    if (typeof body.description === "string") {
      trimmedDescription = body.description.trim();

      if (!trimmedDescription) {
        return NextResponse.json(
          { error: "Description cannot be empty" },
          { status: 400 },
        );
      }
    }

    if (trimmedTitle === undefined && trimmedDescription === undefined) {
      return NextResponse.json(
        {
          error:
            "Nothing to update. Provide at least one of: title, description",
        },
        { status: 400 },
      );
    }

    // 3) Ensure job exists
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        hrId: true,
        description: true,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // 4) HR can only edit own jobs
    if (role === "HR") {
      const hrProfile = await prisma.hRProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!hrProfile) {
        return NextResponse.json(
          { error: "HR profile not found" },
          { status: 404 },
        );
      }

      if (existingJob.hrId !== hrProfile.id) {
        return NextResponse.json(
          { error: "You are not allowed to update this job" },
          { status: 403 },
        );
      }
    }

    // 5) Build update payload
    const dataToUpdate: {
      title?: string;
      description?: string;
      minExperience?: number;
    } = {};

    if (trimmedTitle !== undefined) {
      dataToUpdate.title = trimmedTitle;
    }

    if (trimmedDescription !== undefined) {
      dataToUpdate.description = trimmedDescription;
    }

    const descriptionChanged =
      trimmedDescription !== undefined && trimmedDescription !== existingJob.description;

    let uniqueSkills: { id: string; name: string }[] = [];
    let requiredSet = new Set<string>();

    // If description changed, re-run extraction and replace old skills.
    if (descriptionChanged && trimmedDescription) {
      const extracted: ExtractedSkills = await extractJobSkills(trimmedDescription);

      const requiredSkillNames = [
        ...new Set(safeStringArray(extracted.required_skills)),
      ];

      const preferredSkillNames = [
        ...new Set(safeStringArray(extracted.preferred_skills)),
      ];

      const storedSkills = await ensureSkillsWithEmbeddings([
        ...requiredSkillNames,
        ...preferredSkillNames,
      ]);

      requiredSet = new Set(requiredSkillNames.map((name) => normalizeSkill(name)));

      uniqueSkills = Array.from(
        new Map(
          storedSkills.map((skill) => [normalizeSkill(skill.name), skill]),
        ).values(),
      );

      dataToUpdate.minExperience = extracted.minExperience ?? 0;
    }

    // 6) Update job (and replace skills when description changed)
    const updatedJob = await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: jobId },
        data: dataToUpdate,
      });

      if (descriptionChanged) {
        await tx.jobSkill.deleteMany({ where: { jobId } });

        if (uniqueSkills.length > 0) {
          await tx.jobSkill.createMany({
            data: uniqueSkills.map((skill) => ({
              jobId,
              skillId: skill.id,
              required: requiredSet.has(normalizeSkill(skill.name)),
              weight: requiredSet.has(normalizeSkill(skill.name)) ? 2 : 1,
            })),
          });
        }
      }

      return tx.job.findUnique({
        where: { id: jobId },
        include: {
          hr: {
            include: {
              user: {
                select: {
                  id: true,
                  fullname: true,
                },
              },
            },
          },
          jobSkills: {
            include: {
              skill: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          _count: {
            select: {
              applications: true,
              matches: true,
            },
          },
        },
      });
    });

    if (!updatedJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const requiredSkills = updatedJob.jobSkills
      .filter((jobSkill) => jobSkill.required)
      .map((jobSkill) => ({
        id: jobSkill.skill.id,
        name: jobSkill.skill.name,
        weight: jobSkill.weight,
      }));

    const preferredSkills = updatedJob.jobSkills
      .filter((jobSkill) => !jobSkill.required)
      .map((jobSkill) => ({
        id: jobSkill.skill.id,
        name: jobSkill.skill.name,
        weight: jobSkill.weight,
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
  } catch (error) {
    console.error("Update Job Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  void req;
  const { jobId } = await params;

  try {
    // 1) Auth check
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;

    if (role !== "HR" && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2) Ensure job exists
    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        hrId: true,
        title: true,
      },
    });

    if (!existingJob) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // 3) HR can only delete own jobs
    if (role === "HR") {
      const hrProfile = await prisma.hRProfile.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });

      if (!hrProfile) {
        return NextResponse.json(
          { error: "HR profile not found" },
          { status: 404 },
        );
      }

      if (existingJob.hrId !== hrProfile.id) {
        return NextResponse.json(
          { error: "You are not allowed to delete this job" },
          { status: 403 },
        );
      }
    }

    // 4) Delete dependent records first, then delete the job
    const deleted = await prisma.$transaction(async (tx) => {
      const deletedApplications = await tx.jobApplication.deleteMany({
        where: { jobId },
      });

      const deletedJobSkills = await tx.jobSkill.deleteMany({
        where: { jobId },
      });

      const deletedMatches = await tx.matchResult.deleteMany({
        where: { jobId },
      });

      const deletedJob = await tx.job.delete({
        where: { id: jobId },
        select: { id: true, title: true },
      });

      return {
        deletedApplications: deletedApplications.count,
        deletedJobSkills: deletedJobSkills.count,
        deletedMatches: deletedMatches.count,
        deletedJob,
      };
    });

    return NextResponse.json({
      message: "Job deleted successfully",
      job: deleted.deletedJob,
      deletedCounts: {
        applications: deleted.deletedApplications,
        jobSkills: deleted.deletedJobSkills,
        matches: deleted.deletedMatches,
      },
    });
  } catch (error) {
    console.error("Delete Job Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
