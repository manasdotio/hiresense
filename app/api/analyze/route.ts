import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractJobSkills } from "@/lib/jobExtractor";
import { ensureSkillsWithEmbeddings } from "@/lib/skillStore";
import { computeMatchFromSkills, JdSkill, MatchInput, MatchResult } from "@/lib/matchingEngine";
import {
  computeKeywordGap,
  computeSkillCoverage,
  computeAtsIssues,
  generateRuleBasedSuggestions,
  computeImprovementTrend,
} from "@/lib/analyzeUtils";

export const runtime = "nodejs";

type AnalyzeBody = {
  resumeId?: string;
  jobDescription?: string;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as AnalyzeBody;
    const resumeId = typeof body.resumeId === "string" ? body.resumeId.trim() : "";
    const jobDescription =
      typeof body.jobDescription === "string" ? body.jobDescription.trim() : "";

    if (!resumeId)
      return NextResponse.json({ error: "resumeId is required" }, { status: 400 });
    if (!jobDescription || jobDescription.length < 20)
      return NextResponse.json(
        { error: "jobDescription must be at least 20 characters" },
        { status: 400 },
      );

    // --- Auth / ownership ---
    const candidate = await prisma.candidateProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, experienceYears: true },
    });
    if (!candidate)
      return NextResponse.json({ error: "Candidate profile not found" }, { status: 404 });

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, candidateId: candidate.id },
      select: {
        id: true,
        rawText: true,
        sectionFeedback: true,
        resumeSkills: { select: { skillId: true, skill: { select: { name: true } } } },
      },
    });
    if (!resume)
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    if (resume.resumeSkills.length === 0)
      return NextResponse.json(
        { error: "Resume has not been processed yet. Please process it first." },
        { status: 400 },
      );

    // --- Step 1: Extract JD skills via LLM ---
    let jdExtracted: { required_skills?: unknown; preferred_skills?: unknown; minExperience?: unknown };
    try {
      jdExtracted = await extractJobSkills(jobDescription);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[analyze] extractJobSkills failed:", msg);
      return NextResponse.json({ error: `Failed to extract JD skills: ${msg}` }, { status: 502 });
    }

    const requiredJdSkillNames = Array.isArray(jdExtracted.required_skills) ? (jdExtracted.required_skills as string[]) : [];
    const preferredJdSkillNames = Array.isArray(jdExtracted.preferred_skills) ? (jdExtracted.preferred_skills as string[]) : [];

    if (requiredJdSkillNames.length === 0 && preferredJdSkillNames.length === 0) {
      return NextResponse.json({ error: "Could not extract any skills from the job description." }, { status: 400 });
    }

    // --- Step 2: Normalize JD skills via embeddings ---
    let normalizedRequired: { id: string; name: string }[] = [];
    let normalizedPreferred: { id: string; name: string }[] = [];

    try {
      if (requiredJdSkillNames.length > 0) {
        normalizedRequired = await ensureSkillsWithEmbeddings(requiredJdSkillNames, true);
      }
      if (preferredJdSkillNames.length > 0) {
        normalizedPreferred = await ensureSkillsWithEmbeddings(preferredJdSkillNames, true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[analyze] ensureSkillsWithEmbeddings failed:", msg);
      return NextResponse.json({ error: `Skill normalization failed: ${msg}` }, { status: 502 });
    }

    if (normalizedRequired.length === 0 && normalizedPreferred.length === 0) {
      return NextResponse.json({ error: "Could not normalize any skills from the job description." }, { status: 400 });
    }

    const jdSkills: JdSkill[] = [
      ...normalizedRequired.map((s) => ({ id: s.id, tier: "required" as const })),
      ...normalizedPreferred.map((s) => ({ id: s.id, tier: "preferred" as const })),
    ];

    // --- Step 3: Compute match score ---
    const resumeSkillIds = resume.resumeSkills.map((rs) => rs.skillId);
    const resumeSkillNames = resume.resumeSkills.map((rs) => rs.skill.name);

    const candidateExperience = typeof candidate.experienceYears === "number" ? candidate.experienceYears : undefined;
    const jdMinExperience = typeof jdExtracted.minExperience === "number" ? jdExtracted.minExperience : undefined;

    const matchInput: MatchInput = {
      resumeSkillIds,
      jdSkills,
      candidateExperience,
      jdMinExperience,
    };

    const matchResult: MatchResult = computeMatchFromSkills(matchInput);
    const score = matchResult.score;
    const missingSkillIds = matchResult.missingSkillIds;

    // --- Step 4: Fetch missing skill names and determine priority ---
    const missingSkillRecords =
      missingSkillIds.length > 0
        ? await prisma.skill.findMany({
            where: { id: { in: missingSkillIds } },
            select: { id: true, name: true },
          })
        : [];

    const missingSkillsWithPriority = missingSkillRecords.map((s) => ({
      skillId: s.id,
      skillName: s.name,
      priority: normalizedRequired.some((r) => r.id === s.id) ? "HIGH" : "MEDIUM",
    }));

    const missingHighCount = missingSkillsWithPriority.filter((s) => s.priority === "HIGH").length;
    const missingMediumCount = missingSkillsWithPriority.filter((s) => s.priority === "MEDIUM").length;

    // --- Step 5: Deterministic enrichments (NO new LLM calls) ---

    // 5a. Keyword Gap
    const { missingKeywords, keywordMatchPct } = computeKeywordGap(jobDescription, resume.rawText);

    // 5b. Skill Coverage
    const skillCoverage = computeSkillCoverage(resumeSkillNames);

    // 5c. Parse stored sectionFeedback
    let sectionFeedback: Record<string, string> | null = null;
    if (resume.sectionFeedback) {
      try {
        sectionFeedback = JSON.parse(resume.sectionFeedback) as Record<string, string>;
      } catch {
        sectionFeedback = null;
      }
    }

    // 5d. ATS Compliance Issues
    const atsIssues = computeAtsIssues(resume.rawText, resume.resumeSkills.length, sectionFeedback);

    // 5e. Rule-based suggestions (replaces the old LLM generateSuggestions)
    const suggestionsList = generateRuleBasedSuggestions({
      missingHighCount,
      missingMediumCount,
      keywordMatchPct,
      skillCoverage,
      atsIssues,
      score,
    });
    const suggestions = suggestionsList.length > 0 ? suggestionsList.join(" | ") : null;

    // 5f. Improvement Trend: fetch previous analysis for this resume
    const lastAnalysis = await prisma.resumeAnalysis.findFirst({
      where: { resumeId: resume.id },
      orderBy: { createdAt: "desc" },
      select: { score: true },
    });
    const improvementTrend = computeImprovementTrend(lastAnalysis?.score ?? null, score);

    // --- Step 6: Persist ---
    let analysis;
    try {
      analysis = await prisma.$transaction(async (tx) => {
        const jd = await tx.jobDescription.create({
          data: {
            content: jobDescription,
            minExperience: jdMinExperience,
          },
        });
        return tx.resumeAnalysis.create({
          data: {
            resumeId: resume.id,
            jobDescriptionId: jd.id,
            score,
            suggestions,
            missingKeywords: missingKeywords.length > 0 ? missingKeywords.join(" | ") : null,
            atsIssues: atsIssues.length > 0 ? atsIssues.join(" | ") : null,
            skillCoverage: JSON.stringify(skillCoverage),
            missingSkills: {
              create: missingSkillsWithPriority.map((s) => ({
                skillId: s.skillId,
                priority: s.priority,
              })),
            },
          },
        });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[analyze] DB transaction failed:", msg);
      return NextResponse.json(
        { error: `Failed to save analysis: ${msg}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      analysisId: analysis.id,
      score,
      matchPercentage: Math.round(score * 100),
      // Existing fields
      missingSkills: missingSkillsWithPriority,
      suggestions,
      breakdown: matchResult.breakdown,
      partialSkillIds: matchResult.partialSkillIds,
      // New enriched fields
      missingKeywords,
      keywordMatchPct,
      sectionFeedback,
      atsIssues,
      skillCoverage,
      improvementTrend,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[analyze] Unhandled error:", msg);
    return NextResponse.json(
      { error: `Analyze failed: ${msg}` },
      { status: 500 },
    );
  }
}
