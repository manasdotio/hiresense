import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";

type AuthShellProps = {
  title: string;
  subtitle: string;
  switchText: string;
  switchHref: string;
  switchLabel: string;
  children: ReactNode;
};

export default function AuthShell({
  title,
  subtitle,
  switchText,
  switchHref,
  switchLabel,
  children,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.13),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.12),transparent_35%)]" />

      <div className="relative z-10 w-full max-w-md space-y-4">
        <div className="space-y-2 text-center">
          <Image
            src="/hiresense-logo.svg"
            alt="HireSense logo"
            width={56}
            height={56}
            className="mx-auto size-14"
            priority
          />
          <p className="text-xs uppercase tracking-[0.2em] text-primary">HireSense</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">{subtitle}</p>
        </div>

        <div className="surface-card p-6 sm:p-7">{children}</div>

        <p className="text-center text-sm text-muted-foreground">
          {switchText}{" "}
          <Link href={switchHref} className="text-link font-medium">
            {switchLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
