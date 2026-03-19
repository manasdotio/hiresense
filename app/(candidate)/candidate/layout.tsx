"use client";

import { usePathname } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

const navItems = [
  { name: "Dashboard", href: "/candidate/dashboard" },
  { name: "Profile", href: "/candidate/profile" },
  { name: "Resume", href: "/candidate/resume" },
  { name: "Matched Jobs", href: "/candidate/jobs" },
  { name: "Applications", href: "/candidate/applications" },
];

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/candidate/job/")) {
    return "Job Details";
  }

  if (pathname.startsWith("/candidate/jobs")) {
    return "Matched Jobs";
  }

  if (pathname.startsWith("/candidate/resume")) {
    return "Resume";
  }

  if (pathname.startsWith("/candidate/profile")) {
    return "Profile";
  }

  if (pathname.startsWith("/candidate/applications")) {
    return "Applications";
  }

  return "Dashboard";
}

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AppShell
      brand="Candidate Workspace"
      subtitle="Profile, resume intelligence, and application tracking"
      pageTitle={getPageTitle(pathname)}
      navItems={navItems}
      signOutCallbackUrl="/"
    >
      {children}
    </AppShell>
  );
}