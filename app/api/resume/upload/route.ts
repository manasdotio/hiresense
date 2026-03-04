import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "CANDIDATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData(); // Parse the multipart form data
  const file = formData.get("file") as File; // Get the file from the form data

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large (max 5MB)" },
      { status: 400 },
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Invalid file type. Only PDF files are allowed." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Create temporary file for pdf-text-extract
  const tempFilePath = join(tmpdir(), `resume-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pdf`);
  
  let text: string = '';
  
  try {
    // Write buffer to temporary file
    await writeFile(tempFilePath, buffer);
    
    // Extract text using pdf-text-extract with file path
    // @ts-expect-error - No types available for pdf-text-extract
    const pdfExtract = await import("pdf-text-extract");
    const textPages: string[] = await new Promise((resolve, reject) => {
      pdfExtract.default(tempFilePath, (err: Error | null, pages: string[]) => {
        if (err) reject(err);
        else resolve(pages);
      });
    });
    text = textPages.join('\n\n');
  } finally {
    // Clean up temporary file
    try {
      await unlink(tempFilePath);
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError);
    }
  }

  // validation to check reasonable length text
  if (!text || text.trim().length < 50) {
    return NextResponse.json(
      { error: "Could not extract valid resume text" },
      { status: 400 },
    );
  }

  //get candidate profile
  const candidateProfile = await prisma.candidateProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!candidateProfile) {
    return NextResponse.json(
      { error: "Candidate profile not found" },
      { status: 404 },
    );
  }

  // save the resume text to the database
  const resume = await prisma.resume.create({
    data: {
      candidateId: candidateProfile.id,
      rawText: text,
    },
  });

  return NextResponse.json(
    { message: "Resume uploaded successfully", resumeId: resume.id },
    { status: 200 },
  );
}
