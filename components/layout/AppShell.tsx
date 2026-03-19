"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  name: string;
  href: string;
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
    if (href === pathname) {
      return true;
    }

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
    <div className="relative min-h-screen">
      {menuOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-950/65 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border/70 bg-sidebar/95 p-5 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Image
                src="/hiresense-logo.svg"
                alt="HireSense logo"
                width={32}
                height={32}
                className="size-8"
              />
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                HireSense
              </p>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-sidebar-foreground">
              {brand}
            </h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <Button
            aria-label="Close menu"
            className="lg:hidden"
            onClick={() => setMenuOpen(false)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>

        <nav className="mt-8 space-y-1.5">
          {navItems.map((item) => {
            const active = isActiveRoute(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "border-primary/45 bg-primary/15 text-primary"
                    : "border-transparent text-sidebar-foreground/85 hover:border-border/70 hover:bg-muted/45 hover:text-sidebar-foreground",
                )}
              >
                <span>{item.name}</span>
                <span
                  className={cn(
                    "size-1.5 rounded-full bg-transparent transition-colors",
                    active && "bg-primary",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6">
          <Button
            className="w-full justify-start"
            onClick={handleSignOut}
            type="button"
            variant="outline"
          >
            <LogOut className="size-4" />
            Logout
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Workspace
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                {pageTitle}
              </h1>
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
        </header>

        <main className="flex-1">
          <div className="page-frame">{children}</div>
        </main>
      </div>
    </div>
  );
}
