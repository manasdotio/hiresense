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
      <Card>
        <CardHeader>
          <CardTitle>Loading job details...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (jobDetailQuery.isError || !data) {
    return (
      <Card>
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
    <div className="page-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title">{job.title}</h2>
          <p className="page-subtitle">
            Posted by {job.postedBy.fullname} on {formatDate(job.createdAt)}
          </p>
        </div>

        <Link href="/candidate/jobs" className="text-link text-sm">
          Back to Jobs
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Status</CardDescription>
            <CardTitle>{currentStatus}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Min Experience</CardDescription>
            <CardTitle>{job.minExperience ?? 0} years</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Candidates Applied</CardDescription>
            <CardTitle>{job.applicationsCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {(message || actionError) && (
        <Card>
          <CardHeader>
            <CardTitle>{actionError ? "Action failed" : "Success"}</CardTitle>
            <CardDescription className={actionError ? "text-red-300" : "text-emerald-300"}>
              {actionError ?? message}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {job.description}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Required Skills</CardTitle>
          </CardHeader>
          <CardContent>
            {job.requiredSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No required skills listed.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {job.requiredSkills.map((skill) => (
                  <span key={skill.id} className="chip">
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
            {job.preferredSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No preferred skills listed.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {job.preferredSkills.map((skill) => (
                  <span key={skill.id} className="chip">
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

        <Link href="/candidate/applications" className="text-link text-sm">
          View My Applications
        </Link>
      </div>
    </div>
  );
}