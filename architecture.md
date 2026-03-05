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

### Authentication & User Management
- **POST** `/api/auth/register` - User registration with role assignment
- **All** `/api/auth/[...nextauth]` - NextAuth.js authentication handlers (login/logout/session)

### Job Management (HR Only)
- **POST** `/api/jobs` - Create job posting with AI-powered skill extraction
- **GET** `/api/jobs/[jobId]/candidates` - Get ranked candidate list with match scores
- **PATCH** `/api/jobs/[jobId]/candidates/[candidateId]/status` - Update application status (APPLIED → SHORTLISTED → INTERVIEW → REJECTED)

### Candidate Operations
- **GET** `/api/candidate/applications` - Retrieve candidate's job applications
- **POST** `/api/candidate/applications` - Apply to job with duplicate prevention

### Resume Processing (Candidate Only)
- **POST** `/api/resume/upload` - Upload PDF resume (max 5MB, PDF only)
- **POST** `/api/resume/process` - AI-powered resume analysis and skill extraction
- **GET** `/api/resume/[resumeId]/matches` - Get job matches for specific resume

### Matching & Analysis Engine
- **POST** `/api/match/run` - Calculate compatibility score between resume and job
- **GET** `/api/match/[jobId]/[candidateId]/skill-gap` - Detailed skill gap analysis

### Development & Testing
- **POST** `/api/test` - API connectivity verification
- **POST** `/api/test-llm` - LLM integration testing
- **POST** `/api/test-embedding` - Embedding model testing
- **POST** `/api/test-models` - AI model performance testing
- **POST** `/api/test-resume-process` - Resume processing pipeline testing

### Security & Authorization
```
Public Routes: /api/auth/*, /api/test*
HR Only: /api/jobs/*, /api/jobs/[jobId]/candidates/*
Candidate Only: /api/resume/*, /api/candidate/*
Authenticated: /api/match/*
```

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

### Database Schema (Updated)

Technology: PostgreSQL
ORM: Prisma

Core Tables:

**Users**
- id, email, password, role (HR | CANDIDATE | ADMIN)
- fullname, username, createdAt

**Jobs**
- id, hrId (FK), title, description
- minExperience, createdAt
- Relations: JobSkills[], MatchResults[], JobApplications[]

**CandidateProfiles**
- id, userId (FK), experienceYears
- Relations: Resumes[], MatchResults[], JobApplications[]

**Resumes**
- id, candidateId (FK), rawText, extractedAt
- Relations: ResumeSkills[]

**Skills** (with Embeddings)
- id, name (unique), embedding (vector(768))
- Relations: JobSkills[], ResumeSkills[], MissingSkills[]

**JobSkills**
- id, jobId (FK), skillId (FK)
- weight, required (boolean)

**ResumeSkills**
- id, resumeId (FK), skillId (FK)
- confidence (AI confidence score)

**MatchResults**
- id, candidateId (FK), jobId (FK)
- score, createdAt
- Relations: MissingSkills[] (cascade delete)

**JobApplications**
- id, jobId (FK), candidateId (FK)
- status (APPLIED | SHORTLISTED | INTERVIEW | REJECTED)
- note, createdAt, updatedAt
- Unique constraint: [jobId, candidateId]

**MissingSkills**
- id, matchResultId (FK), skillId (FK)
- priority (HIGH | MEDIUM | LOW)

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

# 6. Detailed AI Workflow

## Resume Processing Pipeline
1. **Upload**: PDF file validation (5MB max)
2. **Text Extraction**: Convert PDF to raw text
3. **LLM Analysis**: Extract structured skills using local LLM
4. **Skill Normalization**: Create/find embeddings for extracted skills
5. **Storage**: Save resume text and linked skills

## Job Processing Pipeline
1. **Input**: Job title and description
2. **LLM Analysis**: Extract required/preferred skills
3. **Skill Weights**: Assign importance to each skill
4. **Embedding Generation**: Create skill embeddings
5. **Storage**: Save job with linked skills

## Matching Algorithm
```
for each candidate_skill:
  for each job_skill:
    similarity = cosine_similarity(candidate_embedding, job_embedding)
    if similarity > threshold:
      skills_matched += job_skill.weight

match_score = skills_matched / total_job_skills_weight
missing_skills = job_skills - matched_skills
```

## Skill Gap Analysis
1. **Identify Missing**: Required skills not found in candidate
2. **Prioritize**: HIGH (required), MEDIUM (preferred), LOW (optional)
3. **Recommend**: Suggest specific skills to learn
4. **Explain**: Provide context for skill importance

---

# 7. Scalability Considerations

## Current Implementation
- Synchronous API processing
- In-memory LLM inference
- Direct database connections
- File system storage

## Future Enhancements
- **Background Processing**: Job queues for resume/job processing
- **Caching**: Redis for embeddings and match results
- **Batch Processing**: Bulk resume analysis
- **API Rate Limiting**: Prevent abuse
- **CDN**: File storage optimization
- **Microservices**: Separate AI services
- **Load Balancing**: Multiple AI model instances

## Performance Metrics
- Resume processing: ~2-5 seconds
- Job analysis: ~1-3 seconds  
- Matching: ~100ms per candidate
- Skill gap analysis: ~50ms

---

# 8. Ethical Boundaries & Compliance

## System Philosophy
The system operates as a **decision-support tool**, not an automated hiring system.

## Ethical Guidelines
- **Human Oversight**: All hiring decisions require HR approval
- **Transparency**: Explainable AI scoring methodology
- **Bias Mitigation**: Skills-based matching reduces demographic bias
- **Data Privacy**: Encrypted storage, minimal data collection
- **Right to Explanation**: Candidates can understand their scores

## Application Status Flow
```
APPLIED → SHORTLISTED → INTERVIEW → REJECTED
   ↓         ↓            ↓          ↓
Auto      Manual       Manual    Manual
(System)   (HR)         (HR)      (HR)
```

## Compliance Features
- **GDPR Ready**: Data export/deletion capabilities
- **Audit Trail**: All matching decisions logged
- **Version Control**: Algorithm changes tracked
- **Bias Monitoring**: Score distribution analysis

---

# 9. Deployment Architecture

## Development Environment
- Local LLM (Ollama)
- PostgreSQL (local/Neon)
- Next.js development server

## Production Considerations
- **Frontend**: Vercel/Netlify deployment
- **Database**: Neon PostgreSQL (production)
- **AI Models**: Docker containers or cloud AI services
- **File Storage**: AWS S3 or similar
- **Monitoring**: Application performance monitoring
- **Backup**: Regular database backups
- **Security**: SSL certificates, environment variable protection

## Environment Variables
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
OPENAI_BASE_URL=http://localhost:1234/v1
EMBEDDING_MODEL=sentence-transformers/...
```