import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { extractJobSkills } from "@/lib/jobExtractor";
import { ensureSkillsWithEmbeddings } from "@/lib/skillStore";

type CreateJobBody = {
  title: string;
  description: string;
  minExperience?: number;
};

function normalizedSkillKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "HR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as CreateJobBody;

  const { title, description, minExperience } = body;

  if (!title || !description) {
    return NextResponse.json(
      {
        error: "Missing required fields: title, description",
      },
      { status: 400 },
    );
  }

  // Get hr porfile
  const hrProfile = await prisma.hRProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!hrProfile) {
    return NextResponse.json(
      { error: "HR profile not found" },
      { status: 404 },
    );
  }

  const extracted = await extractJobSkills(description);

  const extractedRequired: string[] = Array.isArray(extracted?.required_skills)
    ? extracted.required_skills.filter((name: unknown): name is string => typeof name === "string")
    : [];

  const extractedPreferred: string[] = Array.isArray(extracted?.preferred_skills)
    ? extracted.preferred_skills.filter((name: unknown): name is string => typeof name === "string")
    : [];

  const requiredSkillNames = Array.from(new Set(extractedRequired));
  const preferredSkillNames = Array.from(new Set(extractedPreferred));

  const storedSkills = await ensureSkillsWithEmbeddings([
    ...requiredSkillNames,
    ...preferredSkillNames,
  ]);

  const requiredKeys = new Set(requiredSkillNames.map((name) => normalizedSkillKey(name)));
  const resolvedByKey = new Map(
    storedSkills.map((skill) => [normalizedSkillKey(skill.name), skill]),
  );

  const uniqueResolved = Array.from(resolvedByKey.values());

  const job = await prisma.job.create({
    data: {
      title,
      description,
      minExperience: minExperience ?? extracted?.minExperience ?? 0,
      hrId: hrProfile.id,
      jobSkills: {
        create: uniqueResolved.map((skill) => ({
          skillId: skill.id,
          weight: 1,
          required: requiredKeys.has(normalizedSkillKey(skill.name)),
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
}