import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function proxy() {
    // This function runs for every request that matches the matcher below
    return NextResponse.next(); // Continue to the requested route if authorized
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Public routes
        if (
          pathname === "/" ||
          pathname.startsWith("/login") ||
          pathname.startsWith("/register") ||
          pathname.startsWith("/api/auth")
        ) {
          return true;
        }

        if (!token) return false;

        // HR routes
        if (pathname.startsWith("/hr")) {
          return token.role === "HR";
        }

        // Candidate routes
        if (pathname.startsWith("/candidate")) {
          return token.role === "CANDIDATE";
        }

        // Admin routes
        if (pathname.startsWith("/admin")) {
          return token.role === "ADMIN";
        }

        return true; // Default allow if no specific role-based route is matched
      },
    },
  },
);

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
