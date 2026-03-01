import { extractJobSkills } from "@/lib/jobExtractor";

export async function GET() {
  const test = await extractJobSkills(
    "Looking for Node.js backend developer with PostgreSQL and Docker experience."
  );

  console.log("Extracted Skills:", test);
  return (Response.json(test));
}