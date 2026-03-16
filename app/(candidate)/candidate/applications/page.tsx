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
  if (status === "SHORTLISTED") return "bg-blue-900 text-blue-200";
  if (status === "INTERVIEW") return "bg-purple-900 text-purple-200";
  if (status === "REJECTED") return "bg-red-900 text-red-200";
  return "bg-emerald-900 text-emerald-200";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Applications</h1>
        <p className="text-sm text-zinc-300">
          Track all jobs you have applied for and their latest status.
        </p>
      </div>

      {applicationsQuery.isPending && (
        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardTitle>Loading applications...</CardTitle>
          </CardHeader>
        </Card>
      )}

      {applicationsQuery.isError && (
        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardTitle>Could not load applications</CardTitle>
            <CardDescription className="text-red-300">{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!applicationsQuery.isPending &&
        !applicationsQuery.isError &&
        applications.length === 0 && (
          <Card className="bg-zinc-800 text-white ring-zinc-700">
            <CardHeader>
              <CardTitle>No applications yet</CardTitle>
              <CardDescription className="text-zinc-300">
                Visit jobs page and apply to start your application history.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

      {!applicationsQuery.isPending &&
        !applicationsQuery.isError &&
        applications.length > 0 && (
          <Card className="bg-zinc-800 text-white ring-zinc-700">
            <CardHeader>
              <CardTitle>Application History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {applications.map((application) => (
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

                  <div className="flex items-center gap-3">
                    <span className={`rounded px-2 py-1 text-xs ${statusClass(application.status)}`}>
                      {application.status}
                    </span>

                    <Link
                      href={`/candidate/job/${application.jobId}`}
                      className="text-sm text-sky-300 hover:underline"
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