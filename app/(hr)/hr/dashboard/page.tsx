"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ApplicationStatus = "APPLIED" | "SHORTLISTED" | "INTERVIEW" | "REJECTED";

type StatusCounts = Record<ApplicationStatus, number>;

type DashboardJob = {
  jobId: string;
  title: string;
  createdAt: string;
  minExperience: number | null;
  requiredSkillsCount: number;
  preferredSkillsCount: number;
  totalCandidates: number;
  averageMatchPercentage: number;
  topMatchPercentage: number;
  applicationsCount: number;
  pipeline: StatusCounts;
  lastStatusUpdate: string | null;
};

type DashboardPayload = {
  summary: {
    totalJobs: number;
    totalApplications: number;
    totalMatches: number;
    totalMatchedCandidates: number;
    averageMatchPercentage: number;
  };
  activityLast7Days: {
    jobsCreated: number;
    applicationsCreated: number;
    matchesCreated: number;
  };
  funnel: StatusCounts;
  jobs: DashboardJob[];
  topMissingSkills: {
    skillId: string;
    skillName: string;
    count: number;
    highPriorityCount: number;
  }[];
  generatedAt: string;
};

const statusOrder: ApplicationStatus[] = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEW",
  "REJECTED",
];

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    if (typeof payload.error === "string" && payload.error.length > 0) {
      return payload.error;
    }
  } catch {}

  return fallback;
}

async function fetchDashboard(): Promise<DashboardPayload> {
  const response = await fetch("/api/hr/dashboard", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load dashboard"));
  }

  return (await response.json()) as DashboardPayload;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString();
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export default function HRDashboardPage() {
  // TanStack Query caches dashboard metrics and exposes loading/refetch states.
  const dashboardQuery = useQuery({
    queryKey: ["hr", "dashboard"],
    queryFn: fetchDashboard,
  });

  const data = dashboardQuery.data;
  const error =
    dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : "Failed to load dashboard";
  const loading = dashboardQuery.isPending;

  async function handleRefresh() {
    await dashboardQuery.refetch({ cancelRefetch: false });
  }

  return (
    <div className="page-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="section-head">
          <h2 className="page-title">Dashboard Overview</h2>
          <p className="page-subtitle">
            Track job performance, applications, and skill gaps.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => void handleRefresh()}
          disabled={dashboardQuery.isFetching}
        >
          {dashboardQuery.isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {dashboardQuery.isError && (
        <Card>
          <CardHeader>
            <CardTitle>Could not load dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!dashboardQuery.isError && loading && (
        <Card>
          <CardHeader>
            <CardTitle>Loading dashboard...</CardTitle>
          </CardHeader>
        </Card>
      )}

      {!dashboardQuery.isError && !loading && data && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Card>
              <CardHeader>
                <CardDescription>Total Jobs</CardDescription>
                <CardTitle>{data.summary.totalJobs}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Applications</CardDescription>
                <CardTitle>{data.summary.totalApplications}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Total Matches</CardDescription>
                <CardTitle>{data.summary.totalMatches}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Matched Candidates</CardDescription>
                <CardTitle>{data.summary.totalMatchedCandidates}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Average Match Score</CardDescription>
                <CardTitle>
                  {formatPercentage(data.summary.averageMatchPercentage)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardDescription>Jobs Created (7 Days)</CardDescription>
                <CardTitle>{data.activityLast7Days.jobsCreated}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Applications (7 Days)</CardDescription>
                <CardTitle>{data.activityLast7Days.applicationsCreated}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader>
                <CardDescription>Matches (7 Days)</CardDescription>
                <CardTitle>{data.activityLast7Days.matchesCreated}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Application Funnel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statusOrder.map((status) => (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{status}</span>
                    <span className="font-semibold">{data.funnel[status]}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Missing Skills</CardTitle>
                <CardDescription>Most common skill gaps across matches.</CardDescription>
              </CardHeader>
              <CardContent>
                {data.topMissingSkills.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No missing skills data yet.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.topMissingSkills.map((skill) => (
                      <li
                        key={skill.skillId}
                        className="surface-soft flex items-center justify-between px-3 py-2"
                      >
                        <span>{skill.skillName}</span>
                        <span className="text-muted-foreground">
                          {skill.count} total • {skill.highPriorityCount} high priority
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Job Summaries</CardTitle>
              <CardDescription>
                Last generated on {formatDate(data.generatedAt)}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {data.jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No jobs found for this HR account.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Job</th>
                      <th>Applications</th>
                      <th>Candidates</th>
                      <th>Avg Match</th>
                      <th>Pipeline</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.jobs.map((job) => (
                      <tr key={job.jobId}>
                        <td>
                          <Link
                            href={`/hr/job/${job.jobId}`}
                            className="text-link font-medium"
                          >
                            {job.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            Created {formatDate(job.createdAt)} • Min Exp: {job.minExperience ?? 0}y
                          </p>
                        </td>
                        <td>{job.applicationsCount}</td>
                        <td>{job.totalCandidates}</td>
                        <td>
                          {formatPercentage(job.averageMatchPercentage)}
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                            {statusOrder.map((status) => (
                              <span key={status}>
                                {status}: {job.pipeline[status]}
                              </span>
                            ))}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Last update: {formatDate(job.lastStatusUpdate)}
                          </p>
                        </td>
                        <td>
                          <Link
                            href={`/hr/job/${job.jobId}/candidates`}
                            className="text-link text-sm"
                          >
                            View Candidates
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!dashboardQuery.isError && !loading && !data && (
        <Card>
          <CardHeader>
            <CardTitle>No dashboard data</CardTitle>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}