import { extractJobSkills } from "@/lib/jobExtractor";

export async function GET() {
  const test = await extractJobSkills(
    `
  We want a hardworking team player with good communication skills.
Must know Java, Spring Boot, and Hibernate. 5+ years experience.
    `,
  );

  console.log("Extracted Skills:", test);
  return Response.json(test);
}
