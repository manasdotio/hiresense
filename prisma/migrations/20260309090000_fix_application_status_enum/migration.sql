-- Align ApplicationStatus enum with API and Prisma schema.
-- Converts legacy PENDING values to APPLIED and adds INTERVIEW.
BEGIN;

CREATE TYPE "ApplicationStatus_new" AS ENUM ('APPLIED', 'SHORTLISTED', 'INTERVIEW', 'REJECTED');

ALTER TABLE "JobApplication"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "JobApplication"
  ALTER COLUMN "status" TYPE "ApplicationStatus_new"
  USING (
    CASE
      WHEN "status"::text = 'PENDING' THEN 'APPLIED'
      WHEN "status"::text = 'SHORTLISTED' THEN 'SHORTLISTED'
      WHEN "status"::text = 'REJECTED' THEN 'REJECTED'
      ELSE 'APPLIED'
    END
  )::"ApplicationStatus_new";

ALTER TABLE "JobApplication"
  ALTER COLUMN "status" SET DEFAULT 'APPLIED';

DROP TYPE "ApplicationStatus";
ALTER TYPE "ApplicationStatus_new" RENAME TO "ApplicationStatus";

COMMIT;
