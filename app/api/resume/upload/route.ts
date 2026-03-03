import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "CANDIDATE") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData(); // Parse the multipart form data
  const file = formData.get("file") as File; // Get the file from the form data

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large (max 5MB)" },
      { status: 400 },
    );
  }

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "Invalid file type. Only PDF files are allowed." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer()); // Convert the file to a buffer(binary data) to be used by pdf-parse and Buffer.from is used to create a new buffer from the array buffer of the file. This is necessary because pdf-parse expects a buffer as input. The array buffer is a low-level representation of the file's data, and Buffer.from allows us to convert it into a format that pdf-parse can work with.

  const parser = new PDFParse({ data: buffer }); // Parse the PDF to extract text and metadata. A new instance of PDFParse is created, and the buffer containing the PDF data is passed to it. This initializes the parser with the PDF file, allowing us to extract the text content and any relevant metadata from the PDF document.

  const parsed = await parser.getText(); // Get the text content from the parsed PDF. The getText() method is called on the parser instance to extract the text content from the PDF file.

  await parser.destroy(); // Clean up resources used by the parser.

  const text = parsed.text;

  // validation to check reasonable length text
  if (!text || text.trim().length < 50) {
  return NextResponse.json(
    { error: "Could not extract valid resume text" },
    { status: 400 }
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
