-- Migration: add-ats-score
-- Add standalone ATS Score and Feedback columns to the Resume table

ALTER TABLE "Resume" ADD COLUMN "atsScore" DOUBLE PRECISION;
ALTER TABLE "Resume" ADD COLUMN "atsFeedback" TEXT;
