import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function buildTextPreview(rawText: string, maxLength = 180): string {
  const normalized = rawText.replace(/\s+/g, " ").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}...`;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    const resumes = await prisma.resume.findMany({
      where: { candidateId: candidate.id },
      orderBy: { extractedAt: "desc" },
      select: {
        id: true,
        extractedAt: true,
        rawText: true,
        atsScore: true,
        atsFeedback: true,
        resumeSkills: {
          include: {
            skill: true,
          },
        },
        _count: {
          select: {
            resumeSkills: true,
          },
        },
      },
    });

    const formattedResumes = resumes.map((resume) => ({
      resumeId: resume.id,
      uploadedAt: resume.extractedAt,
      skillsCount: resume._count.resumeSkills,
      skills: resume.resumeSkills.map(rs => rs.skill.name),
      isProcessed: resume._count.resumeSkills > 0,
      textPreview: buildTextPreview(resume.rawText),
      atsScore: resume.atsScore,
      atsFeedback: resume.atsFeedback,
    }));

    const processedResumes = formattedResumes.filter(
      (resume) => resume.isProcessed,
    ).length;

    return NextResponse.json({
      resumes: formattedResumes,
      summary: {
        totalResumes: formattedResumes.length,
        processedResumes,
        latestResumeId: formattedResumes[0]?.resumeId ?? null,
      },
    });
  } catch (error) {
    console.error("Get Candidate Resumes Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
