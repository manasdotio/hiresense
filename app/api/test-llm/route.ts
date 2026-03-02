import { extractJobSkills } from "@/lib/jobExtractor";
import { testCases } from "@/lib/llmTestCases";

export async function GET() {
  const results = [];

  for (const test of testCases) {
    const output = await extractJobSkills(test.input);

    const skillsMatch =
      JSON.stringify(output.required_skills.sort()) ===
      JSON.stringify(test.expected.required_skills.sort());

    const expMatch = output.minExperience === test.expected.minExperience;

    results.push({
      input: test.input,
      output,
      expected: test.expected,
      skillsMatch,
      expMatch,
    });
  }

  return Response.json(results);
}