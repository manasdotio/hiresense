"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, CheckCircle2, AlertCircle, 
  UploadCloud, RefreshCcw, Briefcase, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  type CandidateResumeItem,
  deleteResumeById,
  getCandidateResumes,
  processResumeById,
  uploadResumeFile,
} from "@/lib/candidateApi";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function ResumeStatusBadge({ isProcessed }: { isProcessed: boolean }) {
  return isProcessed ? (
    <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="size-3" />
      Analyzed
    </span>
  ) : (
    <span className="flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200">
      <RefreshCcw className="size-3" />
      Pending Extraction
    </span>
  );
}

const EMPTY_RESUMES: CandidateResumeItem[] = [];

// ─── Page ─────────────────────────────────────────────────────────────────

export default function ResumesPage() {
  const queryClient = useQueryClient();

  // Upload / process state
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingResumeId, setProcessingResumeId] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

  // ─── Data ───────────────────────────────────────────────────────────────

  const resumesQuery = useQuery({
    queryKey: ["candidate", "resumes"],
    queryFn: getCandidateResumes,
  });

  const resumes = resumesQuery.data?.resumes ?? EMPTY_RESUMES;

  const activeResumeId = useMemo(() => {
    if (selectedResumeId) {
      const r = resumes.find((r) => r.resumeId === selectedResumeId);
      if (r) return selectedResumeId;
    }
    return resumes[0]?.resumeId ?? null;
  }, [selectedResumeId, resumes]);

  const activeResume = resumes.find((r) => r.resumeId === activeResumeId);

  // ─── Mutations ───────────────────────────────────────────────────────────

  const uploadAndProcessMutation = useMutation({
    mutationFn: async (resumeFile: File) => {
      const uploaded = await uploadResumeFile(resumeFile);
      const processed = await processResumeById(uploaded.resumeId);
      return { uploaded, processed };
    },
    onSuccess: ({ uploaded }) => {
      setSuccess("Your resume is processed and ready!");
      setError(null);
      setSelectedResumeId(uploaded.resumeId);
      setFile(null);
    },
    onError: (e) => {
      setSuccess(null);
      setError(e instanceof Error ? e.message : "Failed to upload resume");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["candidate", "resumes"] });
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
    onSuccess: ({ resumeId }) => {
      setSuccess("Resume successfully re-analyzed.");
      setSelectedResumeId(resumeId);
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : "Failed to process resume");
    },
    onSettled: async () => {
      setProcessingResumeId(null);
      await queryClient.invalidateQueries({ queryKey: ["candidate", "resumes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (resumeId: string) => deleteResumeById(resumeId),
    onMutate: (resumeId) => {
      setError(null);
      setSuccess(null);
    },
    onSuccess: (_, resumeId) => {
      if (selectedResumeId === resumeId) setSelectedResumeId(null);
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : "Failed to delete resume");
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ["candidate", "resumes"] });
    },
  });

  // ─── Handlers ────────────────────────────────────────────────────────────

  const isUploading = uploadAndProcessMutation.isPending;
  const isWorking = isUploading || processMutation.isPending || deleteMutation.isPending;
  const loadError = resumesQuery.error instanceof Error ? resumesQuery.error.message : "Failed to load resumes";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans selection:bg-slate-200">
      
      {/* ── Header Area ────────────────────────────────────────────────── */}
      <div className="w-full bg-white border-b border-slate-200 pt-16 pb-12 mb-12">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <span className="bg-slate-900 p-2 rounded-lg text-white">
              <UploadCloud className="size-6" />
            </span>
            Profile Management
          </h1>
          <p className="mt-4 text-slate-500 text-lg max-w-2xl leading-relaxed">
            Upload and manage your resumes to extract your core technical profile. We use this DNA to intelligently assess your fit for any role.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 space-y-12">
        
        {resumesQuery.isError && (
          <div className="rounded-lg bg-rose-50 text-rose-700 p-4 border border-rose-200 flex items-center gap-3">
            <AlertCircle className="size-5" />
            <p className="font-medium text-sm">Failed to load resumes: {loadError}</p>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* Column 1: Upload Dropzone & History */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">1. Upload Resume</h2>
            <Card className="border-2 border-dashed border-slate-300 shadow-none bg-slate-50/50 hover:bg-slate-100 hover:border-slate-400 transition-colors p-8">
              <CardContent className="flex flex-col items-center justify-center space-y-4 p-0" onDragOver={handleDragOver} onDrop={handleDrop}>
                <div className="p-4 bg-white rounded-full shadow-sm border border-slate-200 text-slate-400">
                  <FileText className="size-8" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-slate-700">Drag and drop your PDF</p>
                  <p className="text-xs text-slate-400">Max size 5MB.</p>
                </div>
                
                <div className="flex w-full items-center gap-3 mt-4">
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    disabled={isWorking}
                    className="flex-1 bg-white cursor-pointer"
                  />
                  <Button
                    onClick={() => {
                      if (!file) { setError("Please choose a PDF file first."); return; }
                      setError(null); setSuccess(null);
                      uploadAndProcessMutation.mutate(file);
                    }}
                    disabled={!file || isWorking}
                    className="bg-slate-900 text-white hover:bg-slate-800 shrink-0"
                  >
                    {isUploading ? <RefreshCcw className="size-4 animate-spin" /> : "Upload"}
                  </Button>
                </div>
                {error && <p className="text-sm font-medium text-rose-500 mt-2">{error}</p>}
                {success && <p className="text-sm font-medium text-emerald-600 mt-2">{success}</p>}
              </CardContent>
            </Card>

            {/* Resume File History */}
            {resumes.length > 0 && (
              <div className="pt-4 space-y-3">
                <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">Your Resumes</p>
                <div className="flex flex-col gap-3">
                  {resumes.map((resume) => {
                    const isActive = activeResumeId === resume.resumeId;
                    return (
                      <div
                        key={resume.resumeId}
                        onClick={() => setSelectedResumeId(resume.resumeId)}
                        className={`flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200 ${
                          isActive
                            ? "border-slate-400 bg-white shadow-md ring-1 ring-slate-400"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm cursor-pointer"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-2">
                              {isActive ? <CheckCircle2 className="size-4 text-emerald-500" /> : <FileText className="size-4 text-slate-400" />}
                              <p className={`text-sm font-medium truncate ${isActive ? "text-slate-900" : "text-slate-600"}`}>
                                {resume.textPreview.split(" ").slice(0, 4).join(" ")}...
                              </p>
                            </div>
                            <p className="text-xs text-slate-400 ml-6">
                              Uploaded {formatDate(resume.uploadedAt)}
                            </p>
                          </div>
                          <ResumeStatusBadge isProcessed={resume.isProcessed} />
                        </div>

                        {/* Resume Actions Row */}
                        <div className="flex flex-wrap gap-2 ml-6">
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="h-8 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3"
                              onClick={(e) => { e.stopPropagation(); processMutation.mutate(resume.resumeId); }}
                              disabled={isWorking}
                            >
                              {processingResumeId === resume.resumeId ? <RefreshCcw className="mr-2 size-3 animate-spin"/> : (resume.isProcessed ? "Re-Analyze" : "Analyze")}
                            </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 text-xs text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Delete this resume? This action cannot be undone."))
                                deleteMutation.mutate(resume.resumeId);
                            }}
                            disabled={isWorking}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
          </div>

          {/* Column 2: Extracted Skills & Details Preview (Resume DNA) */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">2. Profile DNA</h2>
            <Card className="border-slate-200 shadow-sm bg-white">
              {activeResume ? (
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                    <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100">
                      <Briefcase className="size-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base font-semibold text-slate-900">Extracted Skills</h3>
                      <p className="text-xs text-slate-500">{activeResume.skillsCount} detected technologies</p>
                    </div>
                    {typeof activeResume.atsScore === "number" && (
                      <div className="text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Base ATS Score</p>
                        <span className="text-xl font-bold font-mono text-slate-900">{activeResume.atsScore}/100</span>
                      </div>
                    )}
                  </div>

                  {activeResume.skills && activeResume.skills.length > 0 ? (
                    <div>
                      <div className="flex flex-wrap gap-2">
                        {activeResume.skills.map((skill, i) => (
                          <span key={i} className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No skills extracted yet. Ensure the resume is processed via AI.</p>
                  )}

                  {activeResume.atsFeedback && (
                    <div className="pt-4 border-t border-slate-100">
                      <h4 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Actionable Resume Feedback</h4>
                      <ul className="space-y-2">
                        {activeResume.atsFeedback.split(" | ").map((tip, idx) => (
                          <li key={idx} className="flex gap-2 text-xs text-slate-600 leading-relaxed items-start">
                            <span className="text-emerald-500 mt-0.5">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              ) : (
                <CardContent className="p-8 flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                  <Search className="size-8 text-slate-300" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">No profile selected</p>
                    <p className="text-xs text-slate-500">Select an uploaded resume to view its extracted details.</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
          
        </div>
      </div>
    </div>
  );
}
