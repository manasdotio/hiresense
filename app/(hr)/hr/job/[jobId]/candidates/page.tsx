"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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

  const candidates = candidatesQuery.data?.candidates ?? [];
  const jobTitle = candidatesQuery.data?.jobTitle ?? "Job Candidates";
  const loading = candidatesQuery.isPending;
  const queryError =
    candidatesQuery.error instanceof Error
      ? candidatesQuery.error.message
      : null;
  const activeError = error ?? queryError;

  useEffect(() => {
    const nextDrafts: Record<string, DraftDecision> = {};
    for (const candidate of candidates) {
      nextDrafts[candidate.candidateId] = {
        status: normalizeStatus(candidate.status),
        note: candidate.note ?? "",
      };
    }
    setDrafts(nextDrafts);
  }, [candidates]);

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

    const draft = drafts[candidateId];
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Candidates for {jobTitle}</h2>
          <p className="text-sm text-zinc-400">
            Ranked by match score. Update status and notes for each candidate.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href={`/hr/job/${jobId}`} className="text-sm text-sky-400 hover:underline">
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
            <p className="text-sm text-zinc-400">Loading candidates...</p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No matched candidates found for this job yet.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-400">
                  <th className="py-2 pr-4">Candidate</th>
                  <th className="py-2 pr-4">Match</th>
                  <th className="py-2 pr-4">Missing Skills</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">Note</th>
                  <th className="py-2 pr-4">Updated</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => {
                  const draft = drafts[candidate.candidateId] ?? {
                    status: normalizeStatus(candidate.status),
                    note: candidate.note ?? "",
                  };

                  return (
                    <tr key={candidate.candidateId} className="border-b border-zinc-900">
                      <td className="py-3 pr-4 font-medium">{candidate.name}</td>
                      <td className="py-3 pr-4">
                        {candidate.matchPercentage.toFixed(1)}%
                      </td>
                      <td className="py-3 pr-4 text-zinc-400">
                        {candidate.missingSkills.length === 0
                          ? "None"
                          : candidate.missingSkills.join(", ")}
                      </td>
                      <td className="py-3 pr-4">
                        <select
                          className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                          value={draft.status}
                          onChange={(event) =>
                            updateDraft(candidate.candidateId, {
                              status: normalizeStatus(event.target.value),
                            })
                          }
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status} className="text-black">
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-4">
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
                      <td className="py-3 pr-4 text-zinc-400">
                        {formatUpdatedAt(candidate.statusUpdatedAt)}
                      </td>
                      <td className="py-3">
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