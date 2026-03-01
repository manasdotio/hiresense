import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth";
import { authOptions } from "@/lib/auth";

type CreateJobBody = {
  title: string;
  description: string;
  minExperience?: number;
  skills: {
    name: string;
    required?: boolean;
    weight?: number;
  }[];
};

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "HR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as CreateJobBody;

  const { title, description, minExperience, skills } = body;

  if (!title || !description || minExperience === undefined || !skills) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: title, description, minExperience, skills",
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

  const job = await prisma.job.create({
    data: {
      title,
      description,
      minExperience,
      hrId: hrProfile.id,
      jobSkills: {
        create: skills.map((s: any) => ({
          skillId: s.skillId,
          weight: s.weight ?? 1,
          required: s.required ?? true,
        })),
      },
    },
    include: {
      jobSkills: true,
    },
  });
}
