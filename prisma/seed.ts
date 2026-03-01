import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

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
  await Promise.all(
    coreSkills.map((name) =>
      prisma.skill.upsert({
        where: { name },
        update: { category: "Core Tech" },
        create: { name, category: "Core Tech" },
      })
    )
  );

  console.log(`Seeded ${coreSkills.length} skills.`);
}

main()
  .catch((error) => {
    console.error("Skill seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
