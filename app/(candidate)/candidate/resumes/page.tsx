"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  getCandidateResumes, 
  deleteResumeById,
  processResumeById,
  uploadResumeFile 
} from "@/lib/candidateApi";
import { FileText, CheckCircle2, Clock, Trash2, RefreshCcw, UploadCloud, Eye } from "lucide-react";
import { useState } from "react";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

export default function ResumesPage() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const resumesQuery = useQuery({
    queryKey: ["candidate", "resumes"],
    queryFn: getCandidateResumes,
  });

  const resumes = resumesQuery.data?.resumes ?? [];

  const uploadMutation = useMutation({
    mutationFn: async (resumeFile: File) => {
      const uploaded = await uploadResumeFile(resumeFile);
      await processResumeById(uploaded.resumeId);
    },
    onSuccess: () => {
      setUploadSuccess("Resume uploaded and processed successfully!");
      setUploadError(null);
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["candidate", "resumes"] });
    },
    onError: (e) => {
      setUploadSuccess(null);
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    },
  });

  const processMutation = useMutation({
    mutationFn: processResumeById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate", "resumes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteResumeById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidate", "resumes"] });
    },
  });

  const isWorking = uploadMutation.isPending || processMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Resumes</h1>
          <p className="mt-2 text-slate-500">
            Manage your uploaded documents, reprocess older resumes, and clear out history.
          </p>
        </div>
      </div>

      {/* Summary Stats Row */}
      {resumesQuery.data?.summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Total Uploads</p>
              <p className="text-3xl font-bold text-slate-900">{resumesQuery.data.summary.totalResumes}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Processed</p>
              <p className="text-3xl font-bold text-emerald-600">{resumesQuery.data.summary.processedResumes}</p>
            </CardContent>
          </Card>
          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">Pending AI</p>
              <p className="text-3xl font-bold text-amber-500">
                {Math.max(resumesQuery.data.summary.totalResumes - resumesQuery.data.summary.processedResumes, 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upload New Section */}
      <Card className="bg-white shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 p-6 flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">Upload New Resume</CardTitle>
            <CardDescription className="text-slate-500 mt-1">Add a new PDF to your profile.</CardDescription>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={isWorking}
              className="flex-1 max-w-md bg-slate-50 border-slate-200 cursor-pointer h-11"
            />
            <Button
              onClick={() => {
                if (!file) { setUploadError("Select a PDF file first"); return; }
                setUploadError(null); setUploadSuccess(null);
                uploadMutation.mutate(file);
              }}
              disabled={!file || isWorking}
              className="bg-emerald-600 text-white hover:bg-emerald-700 h-11 px-6 font-semibold"
            >
              {uploadMutation.isPending ? <><RefreshCcw className="mr-2 size-4 animate-spin" /> Uploading...</> : <><UploadCloud className="mr-2 size-4" /> Upload</>}
            </Button>
          </div>
          {uploadError && <p className="text-sm font-medium text-rose-500 mt-3">{uploadError}</p>}
          {uploadSuccess && <p className="text-sm font-medium text-emerald-600 mt-3">{uploadSuccess}</p>}
        </CardContent>
      </Card>

      {/* Resumes Grid */}
      {resumesQuery.isPending ? (
        <Card className="bg-white shadow-sm border border-slate-200 p-8 text-center text-slate-500">
          Loading your documents...
        </Card>
      ) : resumes.length === 0 ? (
        <Card className="bg-slate-50 border border-slate-200 border-dashed p-12 text-center shadow-none text-slate-500">
          <FileText className="size-12 mx-auto text-slate-300 mb-4" />
          <p className="text-lg font-medium text-slate-900">No resumes found</p>
          <p className="text-sm">Upload your first resume using the box above.</p>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {resumes.map((resume) => (
            <Card key={resume.resumeId} className="bg-white shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col">
              <CardContent className="p-6 flex-1 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-50 text-slate-400 rounded-lg">
                      <FileText className="size-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">{resume.textPreview.split(" ").slice(0, 5).join(" ")}...</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Uploaded on {formatDate(resume.uploadedAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg border border-slate-100 p-4 mt-2">
                  <div className="flex items-center justify-between mb-3 text-sm">
                    <span className="font-semibold text-slate-700">Analysis Status</span>
                    {resume.isProcessed ? (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircle2 className="size-3" /> Ready
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        <Clock className="size-3" /> Pending
                      </span>
                    )}
                  </div>
                  
                  {resume.isProcessed && (
                    <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-200/60">
                      <span className="text-slate-600">Extracted Skills</span>
                      <span className="font-bold text-slate-900">{resume.skillsCount}</span>
                    </div>
                  )}
                  {typeof resume.atsScore === "number" && (
                    <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-slate-200/60">
                      <span className="text-slate-600">ATS Health Score</span>
                      <span className="font-bold text-emerald-600">{resume.atsScore}/100</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => processMutation.mutate(resume.resumeId)}
                      disabled={isWorking}
                      className="h-8 px-3 text-xs bg-white text-slate-700 border-slate-300 font-medium"
                    >
                      {processMutation.isPending && processMutation.variables === resume.resumeId ? (
                        <RefreshCcw className="size-3 mr-1.5 animate-spin" />
                      ) : (
                        <RefreshCcw className="size-3 mr-1.5" />
                      )}
                      {resume.isProcessed ? "Reprocess" : "Process AI"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-8 px-3 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 font-medium hidden sm:flex"
                    >
                      <Link href="/candidate/resume">
                        <Eye className="size-3 mr-1.5" /> Use in Engine
                      </Link>
                    </Button>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (window.confirm("Delete this resume forever?")) {
                        deleteMutation.mutate(resume.resumeId);
                      }
                    }}
                    disabled={isWorking}
                    className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
