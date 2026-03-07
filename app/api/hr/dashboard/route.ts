import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ApplicationStatusKey = "APPLIED" | "SHORTLISTED" | "INTERVIEW" | "REJECTED";
type StatusCounts = Record<ApplicationStatusKey, number>;

function emptyStatusCounts(): StatusCounts {
  return {
    APPLIED: 0,
    SHORTLISTED: 0,
    INTERVIEW: 0,
    REJECTED: 0,
  };
}

function toPercentage(score: number | null | undefined): number {
  return Number(((score ?? 0) * 100).toFixed(2));
}

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function isApplicationStatus(value: string): value is ApplicationStatusKey {
  return (
    value === "APPLIED" ||
    value === "SHORTLISTED" ||
    value === "INTERVIEW" ||
    value === "REJECTED"
  );
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "HR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hrProfile = await prisma.hRProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!hrProfile) {
      return NextResponse.json({ error: "HR profile not found" }, { status: 404 });
    }

    const sevenDaysAgo = daysAgo(7);

    // Run independent DB calls together for better latency.
    const [
      jobs,
      totalApplications,
      totalMatches,
      matchedCandidates,
      avgScoreResult,
      funnelRows,
      matchRows,
      statusRows,
      latestStatusRows,
      missingSkillRows,
      jobsLast7Days,
      applicationsLast7Days,
      matchesLast7Days,
    ] = await Promise.all([
      prisma.job.findMany({
        where: { hrId: hrProfile.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          createdAt: true,
          minExperience: true,
          jobSkills: {
            select: { required: true },
          },
        },
      }),
      prisma.jobApplication.count({
        where: { job: { hrId: hrProfile.id } },
      }),
      prisma.matchResult.count({
        where: { job: { hrId: hrProfile.id } },
      }),
      prisma.matchResult.findMany({
        where: { job: { hrId: hrProfile.id } },
        distinct: ["candidateId"],
        select: { candidateId: true },
      }),
      prisma.matchResult.aggregate({
        where: { job: { hrId: hrProfile.id } },
        _avg: { score: true },
      }),
      prisma.jobApplication.groupBy({
        by: ["status"],
        where: { job: { hrId: hrProfile.id } },
        _count: { _all: true },
      }),
      prisma.matchResult.groupBy({
        by: ["jobId"],
        where: { job: { hrId: hrProfile.id } },
        _avg: { score: true },
        _max: { score: true },
        _count: { _all: true },
      }),
      prisma.jobApplication.groupBy({
        by: ["jobId", "status"],
        where: { job: { hrId: hrProfile.id } },
        _count: { _all: true },
      }),
      prisma.jobApplication.groupBy({
        by: ["jobId"],
        where: { job: { hrId: hrProfile.id } },
        _max: { updatedAt: true },
      }),
      prisma.missingSkill.groupBy({
        by: ["skillId", "priority"],
        where: {
          matchResult: {
            job: {
              hrId: hrProfile.id,
            },
          },
        },
        _count: { _all: true },
      }),
      prisma.job.count({
        where: {
          hrId: hrProfile.id,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.jobApplication.count({
        where: {
          job: { hrId: hrProfile.id },
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.matchResult.count({
        where: {
          job: { hrId: hrProfile.id },
          createdAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    const overallFunnel = emptyStatusCounts();
    for (const row of funnelRows) {
      if (isApplicationStatus(row.status)) {
        overallFunnel[row.status] = row._count._all;
      }
    }

    const matchStatsByJobId: Record<
      string,
      { avgScore: number; topScore: number; totalCandidates: number }
    > = {};

    for (const row of matchRows) {
      matchStatsByJobId[row.jobId] = {
        avgScore: row._avg.score ?? 0,
        topScore: row._max.score ?? 0,
        totalCandidates: row._count._all,
      };
    }

    const pipelineByJobId: Record<string, StatusCounts> = {};
    const applicationsCountByJobId: Record<string, number> = {};

    for (const row of statusRows) {
      if (!isApplicationStatus(row.status)) {
        continue;
      }

      if (!pipelineByJobId[row.jobId]) {
        pipelineByJobId[row.jobId] = emptyStatusCounts();
      }

      pipelineByJobId[row.jobId][row.status] = row._count._all;

      applicationsCountByJobId[row.jobId] =
        (applicationsCountByJobId[row.jobId] ?? 0) + row._count._all;
    }

    const lastStatusUpdateByJobId: Record<string, string | null> = {};
    for (const row of latestStatusRows) {
      lastStatusUpdateByJobId[row.jobId] = row._max.updatedAt
        ? row._max.updatedAt.toISOString()
        : null;
    }

    const skillIds = Array.from(new Set(missingSkillRows.map((row) => row.skillId)));

    const skills =
      skillIds.length > 0
        ? await prisma.skill.findMany({
            where: { id: { in: skillIds } },
            select: { id: true, name: true },
          })
        : [];

    const skillNameById: Record<string, string> = {};
    for (const skill of skills) {
      skillNameById[skill.id] = skill.name;
    }

    const jobsOverview = jobs.map((job) => {
      const requiredSkillsCount = job.jobSkills.filter((skill) => skill.required).length;
      const preferredSkillsCount = job.jobSkills.length - requiredSkillsCount;
      const matchStats = matchStatsByJobId[job.id];

      return {
        jobId: job.id,
        title: job.title,
        createdAt: job.createdAt.toISOString(),
        minExperience: job.minExperience,
        requiredSkillsCount,
        preferredSkillsCount,
        totalCandidates: matchStats?.totalCandidates ?? 0,
        averageMatchPercentage: toPercentage(matchStats?.avgScore),
        topMatchPercentage: toPercentage(matchStats?.topScore),
        applicationsCount: applicationsCountByJobId[job.id] ?? 0,
        pipeline: pipelineByJobId[job.id] ?? emptyStatusCounts(),
        lastStatusUpdate: lastStatusUpdateByJobId[job.id] ?? null,
      };
    });

    const missingSkillStats: Record<
      string,
      { count: number; highPriorityCount: number }
    > = {};

    for (const row of missingSkillRows) {
      const current = missingSkillStats[row.skillId] ?? { count: 0, highPriorityCount: 0 };

      current.count += row._count._all;

      if ((row.priority ?? "").toUpperCase() === "HIGH") {
        current.highPriorityCount += row._count._all;
      }

      missingSkillStats[row.skillId] = current;
    }

    const topMissingSkills = Object.entries(missingSkillStats)
      .map(([skillId, stats]) => ({
        skillId,
        skillName: skillNameById[skillId] ?? "Unknown Skill",
        count: stats.count,
        highPriorityCount: stats.highPriorityCount,
      }))
      .sort((a, b) => {
        if (b.highPriorityCount !== a.highPriorityCount) {
          return b.highPriorityCount - a.highPriorityCount;
        }

        if (b.count !== a.count) {
          return b.count - a.count;
        }

        return a.skillName.localeCompare(b.skillName);
      })
      .slice(0, 10);

    return NextResponse.json({
      summary: {
        totalJobs: jobs.length,
        totalApplications,
        totalMatches,
        totalMatchedCandidates: matchedCandidates.length,
        averageMatchPercentage: toPercentage(avgScoreResult._avg.score),
      },
      activityLast7Days: {
        jobsCreated: jobsLast7Days,
        applicationsCreated: applicationsLast7Days,
        matchesCreated: matchesLast7Days,
      },
      funnel: overallFunnel,
      jobs: jobsOverview,
      topMissingSkills,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("HR Dashboard Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
