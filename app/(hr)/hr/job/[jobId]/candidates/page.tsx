"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
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

type CandidateRow = {
  candidateId: string;
  name: string;
  matchPercentage: number;
  missingSkills: string[];
  status: string;
  note: string | null;
  statusUpdatedAt: string | null;
};

type DraftDecision = {
  status: ApplicationStatus;
  note: string;
};

type CandidatesPayload = {
  candidates: CandidateRow[];
  jobTitle: string;
};

type UpdateDecisionInput = {
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  note?: string;
};

const statusOptions: ApplicationStatus[] = [
  "APPLIED",
  "SHORTLISTED",
  "INTERVIEW",
  "REJECTED",
];

const EMPTY_CANDIDATES: CandidateRow[] = [];

function getRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeStatus(value: string): ApplicationStatus {
  if ((statusOptions as string[]).includes(value)) {
    return value as ApplicationStatus;
  }

  return "APPLIED";
}

function formatUpdatedAt(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString();
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

async function fetchCandidatesData(jobId: string): Promise<CandidatesPayload> {
  const [candidatesResponse, jobResponse] = await Promise.all([
    fetch(`/api/jobs/${jobId}/candidates`, { cache: "no-store" }),
    fetch(`/api/jobs/${jobId}`, { cache: "no-store" }),
  ]);

  if (!candidatesResponse.ok) {
    throw new Error(
      await readErrorMessage(candidatesResponse, "Failed to load candidates"),
    );
  }

  const candidates = (await candidatesResponse.json()) as CandidateRow[];

  let jobTitle = "Job Candidates";
  if (jobResponse.ok) {
    const jobPayload = (await jobResponse.json()) as {
      job?: { title?: string };
    };

    if (typeof jobPayload.job?.title === "string" && jobPayload.job.title.trim().length > 0) {
      jobTitle = jobPayload.job.title;
    }
  }

  return { candidates, jobTitle };
}

async function updateDecision(input: UpdateDecisionInput): Promise<void> {
  const response = await fetch(
    `/api/jobs/${input.jobId}/candidates/${input.candidateId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: input.status,
        note: input.note,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Failed to update status"));
  }
}

export default function HRJobCandidatesPage() {
  const params = useParams<{ jobId: string | string[] }>();
  const queryClient = useQueryClient();
  const jobId = getRouteParam(params.jobId);

  const [drafts, setDrafts] = useState<Record<string, DraftDecision>>({});
  const [savingCandidateId, setSavingCandidateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // TanStack Query caches ranked candidates per job id and tracks loading/refetch state.
  const candidatesQuery = useQuery({
    queryKey: ["hr", "job-candidates", jobId],
    queryFn: () => fetchCandidatesData(jobId),
    enabled: Boolean(jobId),
  });

  // TanStack mutation updates candidate status and invalidates dependent HR data.
  const saveDecisionMutation = useMutation({
    mutationFn: updateDecision,
    onMutate: (variables) => {
      setSavingCandidateId(variables.candidateId);
      setError(null);
      setMessage(null);
    },
    onSuccess: async () => {
      setMessage("Candidate status updated.");
      await queryClient.invalidateQueries({
        queryKey: ["hr", "job-candidates", jobId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["hr", "job-detail", jobId],
      });
      await queryClient.invalidateQueries({ queryKey: ["hr", "dashboard"] });
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to update status",
      );
    },
    onSettled: () => {
      setSavingCandidateId(null);
    },
  });

  const candidates = candidatesQuery.data?.candidates ?? EMPTY_CANDIDATES;
  const baseDrafts = useMemo(() => {
    const nextDrafts: Record<string, DraftDecision> = {};

    for (const candidate of candidates) {
      nextDrafts[candidate.candidateId] = {
        status: normalizeStatus(candidate.status),
        note: candidate.note ?? "",
      };
    }

    return nextDrafts;
  }, [candidates]);
  const mergedDrafts = useMemo(() => {
    const merged: Record<string, DraftDecision> = { ...baseDrafts };

    for (const [candidateId, draft] of Object.entries(drafts)) {
      if (merged[candidateId]) {
        merged[candidateId] = draft;
      }
    }

    return merged;
  }, [baseDrafts, drafts]);
  const jobTitle = candidatesQuery.data?.jobTitle ?? "Job Candidates";
  const loading = candidatesQuery.isPending;
  const queryError =
    candidatesQuery.error instanceof Error
      ? candidatesQuery.error.message
      : null;
  const activeError = error ?? queryError;

  function updateDraft(candidateId: string, partial: Partial<DraftDecision>) {
    setDrafts((current) => {
      const existing = current[candidateId] ?? {
        status: "APPLIED" as ApplicationStatus,
        note: "",
      };

      return {
        ...current,
        [candidateId]: {
          status: partial.status ?? existing.status,
          note: partial.note ?? existing.note,
        },
      };
    });
  }

  function saveDecision(candidateId: string) {
    if (!jobId) {
      return;
    }

    const draft = mergedDrafts[candidateId];
    if (!draft) {
      return;
    }

    saveDecisionMutation.mutate({
      jobId,
      candidateId,
      status: draft.status,
      note: draft.note.trim() || undefined,
    });
  }

  return (
    <div className="page-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="section-head">
          <h2 className="page-title">Candidates for {jobTitle}</h2>
          <p className="page-subtitle">
            Ranked by match score. Update status and notes for each candidate.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href={`/hr/job/${jobId}`} className="text-link text-sm">
            Back to Job
          </Link>
          <Button
            variant="outline"
            onClick={() => void candidatesQuery.refetch()}
            disabled={candidatesQuery.isFetching || saveDecisionMutation.isPending}
          >
            {candidatesQuery.isFetching ? "Refreshing..." : "Refresh"}
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

      <Card>
        <CardHeader>
          <CardTitle>Candidate Ranking</CardTitle>
          <CardDescription>
            Match percentages come from the deterministic matching engine.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading candidates...</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No matched candidates found for this job yet.
            </p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Match</th>
                  <th>Missing Skills</th>
                  <th>Status</th>
                  <th>Note</th>
                  <th>Updated</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => {
                  const draft = mergedDrafts[candidate.candidateId] ?? {
                    status: normalizeStatus(candidate.status),
                    note: candidate.note ?? "",
                  };

                  return (
                    <tr key={candidate.candidateId}>
                      <td className="font-medium">{candidate.name}</td>
                      <td>
                        {candidate.matchPercentage.toFixed(1)}%
                      </td>
                      <td className="text-muted-foreground">
                        {candidate.missingSkills.length === 0
                          ? "None"
                          : candidate.missingSkills.join(", ")}
                      </td>
                      <td>
                        <select
                          className="field-select h-9 px-2.5"
                          value={draft.status}
                          onChange={(event) =>
                            updateDraft(candidate.candidateId, {
                              status: normalizeStatus(event.target.value),
                            })
                          }
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <Input
                          value={draft.note}
                          onChange={(event) =>
                            updateDraft(candidate.candidateId, {
                              note: event.target.value,
                            })
                          }
                          placeholder="Optional note"
                        />
                      </td>
                      <td className="text-muted-foreground">
                        {formatUpdatedAt(candidate.statusUpdatedAt)}
                      </td>
                      <td>
                        <Button
                          size="sm"
                          onClick={() => saveDecision(candidate.candidateId)}
                          disabled={savingCandidateId === candidate.candidateId}
                        >
                          {savingCandidateId === candidate.candidateId ? "Saving..." : "Save"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}