/*
  Warnings:

  - You are about to drop the column `embeddingJson` on the `Skill` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Skill" DROP COLUMN "embeddingJson",
ADD COLUMN     "embedding" vector(768);
