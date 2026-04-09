"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  name: string;
  href: string;
  icon?: React.ElementType;
};

type AppShellProps = {
  brand: string;
  subtitle: string;
  pageTitle: string;
  navItems: NavItem[];
  children: ReactNode;
  signOutCallbackUrl?: string;
};

export default function AppShell({
  brand,
  subtitle,
  pageTitle,
  navItems,
  children,
  signOutCallbackUrl,
}: AppShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActiveRoute(href: string): boolean {
    if (href === pathname) return true;
    return pathname.startsWith(`${href}/`);
  }

  function handleSignOut() {
    if (signOutCallbackUrl) {
      void signOut({ callbackUrl: signOutCallbackUrl });
      return;
    }
    void signOut();
  }

  return (
    <div className="relative min-h-screen bg-background">
      {/* Mobile overlay */}
      {menuOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[200px] flex-col border-r border-black/8 bg-card shadow-[1px_0_0_rgba(0,0,0,0.04)] transition-transform duration-300 lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between gap-2 border-b border-black/8 px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5 min-w-0">
            <Image
              src="/hiresense-logo.svg"
              alt="HireSense logo"
              width={28}
              height={28}
              className="size-7 shrink-0"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-foreground">
                HireSense
              </p>
              <p className="truncate text-[10px] text-muted-foreground leading-tight">
                {subtitle}
              </p>
            </div>
          </Link>
          <Button
            aria-label="Close menu"
            className="lg:hidden shrink-0"
            onClick={() => setMenuOpen(false)}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <X className="size-3.5" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            {brand}
          </p>
          {navItems.map((item) => {
            const active = isActiveRoute(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between rounded-[10px] border px-3 py-2 text-sm font-medium transition-all",
                  active
                    ? "border-blue-100 bg-blue-50 text-blue-700"
                    : "border-transparent text-foreground/75 hover:border-black/8 hover:bg-muted hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-2.5">
                  {Icon && <Icon className="size-3.5 shrink-0" />}
                  {item.name}
                </span>
                {active && (
                  <span className="size-1.5 shrink-0 rounded-full bg-blue-600" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout pinned to bottom */}
        <div className="border-t border-black/8 px-3 py-4">
          <Button
            className="w-full justify-start gap-2.5 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
            type="button"
            variant="ghost"
          >
            <LogOut className="size-4" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────── */}
      <div className="flex min-h-screen flex-col lg:pl-[200px]">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-black/8 bg-card shadow-[0_1px_0_rgba(0,0,0,0.04)]">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Workspace
              </p>
              <h1 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {pageTitle}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/candidate/settings" passHref>
                <Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-foreground">
                  <Settings className="size-4" />
                </Button>
              </Link>
              {/* User avatar placeholder */}
              <div className="size-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">U</span>
              </div>

              <Button
                aria-label="Open navigation"
                className="lg:hidden"
                onClick={() => setMenuOpen(true)}
                size="icon-sm"
                type="button"
                variant="outline"
              >
                <Menu className="size-4" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-background">
          <div className="page-frame">{children}</div>
        </main>
      </div>
    </div>
  );
}
