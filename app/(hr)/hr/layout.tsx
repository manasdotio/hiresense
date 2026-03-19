"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppShell from "@/components/layout/AppShell";

const navItems = [
  { name: "Dashboard", href: "/hr/dashboard" },
  { name: "Jobs", href: "/hr/jobs" },
];

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/hr/job/") && pathname.endsWith("/candidates")) {
    return "Candidates";
  }

  if (pathname.startsWith("/hr/job/")) {
    return "Job Details";
  }

  if (pathname.startsWith("/hr/jobs")) {
    return "Jobs";
  }

  return "Dashboard";
}

export default function HRLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <AppShell
      brand="HR Command Center"
      subtitle="Job orchestration, candidate ranking, and pipeline decisions"
      pageTitle={`HR ${pageTitle}`}
      navItems={navItems}
      signOutCallbackUrl="/"
    >
      {children}
    </AppShell>
  );
}
