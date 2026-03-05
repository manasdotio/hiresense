# AI Resume Screening & Skill Gap Analyzer

## Overview

AI Resume Screening & Skill Gap Analyzer is a web-based recruitment assistance platform that uses hybrid AI techniques to:

- Parse resumes
- Extract technical skills
- Compare candidates against job descriptions
- Generate match scores
- Identify skill gaps
- Provide improvement recommendations

The system is designed as a decision-support tool for HR professionals.

---

## Tech Stack

Frontend:
- Next.js (App Router)
- Tailwind CSS
- TypeScript

Backend:
- Next.js API Routes
- Prisma ORM

Database:
- PostgreSQL

AI:
- Local LLM (Ollama - Llama 3 / Mistral)
- Sentence Transformers (Embeddings)
- Cosine Similarity Matching

Authentication:
- JWT-based authentication

---

## Core Features

### HR Role
- Create job postings
- Define required skills
- View ranked candidate list
- Analyze match scores
- View skill gap breakdown

### Candidate Role
- Upload resume
- View extracted skills
- See job match percentage
- Receive skill improvement suggestions

### Admin Role
- Manage users
- Manage skill dictionary
- Monitor system activity

---

## AI Workflow

1. Resume Upload
2. Resume text extraction
3. LLM-based skill extraction
4. Job description parsing
5. Embedding generation
6. Cosine similarity scoring
7. Skill gap analysis
8. Feedback generation

The system uses LLM for structured extraction and explanation.
Scoring is deterministic and explainable.

---

## Installation

### 1. Clone Repository

git clone <repository-url>
cd project-name

---

### 2. Install Dependencies

npm install

---

### 3. Setup Environment Variables

Create a `.env` file:

DATABASE_URL="postgresql://user:password@localhost:5432/ai_hr"
JWT_SECRET="your_secret_key"

---

### 4. Setup Database

```bash
npx prisma migrate dev --name initial-setup
npx prisma generate
npm run seed
```

---

### 5. Run Development Server

npm run dev

---

## Project Structure

```
/app
  /api                      # API Routes
    /auth                   # Authentication
      /[...nextauth]        # NextAuth.js handlers
      /register             # User registration
    /jobs                   # Job management
      /[jobId]
        /candidates         # Get candidates for job
          /[candidateId]
            /status         # Update application status
    /candidate              # Candidate features
      /applications         # View/Create applications
    /match                  # Matching engine
      /run                  # Run match calculation
      /[jobId]/[candidateId]
        /skill-gap          # Get skill gap analysis
    /resume                 # Resume processing
      /upload               # Upload resume
      /process             # Process resume with AI
      /[resumeId]/matches   # Get matches for resume
    /test-*                 # Development/testing routes
  /dashboard                # Frontend pages
/lib                        # Shared utilities
  auth.ts                  # Authentication config
  prisma.ts               # Database client
  llm.ts                  # LLM integration
  matchingEngine.ts       # Core matching logic
  resumeExtractor.ts      # Resume parsing
  jobExtractor.ts         # Job parsing
  skillStore.ts           # Skill management
/prisma                     # Database
  schema.prisma           # Database schema
  /migrations             # Database migrations
/types                      # TypeScript definitions
```

---

## API Documentation

### Authentication Routes
- **POST** `/api/auth/register` - Register new user
- **All** `/api/auth/[...nextauth]` - NextAuth.js authentication handlers

### Job Management (HR Only)
- **POST** `/api/jobs` - Create new job posting with AI skill extraction
- **GET** `/api/jobs/[jobId]/candidates` - Get ranked candidates for a job
- **PATCH** `/api/jobs/[jobId]/candidates/[candidateId]/status` - Update application status

### Candidate Features
- **GET** `/api/candidate/applications` - Get candidate's applications
- **POST** `/api/candidate/applications` - Apply to a job (with duplicate prevention)

### Resume Processing (Candidate Only)
- **POST** `/api/resume/upload` - Upload PDF resume (max 5MB)
- **POST** `/api/resume/process` - Process resume with AI skill extraction
- **GET** `/api/resume/[resumeId]/matches` - Get job matches for resume

### Matching Engine
- **POST** `/api/match/run` - Calculate match score between resume and job
- **GET** `/api/match/[jobId]/[candidateId]/skill-gap` - Get skill gap analysis

### Application Status Flow
```
APPLIED → SHORTLISTED → INTERVIEW → REJECTED
```

### Development/Testing Routes
- **POST** `/api/test` - Test API connectivity
- **POST** `/api/test-llm` - Test LLM integration
- **POST** `/api/test-embedding` - Test embedding generation
- **POST** `/api/test-models` - Test AI models
- **POST** `/api/test-resume-process` - Test resume processing

---

## Future Enhancements

- Skill demand forecasting
- Advanced ranking algorithm
- Bias detection module
- Resume auto-improvement assistant
- Batch resume processing

---

## Disclaimer

This system is intended as a recruitment assistance tool.
It does not replace human hiring decisions.