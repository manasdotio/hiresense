# 1. Project Title

HireSense: AI-Assisted Resume Analysis and Job Description Matching Platform

# 2. Project Overview

HireSense is a Next.js App Router web application that lets authenticated candidates upload PDF resumes, extract structured resume intelligence, and evaluate resume-job fit against pasted job descriptions.

The implemented pipeline combines:
- LLM-based extraction for resume and job description parsing
- Embedding-based skill normalization and semantic similarity checks
- Deterministic scoring and enrichment logic for explainable output

The system stores users, candidate profiles, resumes, canonical skills, resume-skill links, job descriptions, and per-analysis results in PostgreSQL via Prisma.

# 3. Problem Statement

Candidates often do not know how well their resume matches a target job description, which skills are missing, and how ATS-readiness can be improved. Manual comparison is inconsistent and time-consuming.

This project solves that by providing a repeatable pipeline that:
- extracts structured technical signals from resumes and JDs,
- computes a weighted match score,
- identifies missing skills and keyword gaps,
- and returns actionable suggestions.

# 4. Objectives

- Build a secure candidate-authenticated resume analysis workflow.
- Extract technical skills and experience signals from resume text.
- Normalize skill names into a canonical skill store using embeddings.
- Parse job descriptions into required/preferred skills and minimum experience.
- Compute explainable match scoring with weighted tiers and partial semantic credit.
- Persist analysis history for each resume.
- Provide ATS-oriented feedback signals and rule-based improvement suggestions.

# 5. System Workflow

1. User registers through /api/auth/register (creates User + CandidateProfile in one transaction).
2. User logs in through NextAuth credentials (email or username + password).
3. Candidate uploads a PDF resume via /api/resume/upload.
4. Server extracts raw text from PDF and stores it in Resume.
5. Candidate triggers /api/resume/process for a resumeId.
6. System calls extractResumeData (LLM) to get skills, experienceYears, atsScore, atsFeedback, sectionFeedback.
7. System normalizes extracted skills through ensureSkillsWithEmbeddings:
- exact canonical match if present,
- otherwise embedding generation,
- nearest-skill lookup by pgvector similarity,
- optional creation of new canonical Skill.
8. Resume is updated with ATS fields; CandidateProfile may be updated with experienceYears; ResumeSkill links are replaced.
9. Candidate submits a job description to /api/analyze with resumeId.
10. System calls extractJobSkills (LLM) to produce required_skills, preferred_skills, minExperience.
11. JD skills are normalized through the same embedding pipeline.
12. computeMatchFromSkills calculates weighted score, partial matches, missing skill IDs, and breakdown.
13. Deterministic enrichments run:
- keyword gap,
- skill category coverage,
- ATS issue checks,
- rule-based suggestions,
- improvement trend against previous analysis.
14. System persists JobDescription, ResumeAnalysis, and MissingSkill rows.
15. UI displays score, missing skills with priority, suggestions, and analysis history.

# 6. Tech Stack

