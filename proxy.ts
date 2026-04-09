import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy() {
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        const role =
          typeof token?.role === "string" ? token.role.toUpperCase() : "";

        if (
          pathname === "/" ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/register") ||
          pathname.startsWith("/api/auth")
        ) {
          return true;
        }

        if (!token) {
          return false;
        }

        if (pathname.startsWith("/hr")) {
          return role === "HR";
        }

        if (pathname.startsWith("/candidate")) {
          return role === "CANDIDATE";
        }

        if (pathname.startsWith("/admin")) {
          return role === "ADMIN";
        }

        return true;
      },
    },
  },
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};