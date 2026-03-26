/**
 * jobExtractor.ts
 *
 * Extracts structured skill requirements from raw job description text.
 *
 * Key improvements over v1:
 *  1. Fixed tryRepairJSON — v1 popped the stack unconditionally on } / ], which
 *     silently accepted mismatched brackets. The fix checks the top of the stack
 *     before popping so corrupt JSON surfaces as an error instead of garbage data.
 *  2. Prompt now asks the LLM to expand acronyms (MERN, MEAN, CI/CD) into
 *     individual technology names AND normalise casing ("reactjs" → "React").
 *     This means fewer duplicate skills created downstream.
 *  3. Response is extracted from the first {...} block in the LLM output so
 *     models that add a preamble ("Sure! Here is the JSON: ...") don't break
 *     the parser.
 *  4. Schema validation — after parsing we verify required array fields are
 *     present so callers get a clear error instead of a runtime crash later.
 */

import { callLLM } from "./llm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractedSkills {
  required_skills: string[];
  preferred_skills: string[];
  minExperience: number;
}

// ---------------------------------------------------------------------------
// JSON repair — fixed bracket-matching logic
// ---------------------------------------------------------------------------

function tryRepairJSON(raw: string): string {
  // Fast path: already valid
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    // fall through to repair
  }

  // Strip anything before the first { or [ so LLM preamble text is removed
  const firstBrace = raw.search(/[{[]/);
  let repaired = firstBrace === -1 ? raw : raw.slice(firstBrace);
  repaired = repaired.trim();

  // Remove trailing commas before a closing bracket/brace
  repaired = repaired.replace(/,(\s*[}\]])/g, "$1");

  // Walk the string and build a closing-tag stack
  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (const ch of repaired) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === "{") { stack.push("}"); continue; }
    if (ch === "[") { stack.push("]"); continue; }

    if (ch === "}" || ch === "]") {
      // FIX: only pop when the closer matches the most recent opener.
      // v1 popped unconditionally, which allowed e.g. [} to appear valid.
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
      }
      // If it doesn't match we leave the stack intact — the appended closers
      // below will still close any genuinely unclosed openers.
    }
  }

  // Append missing closers in reverse order
  while (stack.length > 0) {
    repaired += stack.pop();
  }

  return repaired;
}

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

function validateExtractedSkills(parsed: unknown): ExtractedSkills {
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("LLM response is not a JSON object");
  }

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.required_skills)) {
    throw new Error("Missing required_skills array in LLM response");
  }
  if (!Array.isArray(obj.preferred_skills)) {
    throw new Error("Missing preferred_skills array in LLM response");
  }

  const minExperience = typeof obj.minExperience === "number" ? obj.minExperience : 0;

  // Sanitise: keep only non-empty strings, strip accidental numbers/objects
  const clean = (arr: unknown[]): string[] =>
    arr
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((s) => s.trim());

  return {
    required_skills: clean(obj.required_skills),
    preferred_skills: clean(obj.preferred_skills),
    minExperience,
  };
}

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function buildPrompt(description: string): string {
  return `
You are a technical recruiter assistant. Extract technical skill requirements from the job description below.

Rules:
- Include only technical skills: programming languages, frameworks, libraries, databases, cloud services, and developer tools.
- Exclude all soft skills (communication, leadership, teamwork, etc.).
- Expand stack acronyms into individual technologies:
    MERN → MongoDB, Express.js, React, Node.js
    MEAN → MongoDB, Express.js, Angular, Node.js
    LAMP → Linux, Apache, MySQL, PHP
- Normalise casing to the canonical name: "reactjs" → "React", "nodejs" → "Node.js", "postgres" → "PostgreSQL".
- Do NOT duplicate a skill across required and preferred lists.
- Extract the minimum years of experience as a number (0 if not mentioned).

Return ONLY a single valid JSON object — no markdown, no explanation, no extra text:

{
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill3"],
  "minExperience": 3
}

Job Description:
${description}
`.trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function extractJobSkills(description: string): Promise<ExtractedSkills> {
  if (!description.trim()) {
    throw new Error("Job description is empty");
  }

  const response = await callLLM(buildPrompt(description));

  if (!response) {
    throw new Error("Empty response from LLM");
  }

  let parsed: unknown;

  try {
    const repaired = tryRepairJSON(response);
    parsed = JSON.parse(repaired);
  } catch (error) {
    console.error("[extractJobSkills] Invalid JSON from LLM:", response);
    throw new Error("LLM returned malformed JSON. Raw response logged to console.");
  }

  return validateExtractedSkills(parsed);
}