- Frontend: Next.js 16 (App Router), React 19, TypeScript
- Styling/UI: Tailwind CSS 4, shadcn/ui components, Lucide icons
- State/Data Fetching: TanStack React Query
- Authentication: NextAuth (Credentials provider, JWT session strategy)
- Backend/API: Next.js route handlers under app/api
- ORM/DB: Prisma 7 + PostgreSQL
- Vector Similarity: pgvector column type (Unsupported("vector(768)")) and raw SQL vector operations
- AI Integration: OpenAI SDK against OpenAI-compatible endpoint (default http://localhost:1234/v1)
- Password Hashing: bcryptjs
- Resume Parsing: pdf-text-extract
- Runtime scripts: tsx (seed and embedding utilities)

# 7. System Modules

- Authentication Module
- User registration, credential login, JWT session enrichment.

- Candidate Profile Module
- Candidate profile retrieval and update (fullname, username, email, experienceYears).

- Resume Ingestion Module
- PDF upload validation, text extraction, raw resume storage.

- Resume Processing Module
- LLM resume extraction, ATS field update, skill normalization, ResumeSkill persistence.

- Job Description Analysis Module
- LLM JD skill extraction, embedding normalization, weighted score computation, deterministic enrichment.

- Analysis Persistence and History Module
- Storage and retrieval of ResumeAnalysis, MissingSkill, and linked JobDescription records.

- Candidate Dashboard/Management UI Module
- Dashboard statistics, resume list management (upload/reprocess/delete), analysis interaction pages.

- Diagnostic/Test Module
- API routes for model listing and extraction/embedding testing.

# 8. AI Components (VERY IMPORTANT)

Where LLM is used:
- lib/resumeExtractor.ts: extractResumeData(rawResumeText)
- Outputs skills, experienceYears, atsScore, atsFeedback, sectionFeedback.
- Called by /api/resume/process.

- lib/jobExtractor.ts: extractJobSkills(description)
- Outputs required_skills, preferred_skills, minExperience.
- Called by /api/analyze and some test routes.

Where embeddings are used:
- lib/llm.ts: generateTextEmbedding(text)
- lib/skillStore.ts: ensureSkillsWithEmbeddings
- Generates skill embeddings, stores embeddings in Skill.embedding, and finds nearest existing skill via vector similarity.
- Similarity threshold for canonical nearest-skill reuse: 0.78.

Where deterministic logic is used:
- lib/matchingEngine.ts: weighted scoring, partial credit, and experience bonus.
- lib/analyzeUtils.ts:
- computeKeywordGap,
- computeSkillCoverage,
- computeAtsIssues,
- generateRuleBasedSuggestions,
- computeImprovementTrend.

Important boundary:
- /api/analyze explicitly runs deterministic enrichments after LLM extraction and before persistence.
- Suggestions currently returned to user are rule-based (not LLM-generated) in analyze route.

# 9. Database Design

Current enum:
- Role: CANDIDATE, ADMIN

Current models and purpose:

- User
- Core identity table with fullname, username (unique), email (unique), password hash, role, createdAt.

- CandidateProfile
- Candidate-specific extension table linked 1:1 to User via unique userId.
- Stores experienceYears and owns resumes.

- Resume
- Stores uploaded resume rawText and extraction timestamp.
- Also stores ATS outputs: atsScore, atsFeedback, sectionFeedback (JSON string blob).

- Skill
- Canonical technical skill dictionary.
- Stores unique skill name and optional vector embedding (768 dimensions).

- ResumeSkill
- Junction table between Resume and Skill with optional confidence.
- Unique constraint on (resumeId, skillId).

- JobDescription
- Stores submitted JD content and optional minExperience.

- ResumeAnalysis
- Stores analysis result for one Resume vs one JobDescription.
- Includes score, suggestions, missingKeywords (pipe-separated), atsIssues (pipe-separated), skillCoverage (JSON string), createdAt.

- MissingSkill
- Child table of ResumeAnalysis listing missing skill IDs and priority tags.

Relationships:
- User 1:1 CandidateProfile
- CandidateProfile 1:N Resume
- Resume 1:N ResumeSkill
- Skill 1:N ResumeSkill
- Resume 1:N ResumeAnalysis
- JobDescription 1:N ResumeAnalysis
- ResumeAnalysis 1:N MissingSkill
- Skill 1:N MissingSkill

Cascade behavior:
- ResumeAnalysis has onDelete: Cascade from Resume and JobDescription.
- MissingSkill has onDelete: Cascade from ResumeAnalysis.

# 10. Matching / Scoring Logic

Core matching (lib/matchingEngine.ts):
- Required skill weight = 3
- Preferred skill weight = 1
- Exact match awards full weight.
- Partial match allowed if resumeSimilarity >= 0.72.
- Partial credit formula:
- credit = ((sim - 0.72) / (1 - 0.72)) * weight
- Raw score = earnedWeight / totalWeight

Experience bonus:
- Applied only when candidateExperience >= jdMinExperience and jdMinExperience > 0
- Max bonus constant = 0.05
- Overshoot-based scaling:
- overshoot = min((candidateExperience - jdMinExperience) / jdMinExperience, 1)
- bonus = 0.05 * (0.5 + 0.5 * overshoot)
- Final score = min(rawScore + bonus, 1)

Normalization/canonicalization logic (lib/skillStore.ts):
- Skill text is normalized and deduplicated.
- If exact canonical skill exists, reused.
- If missing, embedding generated and nearest skill queried with min similarity 0.78.
- If no similar skill and allowCreate=true, new Skill is created.

Additional deterministic analysis (lib/analyzeUtils.ts):
- Keyword gap percentage and top missing keywords.
- Skill coverage levels by category (backend, database, devops, cloud).
- ATS issue rules from resume length, extracted skill count, section feedback, keyword diversity.
- Rule-based suggestions generated from gaps and score.
- Improvement trend computed from previous analysis score.

# 11. Features Implemented

- Candidate registration and credential login.
- Candidate profile view and update.
- Resume PDF upload with validation and text extraction.
- Resume processing to extract skills/experience/ATS signals.
- Canonical skill storage with embedding-backed normalization.
- Resume-JD match analysis with weighted score and explainable breakdown.
- Missing skill detection with priority labeling.
- Keyword match percentage and missing keyword list.
- ATS issue detection and rule-based actionable suggestions.
- Analysis history retrieval per resume.
- Resume lifecycle operations: list, reprocess, delete.
- Candidate dashboard summary (total/processed/pending resumes).
- Diagnostic API routes for model listing and extraction/embedding checks.

# 12. Removed / Not Included Features

Removed from current schema/migrations:
- HR role and HR profile tables.
- Job, JobSkill, JobApplication, and older MatchResult-based workflow.
- ApplicationStatus enum and application pipeline tables.

Not included in current implemented app surface:
- No implemented admin pages (admin layout exists but no admin page.tsx files).
- Candidate navigation includes jobs/applications links, but corresponding pages are not present.
- No true OAuth provider integration in NextAuth config (credentials provider is active; UI has a non-wired "Continue with Google" button).
- No background queue/worker architecture for resume processing; processing occurs in API request flow.

# 13. API Design Summary

Auth:
- POST /api/auth/register: create candidate account (User + CandidateProfile).
- GET/POST /api/auth/[...nextauth]: NextAuth handler.

Candidate:
- GET /api/candidate/profile: fetch current candidate profile.
- PATCH /api/candidate/profile: update profile fields.
- GET /api/candidate/resumes: list candidate resumes and summary.

Resume:
- POST /api/resume/upload: upload PDF and store raw extracted text.
- POST /api/resume/process: run resume extraction and skill persistence.
- DELETE /api/resume/[resumeId]: delete owned resume and related records.
- GET /api/resume/[resumeId]/analyses: fetch analysis history for owned resume.

Analysis:
- POST /api/analyze: run JD extraction, matching, deterministic enrichment, and persistence.

Diagnostic/Test endpoints:
- GET /api/test-models
- GET /api/test-embedding
- GET /api/test-llm
- GET /api/test
- GET /api/test-resume-process

# 14. Limitations

- Strong dependence on local/external model availability and correct model IDs via OpenAI-compatible endpoint.
- Parsing quality depends on resume text extraction quality from PDF.
- sectionFeedback, skillCoverage, missingKeywords, and atsIssues are persisted as string blobs/pipe-separated text rather than fully normalized relational structures.
- Similarity thresholds (0.72 partial credit, 0.78 nearest-canonical reuse) are static constants and not dynamically calibrated.
- Role surface is asymmetric: candidate workflow is implemented, admin functionality is mostly scaffold-only.
- Public landing copy still references broader HR pipeline concepts that are no longer represented in the active data model.

# 15. Future Scope

- Implement complete admin module (skills curation, user oversight, analytics pages) to match existing admin layout shell.
- Add explicit candidate jobs/applications pages or remove obsolete navigation entries.
- Introduce structured storage for analysis metadata (JSON/normalized tables) to improve queryability.
- Add confidence/provenance metadata for extracted skills and match explanations.
- Add asynchronous processing (job queue) for large-file and high-throughput scenarios.
- Add model quality controls: evaluation sets, threshold tuning, and fallback strategies.
- Introduce richer multi-resume benchmarking and trend analytics over time.
- Add finalized OAuth providers if social sign-in is intended in production.