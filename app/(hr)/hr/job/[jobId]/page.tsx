"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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

type ApplicationStatus = "APPLIED" | "SHORTLISTED" | "INTERVIEW" | "REJECTED";

type StatusCounts = Record<ApplicationStatus, number>;

type JobSkill = {
  id: string;
  name: string;
  weight: number;
};

type JobDetailPayload = {
  job: {
    id: string;
    title: string;
    description: string;
    minExperience: number | null;
    createdAt: string;
    postedBy: {
      id: string;
      fullname: string;
    };
    requiredSkills: JobSkill[];
    preferredSkills: JobSkill[];
    applicationsCount: number;
    matchesCount: number;
    hasApplied: boolean;
    myApplicationStatus: string | null;
  };
  pipeline: StatusCounts | null;
};

const statusOrder: ApplicationStatus[] = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEW",
  "REJECTED",
];

function getRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    if (typeof payload.error === "string" && payload.error.length > 0) {
      return payload.error;
    }
  } catch {}

  return fallback;
}

type UpdateJobInput = {
  jobId: string;
  title: string;
  description: string;
};

async function fetchJobDetail(jobId: string): Promise<JobDetailPayload> {
  const response = await fetch(`/api/jobs/${jobId}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to load job details"));
  }

  return (await response.json()) as JobDetailPayload;
}

async function updateJob(input: UpdateJobInput): Promise<void> {
  const response = await fetch(`/api/jobs/${input.jobId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: input.title,
      description: input.description,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to update job"));
  }
}

async function deleteJob(jobId: string): Promise<void> {
  const response = await fetch(`/api/jobs/${jobId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to delete job"));
  }
}

export default function HRJobDetailPage() {
  const params = useParams<{ jobId: string | string[] }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const jobId = getRouteParam(params.jobId);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [descriptionDraft, setDescriptionDraft] = useState<string | null>(null);

  // TanStack Query caches job detail data per job id and manages fetch state.
  const jobQuery = useQuery({
    queryKey: ["hr", "job-detail", jobId],
    queryFn: () => fetchJobDetail(jobId),
    enabled: Boolean(jobId),
  });

  // TanStack mutation handles job updates and invalidates related caches.
  const updateJobMutation = useMutation({
    mutationFn: updateJob,
    onSuccess: async () => {
      setError(null);
      setMessage("Job updated successfully.");
      setTitleDraft(null);
      setDescriptionDraft(null);
      await queryClient.invalidateQueries({
        queryKey: ["hr", "job-detail", jobId],
      });
      await queryClient.invalidateQueries({ queryKey: ["hr", "jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["hr", "dashboard"] });
    },
    onError: (mutationError) => {
      setMessage(null);
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to update job",
      );
    },
  });

  // TanStack mutation handles job deletion and cache invalidation before redirect.
  const deleteJobMutation = useMutation({
    mutationFn: deleteJob,
    onSuccess: async () => {
      setError(null);
      setMessage(null);
      await queryClient.invalidateQueries({ queryKey: ["hr", "jobs"] });
      await queryClient.invalidateQueries({ queryKey: ["hr", "dashboard"] });
      router.push("/hr/jobs");
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to delete job",
      );
    },
  });

  const data = jobQuery.data;
  const loading = jobQuery.isPending;
  const queryError =
    jobQuery.error instanceof Error ? jobQuery.error.message : null;
  const activeError = error ?? queryError;
  const title = titleDraft ?? data?.job.title ?? "";
  const description = descriptionDraft ?? data?.job.description ?? "";

  function handleSave() {
    if (!data) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle || !trimmedDescription) {
      setMessage("Title and description cannot be empty.");
      return;
    }

    const hasTitleChange = trimmedTitle !== data.job.title;
    const hasDescriptionChange = trimmedDescription !== data.job.description;

    if (!hasTitleChange && !hasDescriptionChange) {
      setMessage("No changes to save.");
      return;
    }

    setMessage(null);
    setError(null);

    updateJobMutation.mutate({
      jobId,
      title: trimmedTitle,
      description: trimmedDescription,
    });
  }

  function handleDelete() {
    if (!jobId) {
      return;
    }

    const shouldDelete = window.confirm(
      "Delete this job? This will remove related applications and matches.",
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    deleteJobMutation.mutate(jobId);
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading job details...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (activeError && !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Could not load job</CardTitle>
          <CardDescription>{activeError}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Job not found</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="page-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title">{data.job.title}</h2>
          <p className="page-subtitle">
            Posted by {data.job.postedBy.fullname} on {formatDate(data.job.createdAt)}
          </p>
        </div>

        <div className="flex gap-3">
          <Link href={`/hr/job/${jobId}/candidates`} className="text-link text-sm">
            View Candidates
          </Link>
          <Button
            variant="outline"
            onClick={() => void jobQuery.refetch()}
            disabled={jobQuery.isFetching || updateJobMutation.isPending || deleteJobMutation.isPending}
          >
            Refresh
          </Button>
        </div>
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Minimum Experience</CardDescription>
            <CardTitle>{data.job.minExperience ?? 0} years</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Applications</CardDescription>
            <CardTitle>{data.job.applicationsCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Matches</CardDescription>
            <CardTitle>{data.job.matchesCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
          </CardHeader>
          <CardContent>
            {data.job.requiredSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No required skills found.</p>
            ) : (
              <div className="flex flex-wrap gap-2 text-sm">
                {data.job.requiredSkills.map((skill) => (
                  <span key={skill.id} className="chip text-sm">
                    {skill.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferred Skills</CardTitle>
          </CardHeader>
          <CardContent>
            {data.job.preferredSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No preferred skills found.</p>
            ) : (
              <div className="flex flex-wrap gap-2 text-sm">
                {data.job.preferredSkills.map((skill) => (
                  <span key={skill.id} className="chip text-sm">
                    {skill.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {data.pipeline && (
        <Card>
          <CardHeader>
            <CardTitle>Application Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            {statusOrder.map((status) => (
              <div
                key={status}
                className="surface-soft p-3 text-sm"
              >
                <p className="text-muted-foreground">{status}</p>
                <p className="text-xl font-semibold text-foreground">{data.pipeline?.[status] ?? 0}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Edit Job</CardTitle>
          <CardDescription>
            Update title or description. Description changes regenerate AI skills.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="edit-title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="edit-title"
              value={title}
              onChange={(event) => setTitleDraft(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-description" className="text-sm font-medium">
              Description
            </label>
            <textarea
              id="edit-description"
              className="field-textarea"
              value={description}
              onChange={(event) => setDescriptionDraft(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleSave}
              disabled={updateJobMutation.isPending || deleteJobMutation.isPending}
            >
              {updateJobMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={updateJobMutation.isPending || deleteJobMutation.isPending}
            >
              {deleteJobMutation.isPending ? "Deleting..." : "Delete Job"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}