import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function CandidateRouteGroup({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login?callbackUrl=/candidate/dashboard");
  }

  // Ensure only candidates can access this
  if (session.user?.role !== "CANDIDATE") {
    // If we had different roles, we would redirect them to their respective dashboards.
    // For now, if they somehow get here without being a candidate, we redirect to login or home.
    redirect("/");
  }

  return <>{children}</>;
}
