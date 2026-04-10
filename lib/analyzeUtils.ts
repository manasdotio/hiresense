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

// ─── 6. Score Explainability ────────────────────────────────────────────────
export type ScoreExplainabilityComponent = {
  key: "required" | "preferred" | "experience";
  label: string;
  coveragePct: number;
  contributionPct: number;
  detail: string;
};

export type ScoreExplainability = {
  finalScorePct: number;
  scoreBand: "strong" | "moderate" | "low";
  components: ScoreExplainabilityComponent[];
  highlights: string[];
};

export function buildScoreExplainability(params: {
  score: number;
  keywordMatchPct: number;
  missingHighCount: number;
  missingMediumCount: number;
  breakdown: {
    requiredWeightEarned: number;
    requiredWeightTotal: number;
    preferredWeightEarned: number;
    preferredWeightTotal: number;
    rawScore: number;
    totalWeight: number;
    experienceBonus: number;
  };
}): ScoreExplainability {
  const {
    score,
    keywordMatchPct,
    missingHighCount,
    missingMediumCount,
    breakdown,
  } = params;

  const finalScorePct = Math.round(score * 100);
  const scoreBand = finalScorePct >= 75 ? "strong" : finalScorePct >= 50 ? "moderate" : "low";

  const requiredCoveragePct =
    breakdown.requiredWeightTotal > 0
      ? Math.round((breakdown.requiredWeightEarned / breakdown.requiredWeightTotal) * 100)
      : 0;

  const preferredCoveragePct =
    breakdown.preferredWeightTotal > 0
      ? Math.round((breakdown.preferredWeightEarned / breakdown.preferredWeightTotal) * 100)
      : 0;

  const requiredContributionPct =
    breakdown.totalWeight > 0
      ? Math.round((breakdown.requiredWeightEarned / breakdown.totalWeight) * 100)
      : 0;

  const preferredContributionPct =
    breakdown.totalWeight > 0
      ? Math.round((breakdown.preferredWeightEarned / breakdown.totalWeight) * 100)
      : 0;

  // Experience contribution is capped if score hits 100.
  const effectiveExperience = Math.max(0, Math.min(score - breakdown.rawScore, breakdown.experienceBonus));
  const experienceContributionPct = Math.round(effectiveExperience * 100);

  const highlights: string[] = [];
  if (missingHighCount > 0) {
    highlights.push(`${missingHighCount} required skill(s) are currently dragging your score down the most.`);
  }
  if (missingMediumCount > 0) {
    highlights.push(`${missingMediumCount} preferred skill(s) are still available as easier score boosters.`);
  }
  if (keywordMatchPct < 60) {
    highlights.push(`Keyword overlap is ${keywordMatchPct}% - improving wording alignment can lift screening outcomes.`);
  }
  if (experienceContributionPct > 0) {
    highlights.push(`Experience contributed +${experienceContributionPct}% to your final score.`);
  }
  if (highlights.length === 0) {
    highlights.push("Your score is balanced with no obvious penalty drivers from required/preferred coverage.");
  }

  return {
    finalScorePct,
    scoreBand,
    components: [
      {
        key: "required",
        label: "Required Skills",
        coveragePct: requiredCoveragePct,
        contributionPct: requiredContributionPct,
        detail: "Highest-weight section. Missing required skills have the largest impact.",
      },
      {
        key: "preferred",
        label: "Preferred Skills",
        coveragePct: preferredCoveragePct,
        contributionPct: preferredContributionPct,
        detail: "Nice-to-have section. Gains here can improve ranking among similar candidates.",
      },
      {
        key: "experience",
        label: "Experience Bonus",
        coveragePct: breakdown.experienceBonus > 0 ? 100 : 0,
        contributionPct: experienceContributionPct,
        detail: "Applied when your years of experience meet or exceed the JD minimum.",
      },
    ],
    highlights,
  };
}

// ─── 7. Skill Learning Materials ────────────────────────────────────────────
export type LearningMaterialResource = {
  title: string;
  provider: string;
  type: "playlist" | "course" | "docs" | "guide";
  url: string;
};

