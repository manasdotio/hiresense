import { callLLM } from "./llm";

export async function extractJobSkills(description: string) {
  const prompt = `
Extract only technical skills from this job description.

Rules:
- Only include programming languages, frameworks, databases, cloud, dev tools
- Exclude soft skills like communication, teamwork
- Expand MERN/MEAN into individual tech
- Separate required vs preferred
- Extract minimum years of experience as number
- If not mentioned return 0

Return strictly valid JSON:

{
  "required_skills": [],
  "preferred_skills": [],
  "minExperience": number
}

Job Description:
${description}
`;

  const response = await callLLM(prompt);

  if (!response) {
    throw new Error("Empty response from LLM");
  }

  try {
    return JSON.parse(response);
  } catch (error) {
    console.error("Invalid JSON from LLM:", response);
    throw new Error("Invalid JSON from LLM");
  }
}