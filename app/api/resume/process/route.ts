import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractResumeData } from "@/lib/resumeExtractor";
import { ensureSkillsWithEmbeddings } from "@/lib/skillStore";
import { getUserAIConfig } from "@/lib/userAiConfig";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type ProcessResumeBody = {
  resumeId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ProcessResumeBody;
    const resumeId = typeof body.resumeId === "string" ? body.resumeId : "";

    if (!resumeId) {
      return NextResponse.json({ error: "resumeId is required" }, { status: 400 });
    }

    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate profile not found" },
        { status: 404 },
      );
    }

    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        candidateId: candidate.id,
      },
      select: {
        id: true,
        rawText: true,
      },
    });

    if (!resume) {
      return NextResponse.json(
        { error: "Resume not found for this candidate" },
        { status: 404 },
      );
    }

    const userAIConfig = await getUserAIConfig(session.user.id);
    const extracted = await extractResumeData(resume.rawText, userAIConfig);
    const extractedSkills = Array.isArray(extracted.skills) ? extracted.skills : [];
    const normalizedSkills = await ensureSkillsWithEmbeddings(extractedSkills, true);

    await prisma.$transaction(async (tx) => {
      // Save atsScore, atsFeedback, and sectionFeedback to Resume
      await tx.resume.update({
        where: { id: resume.id },
        data: {
          atsScore: typeof extracted.atsScore === "number" ? extracted.atsScore : null,
          atsFeedback: Array.isArray(extracted.atsFeedback) ? extracted.atsFeedback.join(" | ") : null,
          sectionFeedback: extracted.sectionFeedback ? JSON.stringify(extracted.sectionFeedback) : null,
        },
      });

      // Update candidate profile with experience years if available.
      if (extracted.experienceYears !== null) {
        await tx.candidateProfile.update({
          where: { id: candidate.id },
          data: {
            experienceYears: extracted.experienceYears,
          },
        });
      }

      // Clear old skills for this resume before inserting new ones.
      await tx.resumeSkill.deleteMany({
        where: { resumeId: resume.id },
      });

      // Insert normalized skills for this resume.
      await tx.resumeSkill.createMany({
        data: normalizedSkills.map((skill) => ({
          resumeId: resume.id,
          skillId: skill.id,
        })),
        skipDuplicates: true,
      });
    });

    return NextResponse.json({
      extractedSkills,
      experienceYears: extracted.experienceYears,
    });
  } catch (error) {
    console.error("Process Resume Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
