"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { name: "Dashboard", href: "/candidate/dashboard" },
  { name: "Resume", href: "/candidate/resume" },
  { name: "Job Matches", href: "/candidate/jobs" },
  { name: "Applications", href: "/candidate/applications" },
];

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname(); // Get the current path to determine active nav item

  return (
    <div className="flex min-h-screen">

      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-700 bg-zinc-900 p-6 text-white">

        <h2 className="text-xl font-bold mb-8">
          AI Resume Analyzer
        </h2>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-zinc-700 text-white"
                    : "text-white hover:bg-zinc-800"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={() => signOut()}
          className="mt-10 text-sm text-red-400"
        >
          Logout
        </button>

      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">

        {/* Header */}
        <header className="border-b border-zinc-700 bg-zinc-900 px-6 py-4 text-white">
          <h1 className="text-lg font-semibold text-white">
            Candidate Dashboard
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 bg-zinc-900 text-white ">
          {children}
        </main>

      </div>
    </div>
  );
}