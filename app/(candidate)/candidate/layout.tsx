"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, User, FileText, Search } from "lucide-react";
import AppShell from "@/components/layout/AppShell";

const navItems = [
  { name: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { name: "Profile", href: "/candidate/profile", icon: User },
  { name: "Resumes", href: "/candidate/resumes", icon: FileText },
  { name: "Job Analyzer", href: "/candidate/analyzer", icon: Search },
];

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/candidate/settings")) return "AI Settings";
  if (pathname.startsWith("/candidate/analyzer")) return "Job Analyzer";
  if (pathname.startsWith("/candidate/resumes")) return "My Resumes";
  if (pathname.startsWith("/candidate/profile")) return "Profile";
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