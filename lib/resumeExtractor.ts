import { callLLM } from "./llm";

export async function extractResumeData(rawResumeText: string) {
  const prompt = `
Extract only technical skills from this resume.

Rules:
Ignore soft skills.
Ignore personality traits.
Ignore generic words.
If not mentioned return 0 for experience years.

Return strictly valid JSON:

{
  "skills": string[],
  "experienceYears": number 
}

Resume text:
${rawResumeText}
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
