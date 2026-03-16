"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { applyToJob, getCandidateJobDetail } from "@/lib/candidateApi";

function getRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function normalizeStatus(value: string | null): string {
  if (!value) {
    return "Not Applied";
  }

  return value;
}

export default function CandidateJobDetailPage() {
  const params = useParams<{ jobId: string | string[] }>();
  const queryClient = useQueryClient();
  const jobId = getRouteParam(params.jobId);

  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const jobDetailQuery = useQuery({
    queryKey: ["candidate", "job-detail", jobId],
    queryFn: () => getCandidateJobDetail(jobId),
    enabled: Boolean(jobId),
  });

  const applyMutation = useMutation({
    mutationFn: applyToJob,
    onMutate: () => {
      setMessage(null);
      setActionError(null);
    },
    onSuccess: async () => {
      setMessage("Application submitted successfully.");
      await queryClient.invalidateQueries({
        queryKey: ["candidate", "job-detail", jobId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["candidate", "jobs"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["candidate", "applications"],
      });
    },
    onError: (error) => {
      setActionError(
        error instanceof Error ? error.message : "Failed to submit application",
      );
    },
  });

  const data = jobDetailQuery.data;
  const loading = jobDetailQuery.isPending;
  const loadError =
    jobDetailQuery.error instanceof Error
      ? jobDetailQuery.error.message
      : "Failed to load job details";

  if (loading) {
    return (
      <Card className="bg-zinc-800 text-white ring-zinc-700">
        <CardHeader>
          <CardTitle>Loading job details...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (jobDetailQuery.isError || !data) {
    return (
      <Card className="bg-zinc-800 text-white ring-zinc-700">
        <CardHeader>
          <CardTitle>Could not load job</CardTitle>
          <CardDescription className="text-red-300">{loadError}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { job } = data;
  const applied = job.hasApplied;
  const currentStatus = normalizeStatus(job.myApplicationStatus);

  function handleApply() {
    if (!jobId || applied || applyMutation.isPending) {
      return;
    }

    applyMutation.mutate(jobId);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="text-sm text-zinc-300">
            Posted by {job.postedBy.fullname} on {formatDate(job.createdAt)}
          </p>
        </div>

        <Link href="/candidate/jobs" className="text-sm text-sky-300 hover:underline">
          Back to Jobs
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardDescription className="text-zinc-300">Status</CardDescription>
            <CardTitle>{currentStatus}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardDescription className="text-zinc-300">Min Experience</CardDescription>
            <CardTitle>{job.minExperience ?? 0} years</CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardDescription className="text-zinc-300">Candidates Applied</CardDescription>
            <CardTitle>{job.applicationsCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {(message || actionError) && (
        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardTitle>{actionError ? "Action failed" : "Success"}</CardTitle>
            <CardDescription className={actionError ? "text-red-300" : "text-emerald-300"}>
              {actionError ?? message}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="bg-zinc-800 text-white ring-zinc-700">
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-zinc-200">
            {job.description}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
          </CardHeader>
          <CardContent>
            {job.requiredSkills.length === 0 ? (
              <p className="text-sm text-zinc-300">No required skills listed.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill) => (
                  <span key={skill.id} className="rounded bg-zinc-700 px-2 py-1 text-xs">
                    {skill.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardTitle>Preferred Skills</CardTitle>
          </CardHeader>
          <CardContent>
            {job.preferredSkills.length === 0 ? (
              <p className="text-sm text-zinc-300">No preferred skills listed.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {job.preferredSkills.map((skill) => (
                  <span key={skill.id} className="rounded bg-zinc-700 px-2 py-1 text-xs">
                    {skill.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleApply} disabled={applied || applyMutation.isPending}>
          {applied
            ? `Already Applied (${currentStatus})`
            : applyMutation.isPending
              ? "Applying..."
              : "Apply Now"}
        </Button>

        <Link href="/candidate/applications" className="text-sm text-sky-300 hover:underline">
          View My Applications
        </Link>
      </div>
    </div>
  );
}