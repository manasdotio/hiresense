"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import AppShell from "@/components/layout/AppShell";

const navItems = [
  { name: "Dashboard", href: "/admin" },
  { name: "Skills", href: "/admin/skills" },
  { name: "Users", href: "/admin/users" },
];

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/admin/skills")) {
    return "Skills";
  }

  if (pathname.startsWith("/admin/users")) {
    return "Users";
  }

  return "Dashboard";
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <AppShell
      brand="Admin Control"
      subtitle="System governance, skill curation, and user oversight"
      pageTitle={`Admin ${getPageTitle(pathname)}`}
      navItems={navItems}
      signOutCallbackUrl="/"
    >
      {children}
    </AppShell>
  );
}
