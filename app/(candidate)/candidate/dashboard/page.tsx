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
import { getCandidateDashboardData } from "@/lib/candidateApi";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function statusClass(status: string): string {
  if (status === "SHORTLISTED") return "bg-blue-900 text-blue-200";
  if (status === "INTERVIEW") return "bg-purple-900 text-purple-200";
  if (status === "REJECTED") return "bg-red-900 text-red-200";
  return "bg-emerald-900 text-emerald-200";
}

export default function CandidateDashboardPage() {
  const dashboardQuery = useQuery({
    queryKey: ["candidate", "dashboard"],
    queryFn: getCandidateDashboardData,
  });

  const data = dashboardQuery.data;
  const errorMessage =
    dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : "Failed to load dashboard";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-zinc-300">
          A quick summary of your resumes, jobs, and applications.
        </p>
      </div>

      {dashboardQuery.isPending && (
        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardTitle>Loading dashboard...</CardTitle>
          </CardHeader>
        </Card>
      )}

      {dashboardQuery.isError && (
        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardTitle>Could not load dashboard</CardTitle>
            <CardDescription className="text-red-300">{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!dashboardQuery.isPending && !dashboardQuery.isError && data && (
        <>
          {!data.matchingReady && (
            <Card className="bg-zinc-800 text-white ring-zinc-700">
              <CardHeader>
                <CardTitle>Matching Locked</CardTitle>
                <CardDescription className="text-amber-300">
                  {data.matchingMessage ??
                    "Upload and process at least one resume to unlock matched jobs."}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="bg-zinc-800 text-white ring-zinc-700">
              <CardHeader>
                <CardDescription className="text-zinc-300">Usable Resumes</CardDescription>
                <CardTitle>{data.summary.totalResumes}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-zinc-800 text-white ring-zinc-700">
              <CardHeader>
                <CardDescription className="text-zinc-300">Pending Resumes</CardDescription>
                <CardTitle>{data.summary.pendingResumes}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-zinc-800 text-white ring-zinc-700">
              <CardHeader>
                <CardDescription className="text-zinc-300">Open Jobs</CardDescription>
                <CardTitle>{data.summary.openJobs}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-zinc-800 text-white ring-zinc-700">
              <CardHeader>
                <CardDescription className="text-zinc-300">Total Applications</CardDescription>
                <CardTitle>{data.summary.totalApplications}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="bg-zinc-800 text-white ring-zinc-700">
              <CardHeader>
                <CardDescription className="text-zinc-300">Applied</CardDescription>
                <CardTitle>{data.summary.applied}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-zinc-800 text-white ring-zinc-700">
              <CardHeader>
                <CardDescription className="text-zinc-300">Shortlisted</CardDescription>
                <CardTitle>{data.summary.shortlisted}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-zinc-800 text-white ring-zinc-700">
              <CardHeader>
                <CardDescription className="text-zinc-300">Interview</CardDescription>
                <CardTitle>{data.summary.interview}</CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-zinc-800 text-white ring-zinc-700">
              <CardHeader>
                <CardDescription className="text-zinc-300">Rejected</CardDescription>
                <CardTitle>{data.summary.rejected}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-zinc-800 text-white ring-zinc-700 lg:col-span-1">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Link href="/candidate/profile" className="block text-sky-300 hover:underline">
                  Edit profile details
                </Link>
                <Link href="/candidate/resume" className="block text-sky-300 hover:underline">
                  Upload or process resume
                </Link>
                <Link href="/candidate/jobs" className="block text-sky-300 hover:underline">
                  View matched jobs
                </Link>
                <Link
                  href="/candidate/applications"
                  className="block text-sky-300 hover:underline"
                >
                  Track my applications
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-zinc-800 text-white ring-zinc-700 lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentApplications.length === 0 ? (
                  <p className="text-sm text-zinc-300">You have not applied to any jobs yet.</p>
                ) : (
                  data.recentApplications.map((application) => (
                    <div
                      key={`${application.jobId}-${application.appliedAt}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-700 p-3"
                    >
                      <div>
                        <p className="font-medium">{application.jobTitle}</p>
                        <p className="text-xs text-zinc-300">
                          Applied on {formatDate(application.appliedAt)}
                        </p>
                      </div>

                      <span
                        className={`rounded px-2 py-1 text-xs ${statusClass(application.status)}`}
                      >
                        {application.status}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-zinc-800 text-white ring-zinc-700">
            <CardHeader>
              <CardTitle>Jobs You Can Apply Now</CardTitle>
              <CardDescription className="text-zinc-300">
                Showing up to 5 matched jobs you have not applied to yet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!data.matchingReady ? (
                <p className="text-sm text-zinc-300">
                  Upload and process at least one resume first.
                </p>
              ) : data.openJobsPreview.length === 0 ? (
                <p className="text-sm text-zinc-300">No open jobs available right now.</p>
              ) : (
                data.openJobsPreview.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-700 p-3"
                  >
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-xs text-zinc-300">Min experience: {job.minExperience ?? 0} years</p>
                    </div>

                    <Link
                      href={`/candidate/job/${job.id}`}
                      className="text-sm text-sky-300 hover:underline"
                    >
                      View Job
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="bg-zinc-800 text-white ring-zinc-700">
            <CardHeader>
              <CardTitle>Latest Processed Resumes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.latestResumes.length === 0 ? (
                <p className="text-sm text-zinc-300">No processed resumes yet.</p>
              ) : (
                data.latestResumes.map((resume) => (
                  <div
                    key={resume.resumeId}
                    className="rounded-lg border border-zinc-700 p-3"
                  >
                    <p className="text-sm text-zinc-200">Uploaded: {formatDate(resume.uploadedAt)}</p>
                    <p className="text-xs text-zinc-300">Skills extracted: {resume.skillsCount}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}