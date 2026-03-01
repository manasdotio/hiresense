import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { UserRole } from "@/app/api/auth/register/route";

type AuthorizedUser = {
  id: string;
  email: string;
  username: string;
  fullname: string;
  role: UserRole;
};

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",

      // Define the fields that will be submitted in the login form
      credentials: {
        identifier: { label: "Email/Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      // The authorize function is called when a user tries to log in with credentials
      async authorize(credentials): Promise<AuthorizedUser | null> {
        try {
          if (!credentials?.identifier || !credentials?.password) {
            return null;
          }

          const identifier = credentials.identifier.trim().toLowerCase();

          const user = await prisma.user.findFirst({
            where: {
              OR: [{ email: identifier }, { username: identifier }],
            },
            select: {
              id: true,
              email: true,
              username: true,
              fullname: true,
              role: true,
              password: true,
            },
          });
          if (!user) {
            throw new Error("User not found");
          }

          // Compare the provided password with the hashed password in the database
          const isPasswordCorrect = await bcrypt.compare(
            credentials.password,
            user.password,
          );
          if (isPasswordCorrect) {
            return {
              id: user.id,
              email: user.email,
              username: user.username,
              fullname: user.fullname,
              role: user.role,
            };
          } else {
            throw new Error("Incorrect password");
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : "Login failed";
          throw new Error(message);
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
        token.fullname = user.fullname;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      token.id = token.id;
      token.email = token.email;
      token.username = token.username;
      token.fullname = token.fullname;
      token.role = token.role;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
