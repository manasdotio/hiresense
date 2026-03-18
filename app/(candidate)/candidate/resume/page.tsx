"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CandidateResumeItem,
  deleteResumeById,
  getCandidateResumes,
  getResumeMatches,
  processResumeById,
  uploadResumeFile,
} from "@/lib/candidateApi";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function ResumeStatusBadge({ isProcessed }: { isProcessed: boolean }) {
  if (isProcessed) {
    return (
      <span className="rounded bg-emerald-900 px-2 py-1 text-xs text-emerald-200">
        Processed
      </span>
    );
  }

  return (
    <span className="rounded bg-amber-900 px-2 py-1 text-xs text-amber-200">
      Pending
    </span>
  );
}

const EMPTY_RESUMES: CandidateResumeItem[] = [];

export default function ResumePage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingResumeId, setProcessingResumeId] = useState<string | null>(
    null,
  );
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);

  const resumesQuery = useQuery({
    queryKey: ["candidate", "resumes"],
    queryFn: getCandidateResumes,
  });

  const resumes = resumesQuery.data?.resumes ?? EMPTY_RESUMES;
  const summary = resumesQuery.data?.summary;

  const activeResumeId = useMemo(() => {
    if (selectedResumeId) {
      const selectedResume = resumes.find(
        (resume) => resume.resumeId === selectedResumeId,
      );

      if (selectedResume?.isProcessed) {
        return selectedResumeId;
      }
    }

    return resumes.find((resume) => resume.isProcessed)?.resumeId ?? null;
  }, [selectedResumeId, resumes]);

  const matchesQuery = useQuery({
    queryKey: ["candidate", "resume-matches", activeResumeId],
    queryFn: () => getResumeMatches(activeResumeId ?? ""),
    enabled: Boolean(activeResumeId),
  });

  const uploadAndProcessMutation = useMutation({
    mutationFn: async (resumeFile: File) => {
      const uploaded = await uploadResumeFile(resumeFile);

      try {
        const processed = await processResumeById(uploaded.resumeId);
        return { uploaded, processed };
      } catch (processingError) {
        const message =
          processingError instanceof Error
            ? processingError.message
            : "Resume processing failed";
        throw new Error(`Resume uploaded, but processing failed: ${message}`);
      }
    },
    onSuccess: ({ uploaded, processed }) => {
      setSuccess("Resume uploaded and processed successfully.");
      setError(null);
      setSkills(processed.extractedSkills ?? []);
      setSelectedResumeId(uploaded.resumeId);
      setFile(null);
    },
    onError: (mutationError) => {
      setSuccess(null);
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to upload resume",
      );
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["candidate", "resumes"] }),
        queryClient.invalidateQueries({ queryKey: ["candidate", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["candidate", "jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["candidate", "resume-matches"] }),
      ]);
    },
  });

  const processMutation = useMutation({
    mutationFn: async (resumeId: string) => {
      const processed = await processResumeById(resumeId);
      return { resumeId, processed };
    },
    onMutate: (resumeId) => {
      setProcessingResumeId(resumeId);
      setError(null);
      setSuccess(null);
    },
    onSuccess: ({ resumeId, processed }) => {
      setSuccess("Resume processed successfully.");
      setSkills(processed.extractedSkills ?? []);
      setSelectedResumeId(resumeId);
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to process resume",
      );
    },
    onSettled: async () => {
      setProcessingResumeId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["candidate", "resumes"] }),
        queryClient.invalidateQueries({ queryKey: ["candidate", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["candidate", "jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["candidate", "resume-matches"] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (resumeId: string) => {
      const deleted = await deleteResumeById(resumeId);
      return { resumeId, deleted };
    },
    onMutate: (resumeId) => {
      setDeletingResumeId(resumeId);
      setError(null);
      setSuccess(null);
    },
    onSuccess: ({ resumeId }) => {
      setSuccess("Resume deleted successfully.");

      if (selectedResumeId === resumeId) {
        setSelectedResumeId(null);
      }

      if (processingResumeId === resumeId) {
        setProcessingResumeId(null);
      }
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Failed to delete resume",
      );
    },
    onSettled: async () => {
      setDeletingResumeId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["candidate", "resumes"] }),
        queryClient.invalidateQueries({ queryKey: ["candidate", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["candidate", "jobs"] }),
        queryClient.invalidateQueries({ queryKey: ["candidate", "resume-matches"] }),
      ]);
    },
  });

  function handleUploadAndProcess() {
    if (!file) {
      setError("Please choose a PDF file first.");
      return;
    }

    setError(null);
    setSuccess(null);
    setSkills([]);
    uploadAndProcessMutation.mutate(file);
  }

  function handleProcessResume(resume: CandidateResumeItem) {
    processMutation.mutate(resume.resumeId);
  }

  function handleDeleteResume(resume: CandidateResumeItem) {
    const shouldDelete = window.confirm(
      "Delete this resume? This action cannot be undone.",
    );

    if (!shouldDelete) {
      return;
    }

    deleteMutation.mutate(resume.resumeId);
  }

  const isUploading = uploadAndProcessMutation.isPending;
  const isWorking = isUploading || processMutation.isPending || deleteMutation.isPending;
  const pendingResumes = summary
    ? Math.max(summary.totalResumes - summary.processedResumes, 0)
    : 0;
  const loadError =
    resumesQuery.error instanceof Error
      ? resumesQuery.error.message
      : "Failed to load resumes";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resume</h1>
        <p className="text-sm text-zinc-300">
          Upload, process, and manage your resume history.
        </p>
      </div>

      {resumesQuery.isError && (
        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardTitle>Could not load resumes</CardTitle>
            <CardDescription className="text-red-300">{loadError}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card className="bg-zinc-800 text-white ring-zinc-700">
        <CardHeader>
          <CardTitle>Upload and Process</CardTitle>
          <CardDescription className="text-zinc-300">
            Upload a PDF and process it automatically.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input
            type="file"
            accept="application/pdf"
            onChange={(e) =>
              setFile(e.target.files?.[0] || null)
            }
            disabled={isWorking}
          />

          <Button onClick={handleUploadAndProcess} disabled={!file || isWorking}>
            {isUploading ? "Uploading and processing..." : "Upload and Process"}
          </Button>

          {error && <p className="text-sm text-red-300">{error}</p>}
          {success && <p className="text-sm text-emerald-300">{success}</p>}
        </CardContent>
      </Card>

      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-zinc-800 text-white ring-zinc-700">
            <CardHeader>
              <CardDescription className="text-zinc-300">Total Resumes</CardDescription>
              <CardTitle>{summary.totalResumes}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-800 text-white ring-zinc-700">
            <CardHeader>
              <CardDescription className="text-zinc-300">Processed</CardDescription>
              <CardTitle>{summary.processedResumes}</CardTitle>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-800 text-white ring-zinc-700">
            <CardHeader>
              <CardDescription className="text-zinc-300">Pending</CardDescription>
              <CardTitle>{pendingResumes}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      <Card className="bg-zinc-800 text-white ring-zinc-700">
        <CardHeader>
          <CardTitle>Resume History</CardTitle>
          <CardDescription className="text-zinc-300">
            Process pending resumes or remove old ones.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {resumesQuery.isPending ? (
            <p className="text-sm text-zinc-300">Loading resumes...</p>
          ) : resumes.length === 0 ? (
            <p className="text-sm text-zinc-300">No resumes uploaded yet.</p>
          ) : (
            resumes.map((resume) => (
              <div
                key={resume.resumeId}
                className="space-y-3 rounded-lg border border-zinc-700 bg-zinc-900 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-zinc-400">
                      Uploaded: {formatDate(resume.uploadedAt)}
                    </p>
                    <p className="text-xs text-zinc-400">
                      Extracted skills: {resume.skillsCount}
                    </p>
                  </div>

                  <ResumeStatusBadge isProcessed={resume.isProcessed} />
                </div>

                <p className="text-sm text-zinc-300">{resume.textPreview}</p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedResumeId(resume.resumeId)}
                    disabled={!resume.isProcessed}
                    className="text-black"
                  >
                    View Matches
                  </Button>

                  {!resume.isProcessed && (
                    <Button
                      size="sm"
                      onClick={() => handleProcessResume(resume)}
                      disabled={isWorking || deletingResumeId === resume.resumeId}
                    >
                      {processingResumeId === resume.resumeId
                        ? "Processing..."
                        : "Process"}
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteResume(resume)}
                    disabled={isWorking}
                  >
                    {deletingResumeId === resume.resumeId ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-800 text-white ring-zinc-700">
        <CardHeader>
          <CardTitle>Matched Jobs</CardTitle>
          <CardDescription className="text-zinc-300">
            Select a processed resume to see job matches.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          {!activeResumeId ? (
            <p className="text-sm text-zinc-300">
              No processed resume selected yet.
            </p>
          ) : matchesQuery.isPending ? (
            <p className="text-sm text-zinc-300">Loading matches...</p>
          ) : matchesQuery.isError ? (
            <p className="text-sm text-red-300">
              {matchesQuery.error instanceof Error
                ? matchesQuery.error.message
                : "Failed to load matches"}
            </p>
          ) : (matchesQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-zinc-300">No matches found for now.</p>
          ) : (
            <div className="space-y-2">
              {(matchesQuery.data ?? []).slice(0, 8).map((match) => (
                <div
                  key={match.jobId}
                  className="flex items-center justify-between rounded border border-zinc-700 px-3 py-2"
                >
                  <p className="text-sm">{match.jobTitle}</p>
                  <p className="text-xs text-zinc-300">
                    {formatPercent(match.matchPercentage)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {skills.length > 0 && (
        <Card className="bg-zinc-800 text-white ring-zinc-700">
          <CardHeader>
            <CardTitle>Extracted Skills</CardTitle>
          </CardHeader>

          <CardContent className="flex flex-wrap gap-2">
            {skills.map((skill, i) => (
              <span
                key={i}
                className="rounded bg-zinc-700 px-3 py-1 text-sm text-zinc-100"
              >
                {skill}
              </span>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}