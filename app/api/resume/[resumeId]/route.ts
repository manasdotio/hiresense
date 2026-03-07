import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ resumeId: string }> },
) {
  void req;
  const { resumeId } = await params;

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

    const resume = await prisma.resume.findFirst({
      where: {
        id: resumeId,
        candidateId: candidate.id,
      },
      select: {
        id: true,
        extractedAt: true,
      },
    });

    if (!resume) {
      return NextResponse.json(
        { error: "Resume not found for this candidate" },
        { status: 404 },
      );
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const deletedSkills = await tx.resumeSkill.deleteMany({
        where: { resumeId },
      });

      const deletedResume = await tx.resume.delete({
        where: { id: resumeId },
        select: {
          id: true,
          extractedAt: true,
        },
      });

      const remainingResumes = await tx.resume.count({
        where: { candidateId: candidate.id },
      });

      let deletedMatchResults = 0;

      if (remainingResumes === 0) {
        const deletedMatches = await tx.matchResult.deleteMany({
          where: { candidateId: candidate.id },
        });

        deletedMatchResults = deletedMatches.count;
      }

      return {
        deletedSkills: deletedSkills.count,
        deletedResume,
        remainingResumes,
        deletedMatchResults,
      };
    });

    return NextResponse.json({
      message: "Resume deleted successfully",
      deletedResume: {
        resumeId: deleted.deletedResume.id,
        uploadedAt: deleted.deletedResume.extractedAt,
      },
      deletedCounts: {
        resumeSkills: deleted.deletedSkills,
        matchResults: deleted.deletedMatchResults,
      },
      remainingResumes: deleted.remainingResumes,
      clearedMatches: deleted.remainingResumes === 0,
    });
  } catch (error) {
    console.error("Delete Resume Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
