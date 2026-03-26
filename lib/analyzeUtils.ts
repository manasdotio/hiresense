/**
 * analyzeUtils.ts
 *
 * Pure, deterministic helpers for the enhanced /api/analyze pipeline.
 * No LLM calls. No DB calls. No side effects.
 */

// ─── Stop-words (excluded from keyword analysis) ──────────────────────────────
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "is","are","was","were","be","been","being","have","has","had","do","does",
  "did","will","would","could","should","may","might","shall","can","need",
  "we","you","they","he","she","it","this","that","these","those","our","your",
  "their","its","us","as","by","from","up","about","into","through","during",
  "before","after","above","below","between","out","off","over","under","again",
  "further","then","once","here","there","when","where","why","how","all","both",
  "each","more","most","other","some","such","no","nor","not","only","own","same",
  "so","than","too","very","just","because","while","although","however","therefore",
  "candidates","candidate","team","work","strong","excellent","ability","experience",
  "job","role","responsibilities","requirements","looking","preferred","required",
  "working","including","within","across","using","well","also","must","good","great",
]);

// ─── Skill Category Map ───────────────────────────────────────────────────────
const SKILL_CATEGORIES: Record<string, string[]> = {
  backend: [
    "node.js","nodejs","express","express.js","django","flask","fastapi","spring",
    "spring boot","rails","ruby on rails","laravel","php","go","golang","rust",
    "java","python","c#",".net","asp.net","nestjs","grpc","graphql","rest","api",
  ],
  database: [
    "postgresql","postgres","mysql","sqlite","mongodb","redis","elasticsearch",
    "cassandra","dynamodb","firestore","sql","nosql","prisma","sequelize","mongoose",
    "supabase","cockroachdb","planetscale","neon","mariadb",
  ],
  devops: [
    "docker","kubernetes","k8s","ci/cd","github actions","gitlab ci","jenkins",
    "terraform","ansible","helm","prometheus","grafana","linux","bash","shell",
    "nginx","apache","vagrant","puppet","chef","circleci",
  ],
  cloud: [
    "aws","amazon web services","azure","gcp","google cloud","firebase","vercel",
    "netlify","heroku","cloudflare","s3","ec2","lambda","ecs","eks","rds","sqs",
    "sns","iam","cloud functions","cloud run","bigquery",
  ],
};

// ─── Tokenize text ────────────────────────────────────────────────────────────
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s.#+]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

// ─── 1. Keyword Gap Analysis ──────────────────────────────────────────────────
export function computeKeywordGap(
  jdText: string,
  resumeText: string
): { missingKeywords: string[]; keywordMatchPct: number } {
  const jdTokens = tokenize(jdText);
  const resumeTokens = tokenize(resumeText);

  const missing: string[] = [];
  let matched = 0;

  for (const kw of jdTokens) {
    if (resumeTokens.has(kw)) {
      matched++;
    } else {
      missing.push(kw);
    }
  }

  const total = jdTokens.size;
  const keywordMatchPct = total === 0 ? 100 : Math.round((matched / total) * 100);

  // Return top 15 most impactful missing keywords (shortest words are usually noisier)
  const sortedMissing = missing.sort((a, b) => b.length - a.length).slice(0, 15);

  return { missingKeywords: sortedMissing, keywordMatchPct };
}

// ─── 2. Skill Category Coverage ───────────────────────────────────────────────
export type CoverageLevel = "strong" | "weak" | "missing";
export type SkillCoverage = {
  backend: CoverageLevel;
  database: CoverageLevel;
  devops: CoverageLevel;
  cloud: CoverageLevel;
};

export function computeSkillCoverage(skillNames: string[]): SkillCoverage {
  const normalized = skillNames.map((s) => s.toLowerCase());

  function scoreCategory(categorySkills: string[]): CoverageLevel {
    const matched = categorySkills.filter((s) => normalized.some((r) => r.includes(s) || s.includes(r)));
    if (matched.length === 0) return "missing";
    if (matched.length >= 3) return "strong";
    return "weak";
  }

  return {
    backend: scoreCategory(SKILL_CATEGORIES.backend),
    database: scoreCategory(SKILL_CATEGORIES.database),
    devops: scoreCategory(SKILL_CATEGORIES.devops),
    cloud: scoreCategory(SKILL_CATEGORIES.cloud),
  };
}

