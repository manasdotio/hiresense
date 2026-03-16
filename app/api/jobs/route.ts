import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { extractJobSkills } from "@/lib/jobExtractor";
import { ensureSkillsWithEmbeddings } from "@/lib/skillStore";

/* ---------- Types ---------- */

type CreateJobBody = {
  title: string;
  description: string;
  minExperience?: number;
};

type ExtractedSkills = {
  required_skills?: unknown;
  preferred_skills?: unknown;
  minExperience?: number;
};

/* ---------- Helpers ---------- */

function normalizeSkill(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase(); // Normalize by trimming, collapsing spaces, and lowercasing
}

// This function ensures we only work with string arrays and filters out any invalid entries
function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

/* ---------- Route ---------- */

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    const whereClause: { hrId?: string } = {};
    let appliedJobIds = new Set<string>();
    let candidateResumeSkillIds = new Set<string>();

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

      whereClause.hrId = hrProfile.id;
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

      const latestProcessedResume = await prisma.resume.findFirst({
        where: {
          candidateId: candidateProfile.id,
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

      const applications = await prisma.jobApplication.findMany({
        where: { candidateId: candidateProfile.id },
        select: { jobId: true },
      });

      appliedJobIds = new Set(applications.map((application) => application.jobId));
    } else if (role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const jobs = await prisma.job.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
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

    const formattedJobs = jobs.map((job) => {
      const requiredSkills = job.jobSkills
        .filter((jobSkill) => jobSkill.required)
        .map((jobSkill) => jobSkill.skill.name);

      const preferredSkills = job.jobSkills
        .filter((jobSkill) => !jobSkill.required)
        .map((jobSkill) => jobSkill.skill.name);

      let matchPercentage: number | null = null;

      if (role === "CANDIDATE") {
        const totalWeight = job.jobSkills.reduce(
          (sum, jobSkill) => sum + jobSkill.weight,
          0,
        );

        const matchedWeight = job.jobSkills.reduce((sum, jobSkill) => {
          if (candidateResumeSkillIds.has(jobSkill.skillId)) {
            return sum + jobSkill.weight;
          }

          return sum;
        }, 0);

        const score = totalWeight === 0 ? 0 : matchedWeight / totalWeight;
        matchPercentage = Number((score * 100).toFixed(2));
      }

      return {
        id: job.id,
        title: job.title,
        description: job.description,
        minExperience: job.minExperience,
        createdAt: job.createdAt,
        postedBy: job.hr.user.fullname,
        requiredSkills,
        preferredSkills,
        applicationsCount: job._count.applications,
        matchesCount: job._count.matches,
        hasApplied: appliedJobIds.has(job.id),
        matchPercentage,
      };
    });

    if (role === "CANDIDATE") {
      const matchedJobs = formattedJobs
        .filter((job) => (job.matchPercentage ?? 0) > 0)
        .sort(
          (first, second) =>
            (second.matchPercentage ?? 0) - (first.matchPercentage ?? 0),
        );

      return NextResponse.json({ jobs: matchedJobs });
    }

    return NextResponse.json({ jobs: formattedJobs });
  } catch (error) {
    console.error("Get Jobs Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    /* 1️⃣ Auth */
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "HR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* 2️⃣ Parse body */
    const body: CreateJobBody = await request.json();
    const { title, description, minExperience } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: "Title and description are required" },
        { status: 400 },
      );
    }

    /* 3️⃣ Get HR profile */
    const hrProfile = await prisma.hRProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!hrProfile) {
      return NextResponse.json(
        { error: "HR profile not found" },
        { status: 404 },
      );
    }

    /* 4️⃣ Extract skills using LLM */
    const extracted: ExtractedSkills = await extractJobSkills(description);

    const requiredSkillNames = [
      ...new Set(safeStringArray(extracted.required_skills)),
    ];

    const preferredSkillNames = [
      ...new Set(safeStringArray(extracted.preferred_skills)),
    ];

    /* 5️⃣ Ensure skills exist in DB */
    const storedSkills = await ensureSkillsWithEmbeddings([
      ...requiredSkillNames,
      ...preferredSkillNames,
    ]);

    /* 6️⃣ Prepare required lookup set */
    const requiredSet = new Set(
      requiredSkillNames.map((name) => normalizeSkill(name)),
    );

    /* 7️⃣ Remove duplicates safely */
    const uniqueSkills = Array.from(
      new Map(
        storedSkills.map((skill) => [normalizeSkill(skill.name), skill]),
      ).values(),
    );

    /* 8️⃣ Create Job */
    const job = await prisma.job.create({
      data: {
        title,
        description,
        minExperience: minExperience ?? extracted.minExperience ?? 0,
        hrId: hrProfile.id,
        jobSkills: {
          create: uniqueSkills.map((skill) => ({
            skillId: skill.id,

            required: requiredSet.has(normalizeSkill(skill.name)),
            weight: requiredSet.has(normalizeSkill(skill.name)) ? 2 : 1,
          })),
        },
      },
      include: {
        jobSkills: {
          include: {
            skill: true,
          },
        },
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Create Job Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
