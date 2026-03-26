import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export type UserRole = "CANDIDATE" | "ADMIN";

type RegisterRequestBody = {
  username: string;
  fullname: string;
  email: string;
  password: string;
};

type SafeUserResponse = {
  id: string;
  username: string;
  fullname: string;
  email: string;
  role: UserRole;
  createdAt: Date;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RegisterRequestBody>;
    const { email, password, username, fullname } = body;

    if (!email || !password || !username || !fullname) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 },
      );
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingByEmail) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    const existingByUsername = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    });
    if (existingByUsername) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          role: "CANDIDATE",
          username: normalizedUsername,
          fullname,
        },
      });

      await tx.candidateProfile.create({
        data: { userId: user.id },
      });

      return user;
    });

    const response: SafeUserResponse = {
      id: newUser.id,
      username: newUser.username,
      fullname: newUser.fullname,
      email: newUser.email,
      role: newUser.role as UserRole,
      createdAt: newUser.createdAt,
    };

    return NextResponse.json(
      { message: "Registration successful", data: response },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
