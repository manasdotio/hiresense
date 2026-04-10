import { callLLM, type LLMCallConfig } from "./llm";

/**
 * Attempts to repair truncated/malformed JSON produced by local LLMs
 * that cut off before the closing brace.
 */
function tryRepairJSON(raw: string): string {
  // Quickly slice out markdown formatting if present
  let cleanRaw = raw.trim();
  const jsonMatch = cleanRaw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    cleanRaw = jsonMatch[1].trim();
  }

  try {
    JSON.parse(cleanRaw);
    return cleanRaw;
  } catch {
    // nothing
  }

  let repaired = cleanRaw.trim().replace(/,\s*$/, "");

  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (const ch of repaired) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === "\"") { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    if (ch === "}" || ch === "]") stack.pop();
  }

  while (stack.length > 0) {
    repaired += stack.pop();
  }

  return repaired;
}

export async function extractResumeData(
  rawResumeText: string,
  aiConfig?: Partial<LLMCallConfig>
) {
  const prompt = `
Extract technical skills from this resume and evaluate its overall ATS-readiness.

Rules:
1. Ignore soft skills, personality traits, and generic words.
2. If not mentioned return 0 for experience years.
3. atsScore: rate the resume (0-100) based on measurable impact, keywords, and ATS best practices.
4. atsFeedback: provide exactly 3 concise, highly-specific, and actionable tips to improve this resume. Do NOT use generic ATS tips like "add keywords" or "quantify results". You MUST reference specific exact phrases or specific missing information from the provided resume text to make the feedback unique.
5. sectionFeedback: for each section (skills, experience, projects, education), write 1 sentence of highly specific feedback citing details from the text on what is strong or weak. Write "Not found" if the section is missing.

Return strictly valid JSON:

{
  "skills": string[],
  "experienceYears": number,
  "atsScore": number,
  "atsFeedback": string[],
  "sectionFeedback": {
    "skills": string,
    "experience": string,
    "projects": string,
    "education": string
  }
}


Resume text:
${rawResumeText}
`;

  const raw = await callLLM(prompt, aiConfig);

  if (!raw) {
    throw new Error("Empty response from LLM");
  }

  try {
    const repaired = tryRepairJSON(raw);
    const parsed = JSON.parse(repaired);

    // Validate and default all expected fields
    return {
      skills: Array.isArray(parsed.skills) ? parsed.skills.filter((s: unknown) => typeof s === "string") : [],
      experienceYears: typeof parsed.experienceYears === "number" ? parsed.experienceYears : 0,
      atsScore: typeof parsed.atsScore === "number" ? parsed.atsScore : null,
      atsFeedback: Array.isArray(parsed.atsFeedback) ? parsed.atsFeedback : [],
      sectionFeedback: parsed.sectionFeedback && typeof parsed.sectionFeedback === "object"
        ? {
            skills: String(parsed.sectionFeedback.skills ?? "Not found"),
            experience: String(parsed.sectionFeedback.experience ?? "Not found"),
            projects: String(parsed.sectionFeedback.projects ?? "Not found"),
            education: String(parsed.sectionFeedback.education ?? "Not found"),
          }
        : null,
    };
  } catch {
    console.log("LLM RAW OUTPUT:", raw);
    throw new Error("Invalid JSON from LLM");
  }
}
