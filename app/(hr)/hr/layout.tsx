"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

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
    <div className="flex min-h-screen bg-zinc-950 text-white">
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900 p-6">
        <h2 className="mb-1 text-xl font-bold">HireSense HR</h2>
        <p className="mb-8 text-sm text-zinc-400">Recruitment control panel</p>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const isJobDetail =
              item.href === "/hr/jobs" && pathname.startsWith("/hr/job/");
            const active = pathname.startsWith(item.href) || isJobDetail;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-200 hover:bg-zinc-800"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-10 text-sm text-red-400"
        >
          Logout
        </button>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-b border-zinc-800 bg-zinc-900 px-6 py-4">
          <h1 className="text-lg font-semibold text-white">HR {pageTitle}</h1>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
