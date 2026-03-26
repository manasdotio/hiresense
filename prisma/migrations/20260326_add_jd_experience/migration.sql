-- Migration: add-jd-min-experience
ALTER TABLE "JobDescription" ADD COLUMN "minExperience" DOUBLE PRECISION;
