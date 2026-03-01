import { callLLM } from "./llm";


export async function extractJobSkills(description: string) {
  const prompt = `
Extract only technical skills from this job description.

Return strictly in this format:

{
  "required_skills": [],
  "preferred_skills": [],
}

Do not include explanations.
Do not include markdown.
Do not include text outside JSON.

Job Description:
${description}
`;

  const raw = await callLLM(prompt);

  if (!raw) {
    throw new Error("Empty response from LLM");
  }

  try {
    return JSON.parse(raw);
  } catch {
    console.log("LLM RAW OUTPUT:", raw);
    throw new Error("Invalid JSON from LLM");
  }
}