// ─── 3. ATS Compliance Issues ─────────────────────────────────────────────────
export function computeAtsIssues(
  resumeText: string,
  resumeSkillsCount: number,
  sectionFeedback: Record<string, string> | null
): string[] {
  const issues: string[] = [];

  // Check raw text length
  const wordCount = resumeText.trim().split(/\s+/).length;
  if (wordCount < 200) {
    issues.push("Resume text is very short (under 200 words) — ATS systems may discard it.");
  }

  // Check skills section
  if (resumeSkillsCount === 0) {
    issues.push("No technical skills were extracted — ensure a clear Skills section exists.");
  } else if (resumeSkillsCount < 5) {
    issues.push("Very few skills detected — consider expanding your Skills section.");
  }

  // Check section presence
  if (sectionFeedback) {
    if (!sectionFeedback.projects || sectionFeedback.projects.length < 10) {
      issues.push("Projects section appears weak or missing — add 2–3 technical projects.");
    }
    if (!sectionFeedback.experience || sectionFeedback.experience.length < 10) {
      issues.push("Experience section appears weak — include measurable impact and dates.");
    }
  } else {
    issues.push("Resume sections could not be analyzed — ensure the resume is fully processed.");
  }

  // Keyword density check
  const uniqueWords = new Set(resumeText.toLowerCase().split(/\s+/));
  if (uniqueWords.size < 80) {
    issues.push("Low keyword diversity — use varied, role-specific terminology throughout.");
  }

  return issues;
}

// ─── 4. Rule-Based Suggestions ────────────────────────────────────────────────
export function generateRuleBasedSuggestions(params: {
  missingHighCount: number;
  missingMediumCount: number;
  keywordMatchPct: number;
  skillCoverage: SkillCoverage;
  atsIssues: string[];
  score: number;
}): string[] {
  const { missingHighCount, missingMediumCount, keywordMatchPct, skillCoverage, score } = params;
  const tips: string[] = [];

  // Core skills gap
  if (missingHighCount > 2) {
    tips.push(`You are missing ${missingHighCount} required skills — prioritize learning these before applying.`);
  } else if (missingHighCount === 1 || missingHighCount === 2) {
    tips.push(`Close the gap on ${missingHighCount} required skill(s) to significantly improve your match.`);
  }

  // Keyword alignment
  if (keywordMatchPct < 40) {
    tips.push("Your resume has low keyword overlap with the JD — mirror key phrases from the job description.");
  } else if (keywordMatchPct < 60) {
    tips.push("Improve keyword alignment by incorporating more role-specific terminology from the JD.");
  }

  // Preferred skills
  if (missingMediumCount > 3) {
    tips.push(`You are missing ${missingMediumCount} preferred skills — picking up 1–2 would boost your profile.`);
  }

  // Category-specific gaps
  if (skillCoverage.devops === "missing") {
    tips.push("No DevOps skills detected — basic Docker/CI skills are expected for most modern engineering roles.");
  }
  if (skillCoverage.cloud === "missing") {
    tips.push("No cloud platform exposure found — familiarize yourself with AWS, GCP, or Azure fundamentals.");
  }
  if (skillCoverage.database === "missing") {
    tips.push("No database skills detected — ensure SQL or NoSQL experience is clearly listed.");
  }

  // Overall score
  if (score < 0.4) {
    tips.push("Your overall match is below 40% — consider targeting roles better aligned with your current skill set.");
  }

  // Never return more than 5
  return tips.slice(0, 5);
}

// ─── 5. Improvement Trend ─────────────────────────────────────────────────────
export function computeImprovementTrend(
  previousScore: number | null,
  currentScore: number
): { previousScore: number | null; currentScore: number; improvement: number | null } {
  if (previousScore === null) {
    return { previousScore: null, currentScore: Math.round(currentScore * 100), improvement: null };
  }
  return {
    previousScore: Math.round(previousScore * 100),
    currentScore: Math.round(currentScore * 100),
    improvement: Math.round((currentScore - previousScore) * 100),
  };
}
