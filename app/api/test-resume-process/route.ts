import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractResumeData } from "@/lib/resumeExtractor";

export async function GET(request: NextRequest) {
  try {
    const resumeId = request.nextUrl.searchParams.get("resumeId");

    let source = "sample";
    let rawText = `
Experienced backend developer with 4 years of experience.
Built APIs with Node.js, Express, and TypeScript.
Worked with PostgreSQL, Docker, Redis, and AWS.
Used GitHub Actions for CI/CD and wrote unit tests with Jest.
`;

    if (resumeId) {
      const resume = await prisma.resume.findUnique({
        where: { id: resumeId },
        select: { id: true, rawText: true },
      });

      if (!resume) {
        return NextResponse.json({ error: "Resume not found" }, { status: 404 });
      }

      source = `resume:${resume.id}`;
      rawText = resume.rawText;
    }

    console.log("[test-resume-process] Source:", source);
    console.log("[test-resume-process] Input preview:", rawText.slice(0, 300));

    const extracted = await extractResumeData(rawText);

    console.log("[test-resume-process] AI output:", extracted);

    return NextResponse.json({
      source,
      extracted,
    });
  } catch (error) {
    console.error("[test-resume-process] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
