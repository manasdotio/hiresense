/*
  Warnings:

  - You are about to drop the column `embedding` on the `Skill` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Skill" DROP COLUMN "embedding",
ADD COLUMN     "embeddingJson" JSONB;
