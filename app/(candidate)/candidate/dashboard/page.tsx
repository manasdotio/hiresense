"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCandidateResumes } from "@/lib/candidateApi";
import { UploadCloud, CheckCircle2, Clock, FileText, Settings, AreaChart } from "lucide-react";

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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-2 text-slate-500">
          Your AI Resume Analyzer overview.
        </p>
      </div>

      {resumesQuery.isPending && (
        <Card className="bg-white shadow-sm border border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Loading your data...</CardTitle>
          </CardHeader>
        </Card>
      )}

      {resumesQuery.isError && (
        <Card className="bg-rose-50 shadow-sm border border-rose-200">
          <CardHeader>
            <CardTitle className="text-rose-900">Could not load data</CardTitle>
            <CardDescription className="text-rose-600">
              {resumesQuery.error instanceof Error
                ? resumesQuery.error.message
                : "Failed to load resumes"}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!resumesQuery.isPending && !resumesQuery.isError && (
        <div className="space-y-8">
          
          {/* Main Top Stat Row */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-white shadow-sm border-slate-200 p-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Total Resumes</p>
                <p className="text-3xl font-bold font-mono text-slate-900">{summary?.totalResumes ?? 0}</p>
              </div>
              <div className="p-3 bg-slate-50 text-slate-400 rounded-full">
                <FileText className="size-6" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm border-slate-200 p-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Processed</p>
                <p className="text-3xl font-bold font-mono text-emerald-600">{summary?.processedResumes ?? 0}</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-500 rounded-full">
                <CheckCircle2 className="size-6" />
              </div>
            </Card>

            <Card className="bg-white shadow-sm border-slate-200 p-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">Pending Sync</p>
                <p className="text-3xl font-bold font-mono text-amber-500">{pendingCount}</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-500 rounded-full">
                <Clock className="size-6" />
              </div>
            </Card>
          </div>

          {/* Call-to-action */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {processedResumes.length === 0 ? (
                <Card className="bg-amber-50 shadow-none border border-amber-200 p-6">
                  <div className="flex flex-col h-full justify-between gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-amber-900 flex items-center gap-2">
                        <UploadCloud className="size-5" /> Let's Get Started
                      </h3>
                      <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                        Upload your very first resume to automatically extract your skills
                        and measure it against thousands of real-world jobs.
                      </p>
                    </div>
                    <Link
                      href="/candidate/resume"
                      className="inline-flex max-w-max items-center justify-center rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition"
                    >
                      Upload Resume
                    </Link>
                  </div>
                </Card>
              ) : (
                <Card className="bg-slate-900 text-white shadow-xl shadow-slate-900/10 border-0 p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <AreaChart className="size-32" />
                  </div>
                  <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white">System Ready to Analyze</h3>
                      <p className="text-sm text-slate-300 mt-2 max-w-sm leading-relaxed">
                        You have {processedResumes.length} processed resume{processedResumes.length > 1 ? "s" : ""} on file. 
                        Paste any Job Description to generate a precise ATS match breakdown instantly.
                      </p>
                    </div>
                    <Link
                      href="/candidate/resume"
                      className="inline-flex max-w-max items-center justify-center rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition"
                    >
                      Run Analysis 
                    </Link>
                  </div>
                </Card>
              )}
            </div>
            
            <div className="md:col-span-1">
               {/* Quick links */}
                <Card className="bg-white shadow-sm border-slate-200 h-full p-6">
                  <h3 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-4 border-b border-slate-100 pb-2">Quick Links</h3>
                  <div className="space-y-3">
                    <Link href="/candidate/resume" className="flex items-center gap-3 text-sm font-medium text-slate-700 hover:text-emerald-600 transition-colors bg-slate-50 hover:bg-emerald-50 p-3 rounded-lg border border-transparent hover:border-emerald-100">
                      <AreaChart className="size-4" /> Run a new Match
                    </Link>
                    <Link href="/candidate/profile" className="flex items-center gap-3 text-sm font-medium text-slate-700 hover:text-emerald-600 transition-colors bg-slate-50 hover:bg-emerald-50 p-3 rounded-lg border border-transparent hover:border-emerald-100">
                      <Settings className="size-4" /> Account Settings
                    </Link>
                  </div>
                </Card>
            </div>
          </div>

          {/* Recent resumes */}
          {resumes.length > 0 && (
            <Card className="bg-white shadow-sm border-slate-200 overflow-hidden">
              <div className="bg-slate-50 p-6 border-b border-slate-200">
                <CardTitle className="text-lg font-semibold text-slate-900">Recent History</CardTitle>
                <CardDescription className="text-slate-500 mt-1">Your 3 most recently uploaded files.</CardDescription>
              </div>
              <div className="divide-y divide-slate-100 p-2">
                {resumes.slice(0, 3).map((resume) => (
                  <div
                    key={resume.resumeId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <FileText className="size-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Uploaded {new Date(resume.uploadedAt).toLocaleDateString()}
                        </p>
                        <div className="flex gap-4 mt-1 text-xs text-slate-500 font-medium tracking-wide">
                          <span>
                            {resume.isProcessed
                              ? `${resume.skillsCount} skills detected`
                              : "Processing pending"}
                          </span>
                          {typeof resume.atsScore === "number" && (
                            <span className="text-emerald-600 flex items-center gap-1">
                              • ATS: {resume.atsScore}/100
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        resume.isProcessed
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
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