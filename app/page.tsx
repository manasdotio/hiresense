import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BrainCircuit,
  FileCheck2,
  LineChart,
  Search,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const howItWorksSteps = [
  {
    title: "Create your profile",
    description:
      "Set up in minutes with the details needed for smarter matching.",
    icon: UserRound,
  },
  {
    title: "Upload jobs and resumes",
    description:
      "Collect role requirements and resume data in one place with structured parsing.",
    icon: FileCheck2,
  },
  {
    title: "Run AI matching",
    description:
      "Score fit, identify missing skills, and get candidate-job relevance instantly.",
    icon: BrainCircuit,
  },
  {
    title: "Move decisions forward",
    description:
      "Track pipeline outcomes, shortlist faster, and keep your hiring workflow focused.",
    icon: UsersRound,
  },
];

const featureHighlights = [
  {
    title: "Resume Intelligence",
    description:
      "Extract skills and structure from resumes to make every profile searchable and actionable.",
    icon: Search,
  },
  {
    title: "Match Scoring",
    description:
      "Understand candidate-fit percentages and close skill gaps with explainable scoring.",
    icon: Sparkles,
  },
  {
    title: "Hiring Analytics",
    description:
      "Monitor job activity, application funnel health, and performance trends at a glance.",
    icon: LineChart,
  },
];

const footerLinks = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Login", href: "/login" },
  { label: "Register", href: "/register" },
];

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role === "CANDIDATE") {
    redirect("/candidate/dashboard");
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-black/8 bg-white/80 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.04)]">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="group inline-flex items-center gap-2">
            <Image
              src="/hiresense-logo.svg"
              alt="HireSense logo"
              width={36}
              height={36}
              priority
              className="size-9 transition-transform group-hover:scale-105"
            />
            <div className="space-y-0.5">
              <p className="text-sm font-semibold tracking-tight text-foreground">HireSense</p>
              <p className="text-xs text-muted-foreground">AI Hiring Intelligence</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button asChild size="sm" variant="ghost">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:gap-10 sm:px-6 sm:py-10 lg:gap-12 lg:px-8 lg:py-14">
        <section className="surface-card relative overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14 border-black/8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(30rem_20rem_at_8%_12%,rgba(37,99,235,0.06),transparent_65%),radial-gradient(26rem_18rem_at_90%_8%,rgba(5,150,105,0.04),transparent_62%)]" />

          <div className="relative grid items-center gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-10">
            <div className="space-y-5 sm:space-y-6">
              <p className="inline-flex items-center rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Better hiring decisions, faster
              </p>

              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  The smart workspace for resumes, jobs, and hiring matches.
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground sm:text-base lg:text-lg">
                  HireSense helps teams evaluate candidate fit with AI-powered
                  matching while giving candidates a clear path to stronger,
                  skill-aligned opportunities.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/register" className="inline-flex items-center gap-2">
                    Get Started
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>

                <Button asChild size="lg" variant="outline">
                  <Link href="#how-it-works">Learn More</Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="surface-soft p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Candidate experience
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  Profile and resume workflows that make matching transparent.
                </p>
              </div>
              <div className="surface-soft p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  HR velocity
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  Job pipelines, skill gaps, and top-fit rankings in one place.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="space-y-4 sm:space-y-5">
          <div className="section-head">
            <h2 className="page-title">How It Works</h2>
            <p className="page-subtitle">
              A simple workflow designed for both hiring teams and candidates.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {howItWorksSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <Card key={step.title} className="h-full">
                  <CardHeader>
                    <div className="mb-2 inline-flex size-10 items-center justify-center rounded-xl border border-primary/35 bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <CardDescription>Step {index + 1}</CardDescription>
                    <CardTitle>{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="features" className="space-y-4 sm:space-y-5">
          <div className="section-head">
            <h2 className="page-title">Key Features</h2>
            <p className="page-subtitle">
              Purpose-built tools for resume intelligence, matching quality, and
              decision confidence.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featureHighlights.map((feature) => {
              const Icon = feature.icon;

              return (
                <Card key={feature.title} className="h-full">
                  <CardHeader>
                    <div className="mb-2 inline-flex size-10 items-center justify-center rounded-xl border border-accent/35 bg-accent/12 text-accent">
                      <Icon className="size-4" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-black/8 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="text-muted-foreground">
            Copyright {new Date().getFullYear()} HireSense. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            {footerLinks.map((link) => (
              <Link key={link.label} href={link.href} className="text-link text-sm">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}