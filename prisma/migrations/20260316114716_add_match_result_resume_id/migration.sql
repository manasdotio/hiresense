-- DropForeignKey
ALTER TABLE "MissingSkill" DROP CONSTRAINT "MissingSkill_matchResultId_fkey";

-- AlterTable
ALTER TABLE "MatchResult" ADD COLUMN     "resumeId" TEXT;

-- CreateIndex
CREATE INDEX "MatchResult_candidateId_jobId_idx" ON "MatchResult"("candidateId", "jobId");

-- CreateIndex
CREATE INDEX "MatchResult_resumeId_idx" ON "MatchResult"("resumeId");

-- AddForeignKey
ALTER TABLE "MatchResult" ADD CONSTRAINT "MatchResult_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissingSkill" ADD CONSTRAINT "MissingSkill_matchResultId_fkey" FOREIGN KEY ("matchResultId") REFERENCES "MatchResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
