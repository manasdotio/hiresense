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