export type SkillLearningMaterial = {
  skillId: string;
  skillName: string;
  priority: string;
  resources: LearningMaterialResource[];
};

type ResourceCatalogEntry = {
  keywords: string[];
  resource: LearningMaterialResource;
};

const DOC_RESOURCE_CATALOG: ResourceCatalogEntry[] = [
  { keywords: ["react"], resource: { title: "React Docs", provider: "react.dev", type: "docs", url: "https://react.dev/learn" } },
  { keywords: ["next.js", "nextjs"], resource: { title: "Next.js Learn", provider: "nextjs.org", type: "docs", url: "https://nextjs.org/learn" } },
  { keywords: ["typescript"], resource: { title: "TypeScript Handbook", provider: "typescriptlang.org", type: "docs", url: "https://www.typescriptlang.org/docs/" } },
  { keywords: ["javascript"], resource: { title: "MDN JavaScript Guide", provider: "MDN", type: "docs", url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide" } },
  { keywords: ["node.js", "nodejs"], resource: { title: "Node.js Learn", provider: "nodejs.org", type: "docs", url: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs" } },
  { keywords: ["express"], resource: { title: "Express Guide", provider: "expressjs.com", type: "docs", url: "https://expressjs.com/en/starter/installing.html" } },
  { keywords: ["python"], resource: { title: "Python Tutorial", provider: "python.org", type: "docs", url: "https://docs.python.org/3/tutorial/" } },
  { keywords: ["java"], resource: { title: "Java Learn", provider: "dev.java", type: "docs", url: "https://dev.java/learn/" } },
  { keywords: ["c#", ".net", "dotnet"], resource: { title: ".NET Learning Path", provider: "Microsoft Learn", type: "docs", url: "https://learn.microsoft.com/en-us/dotnet/" } },
  { keywords: ["sql"], resource: { title: "SQLBolt", provider: "sqlbolt.com", type: "course", url: "https://sqlbolt.com/" } },
  { keywords: ["postgres", "postgresql"], resource: { title: "PostgreSQL Tutorial", provider: "postgresql.org", type: "docs", url: "https://www.postgresql.org/docs/current/tutorial.html" } },
  { keywords: ["mysql"], resource: { title: "MySQL Tutorial", provider: "mysql.com", type: "docs", url: "https://dev.mysql.com/doc/refman/8.0/en/tutorial.html" } },
  { keywords: ["mongodb"], resource: { title: "MongoDB University", provider: "MongoDB", type: "course", url: "https://learn.mongodb.com/" } },
  { keywords: ["docker"], resource: { title: "Docker Get Started", provider: "docs.docker.com", type: "docs", url: "https://docs.docker.com/get-started/" } },
  { keywords: ["kubernetes", "k8s"], resource: { title: "Kubernetes Basics", provider: "kubernetes.io", type: "docs", url: "https://kubernetes.io/docs/tutorials/kubernetes-basics/" } },
  { keywords: ["aws"], resource: { title: "AWS Skill Builder", provider: "AWS", type: "course", url: "https://skillbuilder.aws/" } },
  { keywords: ["azure"], resource: { title: "Azure Training", provider: "Microsoft Learn", type: "course", url: "https://learn.microsoft.com/en-us/training/azure/" } },
  { keywords: ["gcp", "google cloud"], resource: { title: "Google Cloud Skills Boost", provider: "Google", type: "course", url: "https://www.cloudskillsboost.google/" } },
  { keywords: ["prisma"], resource: { title: "Prisma Docs", provider: "prisma.io", type: "docs", url: "https://www.prisma.io/docs/getting-started" } },
  { keywords: ["graphql"], resource: { title: "HowToGraphQL", provider: "HowToGraphQL", type: "course", url: "https://www.howtographql.com/" } },
];

const GUIDE_RESOURCE_CATALOG: ResourceCatalogEntry[] = [
  { keywords: ["react", "javascript", "typescript", "next.js", "nextjs"], resource: { title: "Frontend Roadmap", provider: "roadmap.sh", type: "guide", url: "https://roadmap.sh/frontend" } },
  { keywords: ["node.js", "nodejs", "express", "django", "flask", "fastapi", "spring", "rails", "graphql"], resource: { title: "Backend Roadmap", provider: "roadmap.sh", type: "guide", url: "https://roadmap.sh/backend" } },
  { keywords: ["docker", "kubernetes", "terraform", "aws", "azure", "gcp", "linux", "ci/cd"], resource: { title: "DevOps Roadmap", provider: "roadmap.sh", type: "guide", url: "https://roadmap.sh/devops" } },
  { keywords: ["sql", "postgres", "postgresql", "mysql", "mongodb", "redis"], resource: { title: "SQL Roadmap", provider: "roadmap.sh", type: "guide", url: "https://roadmap.sh/sql" } },
];

function normalizeSkillName(skillName: string): string {
  return skillName.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").replace(/\s+/g, " ").trim();
}

function getPriorityRank(priority: string): number {
  if (priority === "HIGH") return 0;
  if (priority === "MEDIUM") return 1;
  return 2;
}

function findCatalogResource(
  skillName: string,
  catalog: ResourceCatalogEntry[]
): LearningMaterialResource | undefined {
  const normalized = normalizeSkillName(skillName);
  return catalog.find((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword) || keyword.includes(normalized))
  )?.resource;
}

function dedupeResources(resources: LearningMaterialResource[]): LearningMaterialResource[] {
  const seen = new Set<string>();
  const unique: LearningMaterialResource[] = [];

  for (const resource of resources) {
    if (seen.has(resource.url)) continue;
    seen.add(resource.url);
    unique.push(resource);
  }

  return unique;
}

export function buildSkillLearningMaterials(params: {
  missingSkills: Array<{ skillId: string; skillName: string; priority: string }>;
  maxSkills?: number;
  maxResourcesPerSkill?: number;
}): SkillLearningMaterial[] {
  const { missingSkills, maxSkills = 8, maxResourcesPerSkill = 4 } = params;

  const seenSkills = new Set<string>();
  const uniqueSortedSkills = missingSkills
    .filter((skill) => {
      const normalized = normalizeSkillName(skill.skillName);
      if (!normalized || seenSkills.has(normalized)) return false;
      seenSkills.add(normalized);
      return true;
    })
    .sort((a, b) => {
      const rankDiff = getPriorityRank(a.priority) - getPriorityRank(b.priority);
      if (rankDiff !== 0) return rankDiff;
      return a.skillName.localeCompare(b.skillName);
    })
    .slice(0, maxSkills);

  return uniqueSortedSkills.map((skill) => {
    const docsResource =
      findCatalogResource(skill.skillName, DOC_RESOURCE_CATALOG) ??
      {
        title: `${skill.skillName} Official Docs`,
        provider: "Web Search",
        type: "docs" as const,
        url: `https://duckduckgo.com/?q=${encodeURIComponent(`${skill.skillName} official documentation`)}`,
      };

    const guideResource =
      findCatalogResource(skill.skillName, GUIDE_RESOURCE_CATALOG) ??
      {
        title: `${skill.skillName} Learning Path`,
        provider: "roadmap.sh",
        type: "guide" as const,
        url: "https://roadmap.sh",
      };

    const youtubeResource: LearningMaterialResource = {
      title: `${skill.skillName} YouTube Playlists`,
      provider: "YouTube",
      type: "playlist",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${skill.skillName} full course playlist`)}`,
    };

    const freeCourseResource: LearningMaterialResource = {
      title: `${skill.skillName} Free Course Search`,
      provider: "Class Central",
      type: "course",
      url: `https://www.classcentral.com/search?q=${encodeURIComponent(skill.skillName)}`,
    };

    const resources = dedupeResources([
      docsResource,
      guideResource,
      youtubeResource,
      freeCourseResource,
    ]).slice(0, maxResourcesPerSkill);

    return {
      skillId: skill.skillId,
      skillName: skill.skillName,
      priority: skill.priority,
      resources,
    };
  });
}
