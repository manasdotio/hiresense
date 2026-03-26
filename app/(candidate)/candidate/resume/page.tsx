"use client";

import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  FileText, CheckCircle2, AlertCircle, ChevronRight, 
  UploadCloud, ArrowRight, RefreshCcw, Briefcase, Minus, XCircle, Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  type CandidateResumeItem,
  type AnalyzeResumeResponse,
  deleteResumeById,
  getCandidateResumes,
  processResumeById,
  uploadResumeFile,
  analyzeResume,
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

function PriorityBadge({ priority }: { priority: string }) {
  const cls =
    priority === "HIGH"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${cls}`}>
      {priority}
    </span>
  );
}

// ─── Fancy SVG Score Gauge ──────────────────────────────────────────────────
function ScoreGauge({ score, title }: { score: number, title: string }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(easeOut * score));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [score]);

  const ringColor = animatedScore >= 75 ? "stroke-emerald-500" : animatedScore >= 50 ? "stroke-amber-400" : "stroke-rose-500";
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-slate-200">
      <div className="relative size-40">
        <svg className="size-full -rotate-90 transform" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} className="stroke-slate-100 fill-transparent" strokeWidth="8" />
          <circle
            cx="70" cy="70" r={radius}
            className={`fill-transparent transition-all duration-150 ease-out ${ringColor}`}
            strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-semibold text-slate-900 tracking-tight">{animatedScore}</span>
        </div>
      </div>
      <p className="mt-4 font-medium text-slate-700 uppercase tracking-widest text-xs flex items-center gap-2">
        {title}
      </p>
    </div>
  );
}

const EMPTY_RESUMES: CandidateResumeItem[] = [];

// ─── Page ─────────────────────────────────────────────────────────────────

export default function ResumePage() {
  const queryClient = useQueryClient();

  // Upload / process state
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingResumeId, setProcessingResumeId] = useState<string | null>(null);
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);

  // Analyze state
  const [jdText, setJdText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResumeResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // ─── Data ───────────────────────────────────────────────────────────────

  const resumesQuery = useQuery({
    queryKey: ["candidate", "resumes"],
    queryFn: getCandidateResumes,
  });

  const resumes = resumesQuery.data?.resumes ?? EMPTY_RESUMES;
  const summary = resumesQuery.data?.summary;

  const activeResumeId = useMemo(() => {
    if (selectedResumeId) {
      const r = resumes.find((r) => r.resumeId === selectedResumeId);
      if (r?.isProcessed) return selectedResumeId;
    }
    return resumes.find((r) => r.isProcessed)?.resumeId ?? null;
  }, [selectedResumeId, resumes]);

  const activeResume = resumes.find((r) => r.resumeId === activeResumeId);

  const pendingResumes = summary
    ? Math.max(summary.totalResumes - summary.processedResumes, 0)
    : 0;

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
      setDeletingResumeId(resumeId);
      setError(null);
      setSuccess(null);
    },
    onSuccess: (_, resumeId) => {
      if (selectedResumeId === resumeId) setSelectedResumeId(null);
      if (processingResumeId === resumeId) setProcessingResumeId(null);
      setAnalysisResult(null);
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : "Failed to delete resume");
    },
    onSettled: async () => {
      setDeletingResumeId(null);
      await queryClient.invalidateQueries({ queryKey: ["candidate", "resumes"] });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!activeResumeId) throw new Error("No processed resume selected. Please upload and process a resume first.");
      if (!jdText.trim() || jdText.trim().length < 20)
        throw new Error("Job description must be at least 20 characters.");
      return analyzeResume(activeResumeId, jdText.trim());
    },
    onSuccess: (result) => {
      setAnalysisResult(result);
      setAnalyzeError(null);
      
      // Auto-scroll to results fluidly
      setTimeout(() => {
        document.getElementById("results_section")?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: (e) => {
      setAnalyzeError(e instanceof Error ? e.message : "Analysis failed");
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
            Match Engine
          </h1>
          <p className="mt-4 text-slate-500 text-lg max-w-2xl leading-relaxed">
            Upload your resume and paste a target job description. Our AI evaluates your experience 
            against the core requirements to find skill gaps instantly.
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

        {/* ── 2-Column Upload & History Layout ─────────────────────────────── */}
        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* Column 1: Upload Dropzone */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">1. Select Resume</h2>
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
                <p className="text-xs uppercase tracking-widest text-slate-400 font-medium">Or choose existing</p>
                <div className="flex flex-col gap-3">
                  {resumes.map((resume) => {
                    const isActive = activeResumeId === resume.resumeId;
                    return (
                      <div
                        key={resume.resumeId}
                        onClick={() => resume.isProcessed && setSelectedResumeId(resume.resumeId)}
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
                              {processingResumeId === resume.resumeId ? <RefreshCcw className="mr-2 size-3 animate-spin"/> : (resume.isProcessed ? "Reprocess via AI" : "Process via AI")}
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

            {/* ── Extracted Skills & Details Preview (Resume DNA) ── */}
            <div className="pt-8 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 flex justify-between items-center">
                <span>Selected Resume DNA</span>
              </h2>
              <Card className="border-slate-200 shadow-sm bg-white">
                {activeResume ? (
                  <CardContent className="p-6 space-y-6">
                    <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                      <div className="bg-emerald-50 text-emerald-600 p-2.5 rounded-xl border border-emerald-100">
                        <Briefcase className="size-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-slate-900">Active Profile Ready</h3>
                        <p className="text-xs text-slate-500">{activeResume.skillsCount} detected technologies</p>
                      </div>
                      {typeof activeResume.atsScore === "number" && (
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">ATS Score</p>
                          <span className="text-xl font-bold font-mono text-slate-900">{activeResume.atsScore}/100</span>
                        </div>
                      )}
                    </div>

                    {activeResume.skills && activeResume.skills.length > 0 && (
                      <div>
                        <div className="flex flex-wrap gap-2">
                          {activeResume.skills.slice(0, 10).map((skill, i) => (
                            <span key={i} className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
                              {skill}
                            </span>
                          ))}
                          {activeResume.skills.length > 10 && (
                            <span className="rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-400">
                              +{activeResume.skills.length - 10} more
                            </span>
                          )}
                        </div>
                      </div>
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
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
            
          </div>

          {/* Column 2: Matches & DNA Preview */}
          <div className="space-y-8">
            
            {/* ── JD Input Section ────────────────────────────────────────────── */}
            <div className="space-y-4 pt-1">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">2. Match Job Description</h2>
              <Card className="border-slate-200 shadow-sm transition-all duration-300 flex flex-col bg-white ring-1 ring-slate-900/5">
                <CardContent className="p-6 md:p-8 space-y-4 flex-1 flex flex-col">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Compare Requirements</h3>
                      <p className="text-sm text-slate-500 mt-1 max-w-sm leading-relaxed">Paste the job description to run the Match Engine gap analysis.</p>
                    </div>
                  </div>
                  
                  <Textarea
                    placeholder="Paste the target job description text here..."
                    value={jdText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJdText(e.target.value)}
                    disabled={analyzeMutation.isPending}
                    className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm leading-relaxed p-5 focus-visible:ring-slate-400 shadow-inner flex-1 min-h-[220px]"
                  />
                  
                  <div className="flex items-center justify-between pt-4 gap-4">
                    <p className="text-xs text-rose-500 font-medium">
                      {analyzeError ? analyzeError : ""}
                      {!activeResumeId && !analyzeError && "Please select a resume first."}
                    </p>
                    <Button
                      onClick={() => {
                        setAnalysisResult(null);
                        setAnalyzeError(null);
                        analyzeMutation.mutate();
                      }}
                      disabled={!activeResumeId || jdText.trim().length < 20 || analyzeMutation.isPending}
                      className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all h-11 px-6 font-medium text-sm w-full md:w-auto shrink-0"
                    >
                      {analyzeMutation.isPending ? (
                        <><RefreshCcw className="mr-2 size-4 animate-spin" /> Analyzing...</>
                      ) : (
                        <>Run Analysis <ArrowRight className="ml-2 size-4" /></>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

          </div>
        </div>

        {/* ── Results Dashboard ────────────────────────────────────────────────────── */}
        {analysisResult && (
          <div id="results_section" className="space-y-8 pt-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px bg-slate-200 flex-1"></div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">3. Analysis Results</h2>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            {/* Top Stat Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              <div className="md:col-span-1">
                <ScoreGauge score={Math.round(analysisResult.score * 100)} title="JD Match Score" />
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4">
                <Card className="border-slate-200 shadow-sm bg-white p-6 flex flex-col justify-center">
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">Required Alignment</p>
                  <p className="text-3xl font-bold font-mono text-slate-900">
                    {analysisResult.breakdown.requiredMatched} <span className="text-lg text-slate-400 font-normal">/ {analysisResult.breakdown.requiredTotal}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-2">Critical path skills met</p>
                </Card>
                
                <Card className="border-slate-200 shadow-sm bg-white p-6 flex flex-col justify-center">
                  <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">Preferred Tech</p>
                  <p className="text-3xl font-bold font-mono text-slate-900">
                    {analysisResult.breakdown.preferredMatched} <span className="text-lg text-slate-400 font-normal">/ {analysisResult.breakdown.preferredTotal}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-2">Nice-to-have bonuses met</p>
                </Card>
              </div>
            </div>

            {/* Experience Bonus / Milestone Row */}
            {analysisResult.breakdown.experienceBonus > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-4 animate-in zoom-in-95 duration-500">
                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-emerald-900">Experience Requirement Met</h4>
                  <p className="text-sm text-emerald-700">
                    You received a <span className="font-bold">+{Math.round(analysisResult.breakdown.experienceBonus * 100)}% Match Bonus</span> for exceeding their minimum years!
                  </p>
                </div>
              </div>
            )}

            {/* Missing Skills Grid */}
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-6">
                <CardTitle className="text-lg font-semibold text-slate-900">Skill Gap Breakdown</CardTitle>
                <CardDescription className="text-slate-500">
                  Requirements explicitly listed in the JD that were not found directly in your resume.
                </CardDescription>
              </div>
              
              <div className="p-6">
                {analysisResult.missingSkills.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {analysisResult.missingSkills.map((ms) => {
                      const isPartial = analysisResult.partialSkillIds.includes(ms.skillId);
                      return (
                        <div
                          key={ms.skillId}
                          className={`flex flex-col gap-2 rounded-lg border p-3 hover:shadow-sm transition-shadow ${
                            isPartial ? "bg-amber-50/50 border-amber-200" : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium text-slate-900 leading-tight pr-2">{ms.skillName}</p>
                            <PriorityBadge priority={ms.priority} />
                          </div>
                          <div className="flex items-center gap-1.5 min-h-[16px]">
                            {isPartial ? (
                              <>
                                <Minus className="size-3.5 text-amber-500" />
                                <span className="text-[11px] font-medium text-amber-600 uppercase tracking-widest">Partial Sync</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="size-3.5 text-rose-400" />
                                <span className="text-[11px] font-medium text-rose-500 uppercase tracking-widest">Missing entirely</span>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
                      <CheckCircle2 className="size-8" />
                    </div>
                    <p className="text-lg font-semibold text-slate-900">Total Match</p>
                    <p className="text-sm text-slate-500">Your resume covers absolutely all the skills extracted from the JD.</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Suggestions Box */}
            {analysisResult.suggestions && (
              <Card className="border-slate-200 shadow-sm bg-white">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                  <CardTitle className="text-sm font-semibold uppercase tracking-widest text-slate-400">Tactical Improvements</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ul className="space-y-4">
                    {analysisResult.suggestions.split(" | ").map((tip, i) => (
                      <li key={i} className="flex gap-3 text-sm text-slate-700 leading-relaxed bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                        <ChevronRight className="size-5 shrink-0 text-slate-400 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
}