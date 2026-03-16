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

  const jobs = jobsQuery.data ?? [];
  const errorMessage =
    jobsQuery.error instanceof Error
      ? jobsQuery.error.message
      : "Failed to load jobs";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Matched Jobs</h1>
        <p className="text-sm text-zinc-300">
          Jobs are shown based on your latest processed resume.
        </p>
      </div>

      {jobsQuery.isPending && (
        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardTitle>Loading jobs...</CardTitle>
          </CardHeader>
        </Card>
      )}

      {jobsQuery.isError && (
        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardTitle>Could not load jobs</CardTitle>
            <CardDescription className="text-red-300">{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {!jobsQuery.isPending && !jobsQuery.isError && jobs.length === 0 && (
        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardTitle>No matched jobs found</CardTitle>
            <CardDescription className="text-zinc-300">
              Try uploading a better resume or updating your skills.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!jobsQuery.isPending && !jobsQuery.isError && jobs.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job.id} className="bg-zinc-800 text-white ring-zinc-700">
              <CardHeader>
                <CardTitle>{job.title}</CardTitle>
                <CardDescription className="text-zinc-300">
                  Posted by {job.postedBy} on {formatDate(job.createdAt)}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-zinc-200">
                  {shortText(job.description, 180)}
                </p>

                <div className="text-xs text-zinc-300">
                  Min Experience: {job.minExperience ?? 0} years
                </div>

                <div className="text-xs text-zinc-300">
                  Match Score: {(job.matchPercentage ?? 0).toFixed(1)}%
                </div>

                <div>
                  <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">
                    Required Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {job.requiredSkills.length === 0 && (
                      <span className="rounded bg-zinc-700 px-2 py-1 text-xs text-zinc-300">
                        Not available
                      </span>
                    )}

                    {job.requiredSkills.slice(0, 6).map((skill) => (
                      <span
                        key={`${job.id}-${skill}`}
                        className="rounded bg-zinc-700 px-2 py-1 text-xs"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {job.hasApplied ? (
                    <span className="rounded bg-emerald-900 px-2 py-1 text-xs text-emerald-200">
                      Already applied
                    </span>
                  ) : (
                    <span className="rounded bg-amber-900 px-2 py-1 text-xs text-amber-200">
                      Not applied
                    </span>
                  )}

                  <Link
                    href={`/candidate/job/${job.id}`}
                    className="text-sm font-medium text-sky-300 hover:underline"
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