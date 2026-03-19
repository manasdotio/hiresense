"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type JobItem = {
  id: string;
  title: string;
  description: string;
  minExperience: number | null;
  createdAt: string;
  postedBy: string;
  requiredSkills: string[];
  preferredSkills: string[];
  applicationsCount: number;
  matchesCount: number;
  hasApplied: boolean;
};

type JobsResponse = {
  jobs: JobItem[];
};

type CreateJobInput = {
  title: string;
  description: string;
  minExperience?: number;
};

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    if (typeof payload.error === "string" && payload.error.length > 0) {
      return payload.error;
    }
  } catch {}

  return fallback;
}

async function fetchJobs(): Promise<JobItem[]> {
  const response = await fetch("/api/jobs", { cache: "no-store" });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load jobs"));
  }

  const payload = (await response.json()) as JobsResponse;
  return payload.jobs ?? [];
}

async function createJob(input: CreateJobInput): Promise<void> {
  const response = await fetch("/api/jobs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to create job"));
  }
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

export default function HRJobsPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [minExperience, setMinExperience] = useState("");

  // TanStack Query caches the HR jobs list and handles loading/refetch state.
  const jobsQuery = useQuery({
    queryKey: ["hr", "jobs"],
    queryFn: fetchJobs,
  });

  // TanStack mutation manages job creation and invalidates list/dashboard caches.
  const createJobMutation = useMutation({
    mutationFn: createJob,
    onSuccess: async () => {
      setError(null);
      setMessage("Job created successfully.");
      setTitle("");
      setDescription("");
      setMinExperience("");
      await queryClient.invalidateQueries({ queryKey: ["hr", "jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["hr", "dashboard"] });
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to create job",
      );
    },
  });

  const jobs = jobsQuery.data ?? [];
  const loading = jobsQuery.isPending;
  const queryError =
    jobsQuery.error instanceof Error ? jobsQuery.error.message : null;
  const activeError = error ?? queryError;

  async function handleRefresh() {
    setError(null);
    setMessage(null);
    await jobsQuery.refetch({ cancelRefetch: false });
  }

  function handleCreateJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const minExperienceValue = minExperience.trim();

    if (!trimmedTitle || !trimmedDescription) {
      setMessage(null);
      setError("Title and description are required.");
      return;
    }

    if (minExperienceValue && Number.isNaN(Number(minExperienceValue))) {
      setMessage(null);
      setError("Minimum experience must be a valid number.");
      return;
    }

    setError(null);
    setMessage(null);

    createJobMutation.mutate({
      title: trimmedTitle,
      description: trimmedDescription,
      ...(minExperienceValue ? { minExperience: Number(minExperienceValue) } : {}),
    });
  }

  return (
    <div className="page-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="section-head">
          <h2 className="page-title">Manage Jobs</h2>
          <p className="page-subtitle">
            Create jobs, review AI-extracted skills, and move to candidates.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => void handleRefresh()}
          disabled={jobsQuery.isFetching || createJobMutation.isPending}
        >
          {jobsQuery.isFetching ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {activeError && (
        <Card>
          <CardHeader>
            <CardTitle>Action failed</CardTitle>
            <CardDescription>{activeError}</CardDescription>
          </CardHeader>
        </Card>
      )}

      {message && (
        <Card>
          <CardHeader>
            <CardTitle>Update</CardTitle>
            <CardDescription>{message}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create Job</CardTitle>
          <CardDescription>
            Add a title and description. Skills are extracted automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleCreateJob}>
            <div className="space-y-2">
              <label htmlFor="job-title" className="text-sm font-medium">
                Title
              </label>
              <Input
                id="job-title"
                placeholder="Senior Backend Engineer"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="job-description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="job-description"
                className="field-textarea"
                placeholder="Describe responsibilities, required skills, and expectations..."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="job-min-exp" className="text-sm font-medium">
                Minimum Experience (years)
              </label>
              <Input
                id="job-min-exp"
                type="number"
                step="0.5"
                min="0"
                placeholder="2"
                value={minExperience}
                onChange={(event) => setMinExperience(event.target.value)}
              />
            </div>

            <Button type="submit" disabled={createJobMutation.isPending}>
              {createJobMutation.isPending ? "Creating..." : "Create Job"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Jobs</CardTitle>
          <CardDescription>Jobs posted from this HR account.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading jobs...</p>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs yet. Create your first posting.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {jobs.map((job) => (
                <Card key={job.id}>
                  <CardHeader>
                    <CardTitle>{job.title}</CardTitle>
                    <CardDescription>
                      Posted {formatDate(job.createdAt)} • Min Exp: {job.minExperience ?? 0}y
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{job.description}</p>

                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Required Skills
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {job.requiredSkills.length === 0 && (
                          <span className="chip">
                            None extracted yet
                          </span>
                        )}
                        {job.requiredSkills.slice(0, 8).map((skill) => (
                          <span key={`${job.id}-required-${skill}`} className="chip">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Applications: {job.applicationsCount} • Matches: {job.matchesCount}
                    </div>

                    <div className="flex gap-3 text-sm">
                      <Link href={`/hr/job/${job.id}`} className="text-link">
                        View Details
                      </Link>
                      <Link
                        href={`/hr/job/${job.id}/candidates`}
                        className="text-link"
                      >
                        View Candidates
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
