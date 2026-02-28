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

npx prisma migrate dev

---

### 5. Run Development Server

npm run dev

---

## Project Structure

/app
  /api
  /dashboard
/lib
/services
/prisma
  schema.prisma

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