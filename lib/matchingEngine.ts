/**
 * matchingEngine.ts
 *
 * Computes a weighted match score between resume skills and JD skills.
 *
 * Key improvements over v1:
 *  1. Tiered weights  — required skills (weight 3) outweigh preferred (weight 1),
 *     so a resume missing core skills is penalised more than one missing nice-to-haves.
 *  2. Partial credit  — when a skill is missing from the resume we check its
 *     `similarityScore` (0-1, provided by the embedding layer). If the nearest
 *     resume skill is above PARTIAL_CREDIT_THRESHOLD we award proportional credit
 *     instead of a hard 0, so "ReactJS" on the resume partially satisfies "React".
 *  3. Experience bonus — if the candidate meets/exceeds the JD minimum experience
 *     requirement we add a small flat bonus (capped so it never dominates).
 *  4. Normalised output — final score is always in [0, 1].
 */

const REQUIRED_WEIGHT = 3;
const PREFERRED_WEIGHT = 1;
const PARTIAL_CREDIT_THRESHOLD = 0.72;
const EXPERIENCE_BONUS_MAX = 0.05;

export type SkillTier = "required" | "preferred";

export interface JdSkill {
  id: string;
  tier: SkillTier;
  resumeSimilarity?: number;
}

export interface MatchInput {
  resumeSkillIds: string[];
  jdSkills: JdSkill[];
  candidateExperience?: number;
  jdMinExperience?: number;
}

export interface MatchResult {
  score: number;
  missingSkillIds: string[];
  partialSkillIds: string[];
  breakdown: {
    requiredMatched: number;
    requiredTotal: number;
    preferredMatched: number;
    preferredTotal: number;
    requiredWeightEarned: number;
    requiredWeightTotal: number;
    preferredWeightEarned: number;
    preferredWeightTotal: number;
    rawScore: number;
    totalWeight: number;
    experienceBonus: number;
  };
}

export function computeMatchFromSkills(input: MatchInput): MatchResult {
  const { resumeSkillIds, jdSkills, candidateExperience, jdMinExperience } = input;

  // Empty JD → nothing to match against
  if (jdSkills.length === 0) {
    return {
      score: 0,
      missingSkillIds: [],
      partialSkillIds: [],
      breakdown: {
        requiredMatched: 0,
        requiredTotal: 0,
        preferredMatched: 0,
        preferredTotal: 0,
        requiredWeightEarned: 0,
        requiredWeightTotal: 0,
        preferredWeightEarned: 0,
        preferredWeightTotal: 0,
        rawScore: 0,
        totalWeight: 0,
        experienceBonus: 0,
      },
    };
  }

  const resumeSet = new Set(resumeSkillIds);

  let totalWeight = 0;
  let earnedWeight = 0;

  const missingSkillIds: string[] = [];
  const partialSkillIds: string[] = [];

  let requiredMatched = 0;
  let requiredTotal = 0;
  let preferredMatched = 0;
  let preferredTotal = 0;
  let requiredWeightEarned = 0;
  let requiredWeightTotal = 0;
  let preferredWeightEarned = 0;
  let preferredWeightTotal = 0;

  for (const skill of jdSkills) {
    const weight = skill.tier === "required" ? REQUIRED_WEIGHT : PREFERRED_WEIGHT;
    totalWeight += weight;

    if (skill.tier === "required") {
      requiredTotal++;
      requiredWeightTotal += weight;
    } else {
      preferredTotal++;
      preferredWeightTotal += weight;
    }

    if (resumeSet.has(skill.id)) {
      // Exact match
      earnedWeight += weight;
      if (skill.tier === "required") {
        requiredMatched++;
        requiredWeightEarned += weight;
      } else {
        preferredMatched++;
        preferredWeightEarned += weight;
      }
      continue;
    }

    // Partial match checks
    const sim = skill.resumeSimilarity ?? 0;

    if (sim >= PARTIAL_CREDIT_THRESHOLD) {
      const credit = ((sim - PARTIAL_CREDIT_THRESHOLD) / (1 - PARTIAL_CREDIT_THRESHOLD)) * weight;
      earnedWeight += credit;
      partialSkillIds.push(skill.id);

      if (skill.tier === "required") {
        requiredWeightEarned += credit;
      } else {
        preferredWeightEarned += credit;
      }

      if (credit / weight > 0.5) {
        if (skill.tier === "required") requiredMatched++;
        else preferredMatched++;
      }
    } else {
      missingSkillIds.push(skill.id);
    }
  }

  const rawScore = totalWeight === 0 ? 0 : earnedWeight / totalWeight;

  let experienceBonus = 0;
  if (typeof candidateExperience === "number" && typeof jdMinExperience === "number" && jdMinExperience > 0) {
    if (candidateExperience >= jdMinExperience) {
      const overshoot = Math.min((candidateExperience - jdMinExperience) / jdMinExperience, 1);
      experienceBonus = EXPERIENCE_BONUS_MAX * (0.5 + 0.5 * overshoot);
    }
  }

  const score = Math.min(rawScore + experienceBonus, 1);

  return {
    score,
    missingSkillIds,
    partialSkillIds,
    breakdown: {
      requiredMatched,
      requiredTotal,
      preferredMatched,
      preferredTotal,
      requiredWeightEarned,
      requiredWeightTotal,
      preferredWeightEarned,
      preferredWeightTotal,
      rawScore,
      totalWeight,
      experienceBonus,
    },
  };
}