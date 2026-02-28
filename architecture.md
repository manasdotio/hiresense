# AI-Based Resume Screening & Skill Gap Analyzer
## System Architecture Document

---

# 1. System Overview

This system is a web-based AI-powered recruitment assistance platform.

It enables:
- HR to create job postings
- Candidates to upload resumes
- AI to extract skills
- Matching engine to calculate suitability score
- Skill gap analyzer to identify missing competencies

The system follows a layered architecture:

Frontend (Next.js UI)
↓
Backend API Layer (Next.js API Routes)
↓
Business Logic Layer
↓
AI Services Layer (LLM + Embeddings)
↓
Database Layer (PostgreSQL)

---

# 2. High-Level Architecture

Client (Browser)
    |
    v
Next.js Frontend (App Router)
    |
    v
Next.js API Routes (Backend)
    |
    +-----------------------------+
    | Business Logic Layer        |
    | - Resume Parser             |
    | - Job Parser                |
    | - Matching Engine           |
    | - Skill Gap Analyzer        |
    +-----------------------------+
    |
    +-----------------------------+
    | AI Services                 |
    | - Local LLM (Ollama)        |
    | - Embedding Model           |
    +-----------------------------+
    |
    v
PostgreSQL Database (via Prisma)

---

# 3. Architectural Layers

## 3.1 Presentation Layer
Technology: Next.js (App Router)

Responsibilities:
- User Interface
- Role-based dashboards
- Resume upload UI
- Job creation UI
- Match results display

No business logic is implemented here.

---

## 3.2 API Layer
Technology: Next.js API Routes

Responsibilities:
- Handle HTTP requests
- Authentication & Authorization
- Input validation
- Route protection

Example Routes:
- POST /api/auth/login
- POST /api/resume/upload
- POST /api/job/create
- POST /api/match/run
- GET  /api/match/:id

---

## 3.3 Business Logic Layer

### Resume Processing Service
- Extract text from uploaded PDF
- Clean and normalize text
- Store raw resume text

### Job Processing Service
- Accept job description
- Extract structured required skills

### Matching Engine (Deterministic)
- Compare candidate skills with job requirements
- Compute similarity score
- Generate match percentage

### Skill Gap Analyzer
- Identify missing required skills
- Classify weak skills
- Generate structured gap output

This layer does NOT rely on LLM for scoring.

---

## 3.4 AI Services Layer

### Local LLM (Ollama)
Used for:
- Resume skill extraction
- Job description parsing
- Feedback generation

Not used for:
- Numerical scoring
- Final hiring decisions

### Embedding Model
Used for:
- Skill normalization
- Semantic similarity matching

Cosine similarity is used for vector comparison.

---

## 3.5 Database Layer

Technology: PostgreSQL
ORM: Prisma

Core Tables:

Users
- id
- email
- password_hash
- role (HR | CANDIDATE | ADMIN)

Jobs
- id
- hr_id (FK)
- title
- description
- required_skills (JSON)

Candidates
- id
- user_id (FK)
- resume_text
- extracted_skills (JSON)

MatchResults
- id
- candidate_id (FK)
- job_id (FK)
- match_score
- missing_skills (JSON)
- created_at

---

# 4. Authentication & Authorization

Authentication:
- JWT-based session tokens

Authorization:
- Role-based middleware
- HR can create jobs
- Candidate can upload resume
- Admin can manage system

---

# 5. AI Decision Strategy

The system follows a Hybrid AI Model:

LLM → Information Extraction
Embeddings → Semantic Similarity
Deterministic Engine → Final Scoring

This ensures:
- Explainability
- Stability
- Academic defensibility

---

# 6. Scalability Considerations

Future improvements:
- Background job queues
- Caching embeddings
- Batch processing resumes
- API rate limiting

---

# 7. Ethical Boundaries

The system:
- Assists HR decisions
- Does NOT automatically hire/reject
- Provides explainable scoring

It is a decision-support tool.