import "dotenv/config";
import { ensureSkillsWithEmbeddings } from "@/lib/skillStore";
import { prisma } from "@/lib/prisma";

const coreSkills = [
  "Node.js",
  "React",
  "MongoDB",
  "PostgreSQL",
  "Docker",
  "AWS",
  "Python",
  "Django",
  "TypeScript",
  "Redis",
  "JavaScript",
  "Next.js",
  "Express.js",
  "NestJS",
  "GraphQL",
  "REST API",
  "MySQL",
  "SQLite",
  "Git",
  "GitHub",
  "CI/CD",
  "Kubernetes",
  "Linux",
  "Bash",
  "HTML",
  "CSS",
  "Tailwind CSS",
  "Sass",
  "Jest",
  "Cypress",
  "Playwright",
  "Java",
  "Spring Boot",
  "C#",
  ".NET",
  "Go",
  "PHP",
  "Laravel",
  "Firebase",
  "Terraform",
] as const;

async function main() {
  await ensureSkillsWithEmbeddings([...coreSkills]);

  console.log(`Seeded ${coreSkills.length} skills with embeddings.`);
}

main()
  .catch((error) => {
    console.error("Skill seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
