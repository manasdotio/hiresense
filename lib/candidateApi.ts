// Types kept for resume management — all job/application types removed.

export type CandidateResumeItem = {
  resumeId: string;
  uploadedAt: string;
  skillsCount: number;
  skills: string[];
  isProcessed: boolean;
  textPreview: string;
  atsScore: number | null;
  atsFeedback: string | null;
};

export type CandidateResumesPayload = {
  resumes: CandidateResumeItem[];
  summary: {
    totalResumes: number;
    processedResumes: number;
    latestResumeId: string | null;
  };
};

export type ResumeUploadResponse = {
  message: string;
  resumeId: string;
};

export type ResumeProcessResponse = {
  extractedSkills: string[];
  experienceYears: number | null;
};

export type ResumeDeleteResponse = {
  message: string;
  deletedResume: {
    resumeId: string;
    uploadedAt: string;
  };
  deletedCounts: {
    resumeSkills: number;
    analyses: number;
  };
  remainingResumes: number;
};

export type MissingSkillResult = {
  skillId: string;
  skillName: string;
  priority: string;
};

export type ScoreExplainabilityComponent = {
  key: "required" | "preferred" | "experience";
  label: string;
  coveragePct: number;
  contributionPct: number;
  detail: string;
};

export type ScoreExplainability = {
  finalScorePct: number;
  scoreBand: "strong" | "moderate" | "low";
  components: ScoreExplainabilityComponent[];
  highlights: string[];
};

export type LearningMaterialResource = {
  title: string;
  provider: string;
  type: "playlist" | "course" | "docs" | "guide";
  url: string;
};

export type SkillLearningMaterial = {
  skillId: string;
  skillName: string;
  priority: string;
  resources: LearningMaterialResource[];
};

export type AnalyzeResumeResponse = {
  analysisId: string;
  score: number;
  matchPercentage: number;
  missingSkills: MissingSkillResult[];
  suggestions: string | null;
  breakdown: {
    requiredMatched: number;
    requiredTotal: number;
    preferredMatched: number;
    preferredTotal: number;
    requiredWeightEarned: number;
    requiredWeightTotal: number;
    preferredWeightEarned: number;
    preferredWeightTotal: number;
    rawScore: number;
    totalWeight: number;
    experienceBonus: number;
  };
  partialSkillIds: string[];
  scoreExplainability: ScoreExplainability;
  learningMaterials: SkillLearningMaterial[];
};

export type ResumeAnalysisItem = {
  analysisId: string;
  score: number;
  matchPercentage: number;
  createdAt: string;
  jobDescriptionPreview: string;
  missingSkills: MissingSkillResult[];
};

export type CandidateProfile = {
  candidateId: string;
  userId: string;
  fullname: string;
  username: string;
  email: string;
  role: "CANDIDATE" | "ADMIN";
  experienceYears: number | null;
  joinedAt: string;
};

export type UpdateCandidateProfileInput = {
  fullname?: string;
  username?: string;
  email?: string;
  experienceYears?: number | null;
};

// ─── Internal Helpers ────────────────────────────────────────────────────────

function getErrorMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object") {
    const maybeError = (payload as { error?: unknown }).error;
    if (typeof maybeError === "string" && maybeError.length > 0) {
      return maybeError;
    }
    const maybeMessage = (payload as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }
  return fallback;
}

async function requestJson<T>(
  url: string,
  options: RequestInit,
  fallbackError: string,
): Promise<T> {
  const response = await fetch(url, options);

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, fallbackError));
  }

  return payload as T;
}

// ─── Resume Management ───────────────────────────────────────────────────────

export async function getCandidateResumes(): Promise<CandidateResumesPayload> {
  return requestJson<CandidateResumesPayload>(
    "/api/candidate/resumes",
    { cache: "no-store" },
    "Failed to load resumes",
  );
}

export async function uploadResumeFile(file: File): Promise<ResumeUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return requestJson<ResumeUploadResponse>(
    "/api/resume/upload",
    { method: "POST", body: formData },
    "Failed to upload resume",
  );
}

export async function processResumeById(
  resumeId: string,
): Promise<ResumeProcessResponse> {
  return requestJson<ResumeProcessResponse>(
    "/api/resume/process",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeId }),
    },
    "Failed to process resume",
  );
}

export async function deleteResumeById(
  resumeId: string,
): Promise<ResumeDeleteResponse> {
  return requestJson<ResumeDeleteResponse>(
    `/api/resume/${resumeId}`,
    { method: "DELETE" },
    "Failed to delete resume",
  );
}

// ─── Analysis ────────────────────────────────────────────────────────────────

export async function analyzeResume(
  resumeId: string,
  jobDescription: string,
): Promise<AnalyzeResumeResponse> {
  return requestJson<AnalyzeResumeResponse>(
    "/api/analyze",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeId, jobDescription }),
    },
    "Failed to analyze resume",
  );
}

export async function getResumeAnalyses(
  resumeId: string,
): Promise<ResumeAnalysisItem[]> {
  return requestJson<ResumeAnalysisItem[]>(
    `/api/resume/${resumeId}/analyses`,
    { cache: "no-store" },
    "Failed to load analyses",
  );
}

// ─── Profile ─────────────────────────────────────────────────────────────────

type CandidateProfileResponse = { profile: CandidateProfile };
type CandidateProfileUpdateResponse = { message: string; profile: CandidateProfile };

export async function getCandidateProfile(): Promise<CandidateProfile> {
  const data = await requestJson<CandidateProfileResponse>(
    "/api/candidate/profile",
    { cache: "no-store" },
    "Failed to load profile",
  );
  return data.profile;
}

export async function updateCandidateProfile(
  input: UpdateCandidateProfileInput,
): Promise<CandidateProfile> {
  const data = await requestJson<CandidateProfileUpdateResponse>(
    "/api/candidate/profile",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    "Failed to update profile",
  );
  return data.profile;
}
