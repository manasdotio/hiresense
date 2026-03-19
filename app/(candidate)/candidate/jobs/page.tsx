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
import { getCandidateJobs } from "@/lib/candidateApi";

const MIN_MATCH_PERCENTAGE = 30;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function shortText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

export default function CandidateJobsPage() {
  const jobsQuery = useQuery({
    queryKey: ["candidate", "jobs"],
    queryFn: getCandidateJobs,
  });

  const jobs = (jobsQuery.data ?? []).filter(
    (job) => (job.matchPercentage ?? 0) > MIN_MATCH_PERCENTAGE,
  );
  const errorMessage =
    jobsQuery.error instanceof Error
      ? jobsQuery.error.message
      : "Failed to load jobs";

  return (
    <div className="page-stack">
      <div className="section-head">
        <h2 className="page-title">Matched Jobs</h2>
        <p className="page-subtitle">
          Jobs are shown based on your latest processed resume and must score above
          {` ${MIN_MATCH_PERCENTAGE}%`}.
        </p>
      </div>

      {jobsQuery.isPending && (
        <Card>
          <CardHeader>
            <CardTitle>Loading jobs...</CardTitle>
          </CardHeader>
        </Card>
      )}

      {jobsQuery.isError && (
        <Card>
          <CardHeader>
            <CardTitle>Could not load jobs</CardTitle>
            <CardDescription className="text-red-300">{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!jobsQuery.isPending && !jobsQuery.isError && jobs.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No matched jobs above {MIN_MATCH_PERCENTAGE}% found</CardTitle>
            <CardDescription>
              Try uploading a better resume or updating your skills.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!jobsQuery.isPending && !jobsQuery.isError && jobs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <CardTitle>{job.title}</CardTitle>
                <CardDescription>
                  Posted by {job.postedBy} on {formatDate(job.createdAt)}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {shortText(job.description, 180)}
                </p>

                <div className="text-xs text-muted-foreground">
                  Min Experience: {job.minExperience ?? 0} years
                </div>

                <div className="text-xs text-muted-foreground">
                  Match Score: {(job.matchPercentage ?? 0).toFixed(1)}%
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                    Required Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.length === 0 && (
                      <span className="chip">
                        Not available
                      </span>
                    )}

                    {job.requiredSkills.slice(0, 6).map((skill) => (
                      <span key={`${job.id}-${skill}`} className="chip">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {job.hasApplied ? (
                    <span className="status-pill status-success">
                      Already applied
                    </span>
                  ) : (
                    <span className="status-pill status-warning">
                      Not applied
                    </span>
                  )}

                  <Link
                    href={`/candidate/job/${job.id}`}
                    className="text-link text-sm font-medium"
                  >
                    View Details
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}