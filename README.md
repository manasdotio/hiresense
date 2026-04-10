# HireSense

HireSense is a candidate-focused AI resume analyzer built with Next.js App Router, Prisma, and PostgreSQL.

It helps candidates:
- upload and process PDF resumes,
- extract technical skills and ATS signals,
- compare resumes against a pasted job description,
- see deterministic match explainability,
- find missing skills with priority,
- access free learning materials (docs, playlists, courses) for missing skills.

## Current Product Scope

This repository currently implements the candidate workflow end to end.

Implemented:
- candidate registration and credentials-based login,
- candidate profile management,
- resume upload/process/list/delete,
- job description analysis and analysis history,
- per-user AI provider/model settings persistence,
- diagnostic endpoints for LLM/model/embedding checks.

Not currently implemented as product surface:
- full HR/job posting workflow,
- complete admin module pages.

## Tech Stack

- Framework: Next.js 16, React 19, TypeScript
- Styling: Tailwind CSS 4, shadcn/ui
- Auth: NextAuth credentials + JWT session strategy
- ORM: Prisma 7
- Database: PostgreSQL (+ pgvector)
- AI: OpenAI SDK with OpenAI-compatible providers
  - Local (LM Studio)
  - Groq
  - OpenRouter
- Resume text extraction: pdf-text-extract

## AI + Matching Design

Pipeline:
1. Resume PDF upload and text extraction
2. LLM resume extraction (skills, experience, ATS feedback)
3. Skill canonicalization with embeddings
4. LLM job description skill extraction
5. Deterministic weighted scoring and enrichments
6. Analysis persistence and history retrieval

Scoring characteristics:
- Required skills weighted higher than preferred
- Partial semantic credit for close matches
- Experience bonus when minimum years are met
- Additional deterministic outputs: keyword gap, skill coverage, ATS issue checks

## Persisted AI Settings (Per User)

When a user saves provider/model in Settings, HireSense stores it in `UserAIConfig`.

- Storage model: `UserAIConfig` (one-to-one with `User`)
- Config endpoint: `/api/ai-config`
- Used by:
  - `/api/resume/process`
  - `/api/analyze`

This means if a user selects `groq`, it remains selected across reloads/restarts and is used for future analyses.

## API Routes (Current)

Auth:
- `POST /api/auth/register`
- `GET|POST /api/auth/[...nextauth]`

Candidate:
- `GET /api/candidate/profile`
- `PATCH /api/candidate/profile`
- `GET /api/candidate/resumes`

Resume:
- `POST /api/resume/upload`
- `POST /api/resume/process`
- `DELETE /api/resume/[resumeId]`
- `GET /api/resume/[resumeId]/analyses`

Analysis:
- `POST /api/analyze`

AI Config:
- `GET /api/ai-config`
- `POST /api/ai-config`
- `PUT /api/ai-config` (connection test)

Diagnostics:
- `GET /api/test`
- `GET /api/test-llm`
- `GET /api/test-models`
- `GET /api/test-embedding`
- `GET /api/test-resume-process`

## Environment Variables

Create a `.env` file with at least:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB"
NEXTAUTH_SECRET="replace-with-strong-secret"
NEXTAUTH_URL="http://localhost:3000"

# Local OpenAI-compatible endpoint (LM Studio)
OPENAI_BASE_URL="http://localhost:1234/v1"
EMBEDDING_MODEL="text-embedding-nomic-embed-text-v1.5"

# Optional provider keys
GROQ_API_KEY=""
OPENROUTER_API_KEY=""

# Optional startup defaults (user can override in Settings)
LLM_PROVIDER="local"
LLM_MODEL="mistral-7b-instruct-v0.3"
```

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Ensure `pgvector` is available in your Postgres database

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

3. Generate Prisma client

```bash
npx prisma generate
```

4. Apply schema/migrations

```bash
npx prisma migrate deploy
```

5. (Optional) Seed initial skill data

```bash
npm run db:seed
```

6. Start dev server

```bash
npm run dev
```

## Useful Scripts

- `npm run dev` - start dev server
- `npm run build` - generate Prisma client and build app
- `npm run lint` - run ESLint
- `npm run db:seed` - seed database
- `npm run skills:embed` - generate skill embeddings script

## Repository Structure (High-Level)

```text
app/
  api/
    analyze/
    ai-config/
    auth/
    candidate/
    resume/
    test*/
  (candidate)/candidate/
    analyzer/
    dashboard/
    profile/
    resumes/
    settings/
lib/
  aiConfig.ts
  userAiConfig.ts
  llm.ts
  resumeExtractor.ts
  jobExtractor.ts
  matchingEngine.ts
  analyzeUtils.ts
prisma/
  schema.prisma
  migrations/
```

## Notes

- Resume processing and analysis are request-driven (no background queue yet).
- Browser extensions that mutate DOM can trigger hydration warnings in development.
- If you hit `.next` `EPERM` rename errors on Windows, ensure only one `next dev` process is running and clear `.next` before restart.