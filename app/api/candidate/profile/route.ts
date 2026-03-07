import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type UpdateCandidateProfileBody = {
  fullname?: string;
  username?: string;
  email?: string;
  experienceYears?: number | null;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            id: true,
            fullname: true,
            username: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      profile: {
        candidateId: candidate.id,
        userId: candidate.user.id,
        fullname: candidate.user.fullname,
        username: candidate.user.username,
        email: candidate.user.email,
        role: candidate.user.role,
        experienceYears: candidate.experienceYears,
        joinedAt: candidate.user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get Candidate Profile Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "CANDIDATE") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as UpdateCandidateProfileBody;

    const userDataToUpdate: {
      fullname?: string;
      username?: string;
      email?: string;
    } = {};

    const candidateDataToUpdate: {
      experienceYears?: number | null;
    } = {};

    if (typeof body.fullname === "string") {
      const fullname = body.fullname.trim();

      if (!fullname) {
        return NextResponse.json(
          { error: "fullname cannot be empty" },
          { status: 400 },
        );
      }

      userDataToUpdate.fullname = fullname;
    }

    if (typeof body.username === "string") {
      const username = normalizeUsername(body.username);

      if (!username) {
        return NextResponse.json(
          { error: "username cannot be empty" },
          { status: 400 },
        );
      }

      const usernameTakenBy = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });

      if (usernameTakenBy && usernameTakenBy.id !== session.user.id) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 409 },
        );
      }

      userDataToUpdate.username = username;
    }

    if (typeof body.email === "string") {
      const email = normalizeEmail(body.email);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 },
        );
      }

      const emailTakenBy = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (emailTakenBy && emailTakenBy.id !== session.user.id) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 409 },
        );
      }

      userDataToUpdate.email = email;
    }

    if (body.experienceYears !== undefined) {
      if (body.experienceYears !== null) {
        if (
          typeof body.experienceYears !== "number" ||
          Number.isNaN(body.experienceYears)
        ) {
          return NextResponse.json(
            { error: "experienceYears must be a number or null" },
            { status: 400 },
          );
        }

        if (body.experienceYears < 0) {
          return NextResponse.json(
            { error: "experienceYears cannot be negative" },
            { status: 400 },
          );
        }
      }

      candidateDataToUpdate.experienceYears = body.experienceYears;
    }

    const hasUserUpdates = Object.keys(userDataToUpdate).length > 0;
    const hasCandidateUpdates = Object.keys(candidateDataToUpdate).length > 0;

    if (!hasUserUpdates && !hasCandidateUpdates) {
      return NextResponse.json(
        {
          error:
            "Nothing to update. Provide at least one of: fullname, username, email, experienceYears",
        },
        { status: 400 },
      );
    }

    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        userId: true,
      },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Candidate profile not found" },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      if (hasUserUpdates) {
        await tx.user.update({
          where: { id: candidate.userId },
          data: userDataToUpdate,
        });
      }

      if (hasCandidateUpdates) {
        await tx.candidateProfile.update({
          where: { id: candidate.id },
          data: candidateDataToUpdate,
        });
      }
    });

    const updatedCandidate = await prisma.candidateProfile.findUnique({
      where: { id: candidate.id },
      include: {
        user: {
          select: {
            id: true,
            fullname: true,
            username: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!updatedCandidate) {
      return NextResponse.json(
        { error: "Candidate profile not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Profile updated successfully",
      profile: {
        candidateId: updatedCandidate.id,
        userId: updatedCandidate.user.id,
        fullname: updatedCandidate.user.fullname,
        username: updatedCandidate.user.username,
        email: updatedCandidate.user.email,
        role: updatedCandidate.user.role,
        experienceYears: updatedCandidate.experienceYears,
        joinedAt: updatedCandidate.user.createdAt,
      },
    });
  } catch (error) {
    console.error("Update Candidate Profile Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
