/*
  Warnings:

  - You are about to drop the column `category` on the `Skill` table. All the data in the column will be lost.

*/
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "Skill" DROP COLUMN "category",
ADD COLUMN     "embedding" vector(768);
