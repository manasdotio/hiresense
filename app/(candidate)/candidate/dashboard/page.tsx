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
  if (status === "SHORTLISTED") return "status-pill status-info";
  if (status === "INTERVIEW") return "status-pill status-warning";
  if (status === "REJECTED") return "status-pill status-danger";
  return "status-pill status-success";
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
    <div className="page-stack">
      <div className="section-head">
        <h2 className="page-title">Dashboard</h2>
        <p className="page-subtitle">
          A quick summary of your resumes, jobs, and applications.
        </p>
      </div>

      {dashboardQuery.isPending && (
        <Card>
          <CardHeader>
            <CardTitle>Loading dashboard...</CardTitle>
          </CardHeader>
        </Card>
      )}

      {dashboardQuery.isError && (
        <Card>
          <CardHeader>
            <CardTitle>Could not load dashboard</CardTitle>
            <CardDescription className="text-red-300">{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!dashboardQuery.isPending && !dashboardQuery.isError && data && (
        <>
          {!data.matchingReady && (
            <Card>
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
            <Card>
              <CardHeader>
                <CardDescription>Usable Resumes</CardDescription>
                <CardTitle>{data.summary.totalResumes}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Pending Resumes</CardDescription>
                <CardTitle>{data.summary.pendingResumes}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Open Jobs</CardDescription>
                <CardTitle>{data.summary.openJobs}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Total Applications</CardDescription>
                <CardTitle>{data.summary.totalApplications}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardDescription>Applied</CardDescription>
                <CardTitle>{data.summary.applied}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Shortlisted</CardDescription>
                <CardTitle>{data.summary.shortlisted}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Interview</CardDescription>
                <CardTitle>{data.summary.interview}</CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>Rejected</CardDescription>
                <CardTitle>{data.summary.rejected}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Link href="/candidate/profile" className="text-link block">
                  Edit profile details
                </Link>
                <Link href="/candidate/resume" className="text-link block">
                  Upload or process resume
                </Link>
                <Link href="/candidate/jobs" className="text-link block">
                  View matched jobs
                </Link>
                <Link
                  href="/candidate/applications"
                  className="text-link block"
                >
                  Track my applications
                </Link>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentApplications.length === 0 ? (
                  <p className="text-sm text-muted-foreground">You have not applied to any jobs yet.</p>
                ) : (
                  data.recentApplications.map((application) => (
                    <div
                      key={`${application.jobId}-${application.appliedAt}`}
                      className="surface-soft flex flex-wrap items-center justify-between gap-3 p-3"
                    >
                      <div>
                        <p className="font-medium">{application.jobTitle}</p>
                        <p className="text-xs text-muted-foreground">
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

          <Card>
            <CardHeader>
              <CardTitle>Jobs You Can Apply Now</CardTitle>
              <CardDescription>
                Showing up to 5 matched jobs you have not applied to yet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!data.matchingReady ? (
                <p className="text-sm text-muted-foreground">
                  Upload and process at least one resume first.
                </p>
              ) : data.openJobsPreview.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open jobs available right now.</p>
              ) : (
                data.openJobsPreview.map((job) => (
                  <div
                    key={job.id}
                    className="surface-soft flex flex-wrap items-center justify-between gap-3 p-3"
                  >
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-xs text-muted-foreground">Min experience: {job.minExperience ?? 0} years</p>
                    </div>

                    <Link
                      href={`/candidate/job/${job.id}`}
                      className="text-link text-sm"
                    >
                      View Job
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Latest Processed Resumes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.latestResumes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No processed resumes yet.</p>
              ) : (
                data.latestResumes.map((resume) => (
                  <div
                    key={resume.resumeId}
                    className="surface-soft p-3"
                  >
                    <p className="text-sm text-foreground">Uploaded: {formatDate(resume.uploadedAt)}</p>
                    <p className="text-xs text-muted-foreground">Skills extracted: {resume.skillsCount}</p>
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