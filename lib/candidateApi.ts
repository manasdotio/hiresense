export type ApplicationStatus =
  | "APPLIED"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "REJECTED";

export type CandidateJobListItem = {
  id: string;
  title: string;
  description: string;
  minExperience: number | null;
  createdAt: string;
  postedBy: string;
  requiredSkills: string[];
  preferredSkills: string[];
  applicationsCount: number;
  matchesCount: number;
  hasApplied: boolean;
  matchPercentage: number | null;
};

export type CandidateJobSkill = {
  id: string;
  name: string;
  weight: number;
};

export type CandidateJobDetailPayload = {
  job: {
    id: string;
    title: string;
    description: string;
    minExperience: number | null;
    createdAt: string;
    postedBy: {
      id: string;
      fullname: string;
    };
    requiredSkills: CandidateJobSkill[];
    preferredSkills: CandidateJobSkill[];
    applicationsCount: number;
    matchesCount: number;
    hasApplied: boolean;
    myApplicationStatus: ApplicationStatus | null;
    matchPercentage: number | null;
  };
  pipeline: Record<ApplicationStatus, number> | null;
};

export type CandidateApplication = {
  jobId: string;
  jobTitle: string;
  status: ApplicationStatus;
  appliedAt: string;
};

export type ApplyToJobResponse = {
  id: string;
  jobTitle: string;
  status: ApplicationStatus;
};

export type CandidateResumeItem = {
  resumeId: string;
  uploadedAt: string;
  skillsCount: number;
  isProcessed: boolean;
  textPreview: string;
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
    matchResults: number;
  };
  remainingResumes: number;
  clearedMatches: boolean;
};

export type ResumeMatchItem = {
  jobId: string;
  jobTitle: string;
  score: number;
  matchPercentage: number;
};

export type CandidateDashboardData = {
  summary: {
    totalResumes: number;
    processedResumes: number;
    pendingResumes: number;
    totalJobs: number;
    openJobs: number;
    totalApplications: number;
    appliedJobs: number;
    applied: number;
    shortlisted: number;
    interview: number;
    rejected: number;
  };
  recentApplications: CandidateApplication[];
  latestResumes: CandidateResumeItem[];
  openJobsPreview: CandidateJobListItem[];
  matchingReady: boolean;
  matchingMessage: string | null;
};

export type CandidateProfile = {
  candidateId: string;
  userId: string;
  fullname: string;
  username: string;
  email: string;
  role: "CANDIDATE";
  experienceYears: number | null;
  joinedAt: string;
};

export type UpdateCandidateProfileInput = {
  fullname?: string;
  username?: string;
  email?: string;
  experienceYears?: number | null;
};

type JobsResponse = {
  jobs: CandidateJobListItem[];
};

type CandidateProfileResponse = {
  profile: CandidateProfile;
};

type CandidateProfileUpdateResponse = {
  message: string;
  profile: CandidateProfile;
};

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

export async function getCandidateJobs(): Promise<CandidateJobListItem[]> {
  const data = await requestJson<JobsResponse>(
    "/api/jobs",
    { cache: "no-store" },
    "Failed to load jobs",
  );

  return data.jobs ?? [];
}

export async function getCandidateJobDetail(
  jobId: string,
): Promise<CandidateJobDetailPayload> {
  return requestJson<CandidateJobDetailPayload>(
    `/api/jobs/${jobId}`,
    { cache: "no-store" },
    "Failed to load job details",
  );
}

export async function applyToJob(jobId: string): Promise<ApplyToJobResponse> {
  return requestJson<ApplyToJobResponse>(
    "/api/candidate/applications",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jobId }),
    },
    "Failed to apply for this job",
  );
}

export async function getCandidateApplications(): Promise<CandidateApplication[]> {
  return requestJson<CandidateApplication[]>(
    "/api/candidate/applications",
    { cache: "no-store" },
    "Failed to load applications",
  );
}

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
    {
      method: "POST",
      body: formData,
    },
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
      headers: {
        "Content-Type": "application/json",
      },
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
    {
      method: "DELETE",
    },
    "Failed to delete resume",
  );
}

export async function getResumeMatches(
  resumeId: string,
): Promise<ResumeMatchItem[]> {
  return requestJson<ResumeMatchItem[]>(
    `/api/resume/${resumeId}/matches`,
    { cache: "no-store" },
    "Failed to load resume matches",
  );
}

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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
    "Failed to update profile",
  );

  return data.profile;
}

export async function getCandidateDashboardData(): Promise<CandidateDashboardData> {
  const [applications, resumesPayload] = await Promise.all([
    getCandidateApplications(),
    getCandidateResumes(),
  ]);

  const processedResumes = resumesPayload.resumes.filter(
    (resume) => resume.isProcessed,
  );

  const pendingResumes = Math.max(
    resumesPayload.summary.totalResumes - processedResumes.length,
    0,
  );

  let jobs: CandidateJobListItem[] = [];
  let matchingReady = true;
  let matchingMessage: string | null = null;

  try {
    jobs = await getCandidateJobs();
  } catch (error) {
    matchingReady = false;
    matchingMessage =
      error instanceof Error
        ? error.message
        : "Upload and process your resume to see matched jobs.";
  }

  const statusCounts: Record<ApplicationStatus, number> = {
    APPLIED: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    REJECTED: 0,
  };

  for (const application of applications) {
    statusCounts[application.status] += 1;
  }

  const sortedApplications = [...applications].sort((a, b) => {
    return new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime();
  });

  const openJobs = jobs.filter((job) => !job.hasApplied);
  const appliedJobs = jobs.filter((job) => job.hasApplied).length;

  return {
    summary: {
      totalResumes: processedResumes.length,
      processedResumes: processedResumes.length,
      pendingResumes,
      totalJobs: jobs.length,
      openJobs: openJobs.length,
      totalApplications: applications.length,
      appliedJobs,
      applied: statusCounts.APPLIED,
      shortlisted: statusCounts.SHORTLISTED,
      interview: statusCounts.INTERVIEW,
      rejected: statusCounts.REJECTED,
    },
    recentApplications: sortedApplications.slice(0, 5),
    latestResumes: processedResumes.slice(0, 3),
    openJobsPreview: openJobs.slice(0, 5),
    matchingReady,
    matchingMessage,
  };
}
