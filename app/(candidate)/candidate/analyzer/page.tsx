"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { 
  CheckCircle2, AlertCircle, ChevronRight, 
  ArrowRight, RefreshCcw, Minus, XCircle, Search, BarChart3, BookOpen, ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  type AnalyzeResumeResponse,
  getCandidateResumes,
  analyzeResume,
} from "@/lib/candidateApi";

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

function ScoreBandBadge({ band }: { band: "strong" | "moderate" | "low" }) {
  const styleMap: Record<"strong" | "moderate" | "low", string> = {
    strong: "bg-emerald-50 text-emerald-700 border-emerald-200",
    moderate: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${styleMap[band]}`}>
      {band} fit
    </span>
  );
}

export default function AnalyzerPage() {
  // Analyze state
  const [jdText, setJdText] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResumeResponse | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const learningMaterials = Array.isArray(analysisResult?.learningMaterials)
    ? analysisResult.learningMaterials
    : [];

  // ─── Data ───────────────────────────────────────────────────────────────

  const resumesQuery = useQuery({
    queryKey: ["candidate", "resumes"],
    queryFn: getCandidateResumes,
  });

  const resumes = resumesQuery.data?.resumes ?? [];
  const processedResumes = resumes.filter(r => r.isProcessed);

  // Auto-select first processed resume if none selected
  useEffect(() => {
    if (processedResumes.length > 0 && !selectedResumeId) {
      setSelectedResumeId(processedResumes[0].resumeId);
    }
  }, [processedResumes, selectedResumeId]);

  // ─── Mutations ───────────────────────────────────────────────────────────

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      if (!selectedResumeId) throw new Error("No processed resume selected.");
      if (!jdText.trim() || jdText.trim().length < 20)
        throw new Error("Job description must be at least 20 characters.");
      return analyzeResume(selectedResumeId, jdText.trim());
    },
    onSuccess: (result) => {
      setAnalysisResult(result);
      setAnalyzeError(null);
      setTimeout(() => {
        document.getElementById("results_section")?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: (e) => {
      setAnalyzeError(e instanceof Error ? e.message : "Analysis failed");
    },
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-24 font-sans selection:bg-slate-200">
      
      {/* ── Header Area ────────────────────────────────────────────────── */}
      <div className="w-full bg-white border-b border-slate-200 pt-16 pb-12 mb-12">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <span className="bg-slate-900 p-2 rounded-lg text-white">
              <Search className="size-6" />
            </span>
            Job Analyzer
          </h1>
          <p className="mt-4 text-slate-500 text-lg max-w-2xl leading-relaxed">
            Match your selected resume against any job description. 
            Identify skill gaps, missing keywords, and track how well you fit their ideal candidate profile.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 space-y-12">
        
        {/* ── Setup & Input  ────────────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">1. Select Target Profile</h2>
            {processedResumes.length > 0 ? (
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full md:w-2/3 h-11 px-4 rounded-lg border border-slate-300 bg-white shadow-sm font-medium text-slate-700 focus:ring-2 focus:ring-slate-400 focus:outline-none"
              >
                {processedResumes.map(r => (
                  <option key={r.resumeId} value={r.resumeId}>
                    {r.textPreview.split(" ").slice(0, 6).join(" ")}... ({new Date(r.uploadedAt).toLocaleDateString()})
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-lg bg-amber-50 text-amber-700 p-4 border border-amber-200 flex items-center gap-3">
                <AlertCircle className="size-5" />
                <p className="font-medium text-sm">You have no fully processed resumes. Go to the Resumes page to upload one.</p>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-200">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400">2. Paste Job Description</h2>
            <Card className="border-slate-200 shadow-sm transition-all duration-300 flex flex-col bg-white">
              <CardContent className="p-0 flex flex-col">
                <Textarea
                  placeholder="Paste the target job description text here..."
                  value={jdText}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setJdText(e.target.value)}
                  disabled={analyzeMutation.isPending}
                  className="border-0 ring-0 focus-visible:ring-0 rounded-b-none text-slate-900 placeholder:text-slate-400 text-sm leading-relaxed p-6 min-h-65 resize-y"
                />
                
                <div className="bg-slate-50 border-t border-slate-100 p-4 flex items-center justify-between gap-4 rounded-b-xl">
                  <p className="text-xs text-rose-500 font-medium px-2">
                    {analyzeError ? analyzeError : ""}
                  </p>
                  <Button
                    onClick={() => {
                      setAnalysisResult(null);
                      setAnalyzeError(null);
                      analyzeMutation.mutate();
                    }}
                    disabled={!selectedResumeId || jdText.trim().length < 20 || analyzeMutation.isPending}
                    className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all h-11 px-6 font-medium text-sm shrink-0"
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

        {/* ── Results Dashboard ────────────────────────────────────────────────────── */}
        {analysisResult && (
          <div id="results_section" className="space-y-8 pt-12 border-t border-slate-200 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-6">3. Actionable Insights</h2>

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

            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="size-5 text-slate-500" />
                    Score Explainability
                  </CardTitle>
                  <CardDescription className="text-slate-500 mt-1">
                    Transparent contribution view for required skills, preferred skills, and experience bonus.
                  </CardDescription>
                </div>
                <ScoreBandBadge band={analysisResult.scoreExplainability.scoreBand} />
              </div>

              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analysisResult.scoreExplainability.components.map((component) => {
                    const barClass =
                      component.key === "required"
                        ? "bg-slate-900"
                        : component.key === "preferred"
                          ? "bg-slate-500"
                          : "bg-emerald-500";

                    return (
                      <div key={component.key} className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            {component.label}
                          </p>
                          <span className="text-xs font-bold text-slate-700">+{component.contributionPct}%</span>
                        </div>

                        <div className="space-y-1.5">
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${barClass}`}
                              style={{ width: `${Math.max(0, Math.min(component.coveragePct, 100))}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500">Coverage: {component.coveragePct}%</p>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{component.detail}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">Primary Score Drivers</p>
                  <ul className="space-y-2">
                    {analysisResult.scoreExplainability.highlights.map((highlight, idx) => (
                      <li key={`${highlight}-${idx}`} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                        <ChevronRight className="size-4 shrink-0 text-slate-400 mt-0.5" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

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
                          className={`flex flex-col gap-3 rounded-lg border p-4 hover:shadow-sm transition-shadow ${
                            isPartial ? "bg-amber-50/50 border-amber-200" : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <p className="text-sm font-medium text-slate-900 leading-tight pr-2">{ms.skillName}</p>
                            <PriorityBadge priority={ms.priority} />
                          </div>
                          <div className="flex items-center">
                            <div className="flex items-center gap-1.5 min-h-4">
                              {isPartial ? (
                                <>
                                  <Minus className="size-3.5 text-amber-500" />
                                  <span className="text-[11px] font-medium text-amber-600 uppercase tracking-widest">Partial</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="size-3.5 text-rose-400" />
                                  <span className="text-[11px] font-medium text-rose-500 uppercase tracking-widest">Missing</span>
                                </>
                              )}
                            </div>
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

            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 p-6">
                <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <BookOpen className="size-5 text-slate-500" />
                  Free Learning Materials
                </CardTitle>
                <CardDescription className="text-slate-500 mt-1">
                  Best free resources for your missing skills from official docs, YouTube playlists, and trusted learning hubs.
                </CardDescription>
              </div>

              <CardContent className="p-6 space-y-5">
                {learningMaterials.length > 0 ? (
                  <div className="space-y-4">
                    {learningMaterials.map((skillMaterial) => (
                      <div key={skillMaterial.skillId} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="text-sm font-semibold text-slate-900">{skillMaterial.skillName}</h4>
                          <PriorityBadge priority={skillMaterial.priority} />
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {skillMaterial.resources.map((resource, index) => (
                            <a
                              key={`${skillMaterial.skillId}-${resource.url}-${index}`}
                              href={resource.url}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-slate-200 bg-white p-3 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <p className="text-sm font-medium text-slate-800 leading-snug">{resource.title}</p>
                                <ExternalLink className="size-4 text-slate-400 shrink-0" />
                              </div>
                              <p className="mt-2 text-[11px] uppercase tracking-widest text-slate-500">
                                {resource.provider} • {resource.type}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
                      <CheckCircle2 className="size-8" />
                    </div>
                    <p className="text-lg font-semibold text-slate-900">No Extra Learning Needed</p>
                    <p className="text-sm text-slate-500">No missing skills detected for this job description, so there are no learning links to show.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
          </div>
        )}
      </div>
    </div>
  );
}
