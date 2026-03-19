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
import { getCandidateApplications } from "@/lib/candidateApi";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function statusClass(status: string): string {
  if (status === "SHORTLISTED") return "status-pill status-info";
  if (status === "INTERVIEW") return "status-pill status-warning";
  if (status === "REJECTED") return "status-pill status-danger";
  return "status-pill status-success";
}

export default function CandidateApplicationsPage() {
  const applicationsQuery = useQuery({
    queryKey: ["candidate", "applications"],
    queryFn: getCandidateApplications,
  });

  const applications = applicationsQuery.data ?? [];
  const errorMessage =
    applicationsQuery.error instanceof Error
      ? applicationsQuery.error.message
      : "Failed to load applications";

  return (
    <div className="page-stack">
      <div className="section-head">
        <h2 className="page-title">My Applications</h2>
        <p className="page-subtitle">
          Track all jobs you have applied for and their latest status.
        </p>
      </div>

      {applicationsQuery.isPending && (
        <Card>
          <CardHeader>
            <CardTitle>Loading applications...</CardTitle>
          </CardHeader>
        </Card>
      )}

      {applicationsQuery.isError && (
        <Card>
          <CardHeader>
            <CardTitle>Could not load applications</CardTitle>
            <CardDescription className="text-red-300">{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!applicationsQuery.isPending &&
        !applicationsQuery.isError &&
        applications.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>No applications yet</CardTitle>
              <CardDescription>
                Visit jobs page and apply to start your application history.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

      {!applicationsQuery.isPending &&
        !applicationsQuery.isError &&
        applications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Application History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {applications.map((application) => (
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

                  <div className="flex items-center gap-3">
                    <span className={`rounded px-2 py-1 text-xs ${statusClass(application.status)}`}>
                      {application.status}
                    </span>

                    <Link
                      href={`/candidate/job/${application.jobId}`}
                      className="text-link text-sm"
                    >
                      View Job
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
    </div>
  );
}