import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export type RegisterRole = "HR" | "CANDIDATE"; // Define allowed roles for registration
export type UserRole = "HR" | "CANDIDATE" | "ADMIN"; // Define all possible user roles in the system (including ADMIN for future use)

type RegisterRequestBody = {
  username: string;
  fullname: string;
  email: string;
  password: string;
  role: RegisterRole;
};

type SafeUserResponse = {
  id: string;
  username: string;
  fullname: string;
  email: string;
  role: UserRole;
  createdAt: Date;
};

// Parse request body (email, password, role, and any role-specific fields)
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RegisterRequestBody> & {
      role?: string;
    };
    const { email, password, role, username, fullname } = body;

    // Validate input (required fields, email format, password strength, valid role)
    if (!email || !password || !role || !username || !fullname) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    // Normalize email (trim + lowercase) before DB checks
    const normalizedEmail = email.trim().toLowerCase();

    // Normalize username (trim whitespace)
    const normalizedUsername = username.trim().toLowerCase();

    const allowedRoles: RegisterRole[] = ["HR", "CANDIDATE"];
    if (!allowedRoles.includes(role as RegisterRole)) {
      console.warn("Invalid role registration attempt", {
        email: normalizedEmail,
        roleAttempted: role,
      });
      return NextResponse.json(
        { error: "Invalid role for registration" },
        { status: 403 },
      );
    }

    // Validate email format using regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    //  Validate password strength (minimum length requirement)
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    //  Check if a user already exists with the same email
    const existingByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingByEmail) {
      console.warn("Registration failed", {
        email: normalizedEmail,
        reason: "duplicate_email",
      });
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    //  Check if a user already exists with the same username
    const existingByUsername = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });

    if (existingByUsername) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 },
      );
    }

    // Hash password with bcryptjs before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    //Create user and role-specific profile inside a DB transaction to ensure data integrity
    const newUser = await prisma.$transaction(async (tx) => {
      // Create base User record
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          role: role as RegisterRole,
          username: normalizedUsername,
          fullname,
        },
      });

      // If role is HR, create  HRProfile
      if (role === "HR") {
        await tx.hRProfile.create({
          data: { userId: user.id },
        });
      }

      // If role is CANDIDATE, create  CandidateProfile
      if (role === "CANDIDATE") {
        await tx.candidateProfile.create({
          data: { userId: user.id },
        });
      }

      return user;
    });
    // Return safe response (never include password hash)

    const response: SafeUserResponse = {
      id: newUser.id,
      username: newUser.username,
      fullname: newUser.fullname,
      email: newUser.email,
      role: newUser.role,
      createdAt: newUser.createdAt,
    };

    return NextResponse.json(
      {
        message: "Registeration successfully",
        data: response,
      },
      { status: 201 },
    );

  } catch (error) {
    console.error("Registration server error:", error);

    // Return generic error message (avoid leaking internal details)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
