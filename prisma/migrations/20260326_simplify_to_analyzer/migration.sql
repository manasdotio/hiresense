-- Migration: simplify-to-analyzer
-- Drop all HR/Job/Application tables and add new analyzer tables

-- 1. Drop tables that depend on others first (children before parents)
DROP TABLE IF EXISTS "MissingSkill" CASCADE;
DROP TABLE IF EXISTS "JobApplication" CASCADE;
DROP TABLE IF EXISTS "MatchResult" CASCADE;
DROP TABLE IF EXISTS "JobSkill" CASCADE;
DROP TABLE IF EXISTS "Job" CASCADE;
DROP TABLE IF EXISTS "HRProfile" CASCADE;

-- 2. Drop old enums
DROP TYPE IF EXISTS "ApplicationStatus";

-- 3. Remove HR from Role enum by recreating it (if HR still exists)
-- Check if the enum already has HR removed (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'HR'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
  ) THEN
    -- Rename old enum, create new, update column, drop old
    ALTER TYPE "Role" RENAME TO "Role_old";
    CREATE TYPE "Role" AS ENUM ('CANDIDATE', 'ADMIN');
    ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::text::"Role";
    DROP TYPE "Role_old";
  END IF;
END$$;

-- 4. Remove hrProfile relation column from User (already gone if HRProfile dropped)
-- Prisma handles this via the relation, no extra column needed.

-- 5. Remove matches and applications columns from CandidateProfile
-- These are relation-only in Prisma (no physical FK columns on CandidateProfile side), already gone.

-- 6. Create JobDescription table
CREATE TABLE IF NOT EXISTS "JobDescription" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobDescription_pkey" PRIMARY KEY ("id")
);

-- 7. Create ResumeAnalysis table
CREATE TABLE IF NOT EXISTS "ResumeAnalysis" (
    "id" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "jobDescriptionId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "suggestions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResumeAnalysis_pkey" PRIMARY KEY ("id")
);

-- 8. Create the new MissingSkill table (references ResumeAnalysis, not MatchResult)
CREATE TABLE IF NOT EXISTS "MissingSkill" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "priority" TEXT,
    CONSTRAINT "MissingSkill_pkey" PRIMARY KEY ("id")
);

-- 9. Add foreign keys
ALTER TABLE "ResumeAnalysis"
    ADD CONSTRAINT "ResumeAnalysis_resumeId_fkey"
    FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ResumeAnalysis"
    ADD CONSTRAINT "ResumeAnalysis_jobDescriptionId_fkey"
    FOREIGN KEY ("jobDescriptionId") REFERENCES "JobDescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MissingSkill"
    ADD CONSTRAINT "MissingSkill_analysisId_fkey"
    FOREIGN KEY ("analysisId") REFERENCES "ResumeAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MissingSkill"
    ADD CONSTRAINT "MissingSkill_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
