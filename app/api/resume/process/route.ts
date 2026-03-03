import { NextResponse,NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractResumeSkills } from "@/lib/resumeExtractor";

export async function POST(request: NextRequest) {
  const { resumeId } = await request.json();

  const resume = await prisma.resume.findUnique({
    where: { id: resumeId },
  });

  if (!resume) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const extracted = await extractResumeSkills(resume.rawText);

  return NextResponse.json({
    extractedSkills: extracted.skills,
  });
}