import { prisma } from "../lib/prisma";
import "dotenv/config";


async function clearData() {
  console.log("Clearing data (keeping User, CandidateProfile, Skill)...\n");

  const missingSkills = await prisma.missingSkill.deleteMany({});
  console.log(`✓ MissingSkill:    ${missingSkills.count} rows deleted`);

  const analyses = await prisma.resumeAnalysis.deleteMany({});
  console.log(`✓ ResumeAnalysis:  ${analyses.count} rows deleted`);

  const jds = await prisma.jobDescription.deleteMany({});
  console.log(`✓ JobDescription:  ${jds.count} rows deleted`);

  const resumeSkills = await prisma.resumeSkill.deleteMany({});
  console.log(`✓ ResumeSkill:     ${resumeSkills.count} rows deleted`);

  const resumes = await prisma.resume.deleteMany({});
  console.log(`✓ Resume:          ${resumes.count} rows deleted`);

  console.log("\nDone. Users, CandidateProfiles, and Skills are untouched.");
}

clearData()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
