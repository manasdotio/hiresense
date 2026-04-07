"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { getCandidateResumes } from "@/lib/candidateApi";
import {
  UploadCloud,
  CheckCircle2,
  Clock,
  FileText,
  Settings,
  AreaChart,
  TrendingUp,
} from "lucide-react";

export default function CandidateDashboardPage() {
  const resumesQuery = useQuery({
    queryKey: ["candidate", "resumes"],
    queryFn: getCandidateResumes,
  });

  const summary = resumesQuery.data?.summary;
  const resumes = resumesQuery.data?.resumes ?? [];
  const processedResumes = resumes.filter((r) => r.isProcessed);
  const pendingCount = Math.max(
    (summary?.totalResumes ?? 0) - (summary?.processedResumes ?? 0),
    0,
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Your AI Resume Analyzer at a glance.
        </p>
      </div>

      {/* ── Loading / Error states ────────────────────────────────── */}
      {resumesQuery.isPending && (
        <Card>
          <CardContent className="py-6 text-sm text-muted-foreground">
            Loading your data…
          </CardContent>
        </Card>
      )}

      {resumesQuery.isError && (
        <div className="rounded-[10px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {resumesQuery.error instanceof Error
            ? resumesQuery.error.message
            : "Failed to load resumes"}
        </div>
      )}

      {!resumesQuery.isPending && !resumesQuery.isError && (
        <div className="space-y-6">

          {/* ── Stat cards ──────────────────────────────────────────── */}
          <div className="grid gap-4 sm:grid-cols-3">

            {/* Total Resumes */}
            <Card>
              <CardContent className="flex items-center justify-between py-5">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Total Resumes
                  </p>
                  <p className="font-mono text-3xl font-bold text-foreground">
                    {summary?.totalResumes ?? 0}
                  </p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-[10px] bg-muted text-muted-foreground">
                  <FileText className="size-5" />
                </div>
              </CardContent>
            </Card>

            {/* Processed */}
            <Card>
              <CardContent className="flex items-center justify-between py-5">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Processed
                  </p>
                  <p className="font-mono text-3xl font-bold text-emerald-600">
                    {summary?.processedResumes ?? 0}
                  </p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-[10px] bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="size-5" />
                </div>
              </CardContent>
            </Card>

            {/* Pending Sync */}
            <Card>
              <CardContent className="flex items-center justify-between py-5">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Pending Sync
                  </p>
                  <p className="font-mono text-3xl font-bold text-amber-600">
                    {pendingCount}
                  </p>
                </div>
                <div className="flex size-11 items-center justify-center rounded-[10px] bg-amber-50 text-amber-600 border border-amber-100">
                  <Clock className="size-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── CTA + Quick Links row ────────────────────────────────── */}
          <div className="grid gap-4 md:grid-cols-3">

            {/* Left: CTA card — 2/3 width */}
            <div className="md:col-span-2">
              {processedResumes.length === 0 ? (
                /* Empty state — amber tint */
                <Card className="border-amber-200 bg-amber-50 h-full">
                  <CardContent className="flex h-full flex-col justify-between gap-5 py-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <UploadCloud className="size-5 text-amber-600" />
                        <CardTitle className="text-amber-900">Get Started</CardTitle>
                      </div>
                      <CardDescription className="text-amber-700 leading-relaxed">
                        Upload your first resume to extract skills and measure it against
                        real-world job requirements automatically.
                      </CardDescription>
                    </div>
                    <Link
                      href="/candidate/resume"
                      className="inline-flex max-w-max items-center justify-center gap-2 rounded-[10px] bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
                    >
                      <UploadCloud className="size-4" />
                      Upload Resume
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                /* Ready state — intentional dark card */
                <Card className="relative h-full overflow-hidden border-0 bg-[#0F172A]">
                  {/* Subtle background icon */}
                  <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-[0.07] text-white">
                    <AreaChart className="size-32" />
                  </div>
                  <CardContent className="relative z-10 flex h-full flex-col justify-between gap-5 py-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="size-5 text-emerald-400" />
                        <CardTitle className="text-white">System Ready to Analyze</CardTitle>
                      </div>
                      <CardDescription className="text-slate-300 leading-relaxed max-w-sm">
                        You have{" "}
                        <span className="font-semibold text-white">
                          {processedResumes.length} processed resume
                          {processedResumes.length > 1 ? "s" : ""}
                        </span>{" "}
                        on file. Paste any job description to generate a precise ATS
                        match breakdown instantly.
                      </CardDescription>
                    </div>
                    <Link
                      href="/candidate/resume"
                      className="inline-flex max-w-max items-center justify-center gap-2 rounded-[10px] bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
                    >
                      Run Analysis
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Quick Links — 1/3 width */}
            <div className="md:col-span-1">
              <Card className="h-full">
                <CardContent className="py-5 space-y-1">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Quick Links
                  </p>
                  <Link
                    href="/candidate/resume"
                    className="flex items-center gap-3 rounded-[10px] border border-transparent bg-muted px-3 py-2.5 text-sm font-medium text-foreground transition-all hover:border-black/10 hover:bg-secondary"
                  >
                    <AreaChart className="size-4 text-primary shrink-0" />
                    Run a New Match
                  </Link>
                  <Link
                    href="/candidate/profile"
                    className="flex items-center gap-3 rounded-[10px] border border-transparent bg-muted px-3 py-2.5 text-sm font-medium text-foreground transition-all hover:border-black/10 hover:bg-secondary"
                  >
                    <Settings className="size-4 text-muted-foreground shrink-0" />
                    Account Settings
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* ── Recent History ──────────────────────────────────────── */}
          {resumes.length > 0 && (
            <Card className="overflow-hidden">
              {/* Card header strip */}
              <div className="border-b border-black/8 bg-muted/40 px-5 py-4">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Recent History
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Your 3 most recently uploaded files.
                </CardDescription>
              </div>

              <div className="divide-y divide-black/6">
                {resumes.slice(0, 3).map((resume) => (
                  <div
                    key={resume.resumeId}
                    className="flex flex-col gap-2 px-5 py-3.5 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                  >
                    {/* File info */}
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-muted text-muted-foreground border border-black/6">
                        <FileText className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Uploaded {new Date(resume.uploadedAt).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </p>
                        <div className="mt-0.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>
                            {resume.isProcessed
                              ? `${resume.skillsCount} skills detected`
                              : "Processing pending"}
                          </span>
                          {typeof resume.atsScore === "number" && (
                            <span className="font-medium text-emerald-600">
                              ATS: {resume.atsScore}/100
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status pill */}
                    <span
                      className={`status-pill shrink-0 ${
                        resume.isProcessed ? "status-success" : "status-warning"
                      }`}
                    >
                      {resume.isProcessed ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <Clock className="size-3" />
                      )}
                      {resume.isProcessed ? "Ready" : "Pending"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      )}
    </div>
  );
}