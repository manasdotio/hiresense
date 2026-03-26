"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, FileText, User, LogOut, Files } from "lucide-react";

const navItems = [
  { name: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
  { name: "Match Engine", href: "/candidate/resume", icon: FileText },
  { name: "My Resumes", href: "/candidate/resumes", icon: Files },
  { name: "Profile", href: "/candidate/profile", icon: User },
];

export default function CandidateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-slate-200 text-slate-900">

      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white p-6 flex flex-col justify-between shadow-sm z-10">
        <div>
          <h2 className="text-xl font-bold mb-8 text-slate-900 tracking-tight flex items-center gap-2">
            Match Engine
          </h2>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className={`size-4 ${active ? "text-slate-900" : "text-slate-400"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors w-full text-left"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="border-b border-slate-200 bg-white px-8 py-5 flex items-center shadow-sm z-0">
          <h1 className="text-sm font-semibold text-slate-900 tracking-widest uppercase">
            Candidate Network
          </h1>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}