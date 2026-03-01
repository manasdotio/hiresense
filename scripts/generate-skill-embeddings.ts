import { prisma } from "@/lib/prisma"
import { generateEmbedding } from "@/services/embedding.service"

async function main() {
  const skills = await prisma.skill.findMany()

  for (const skill of skills) {
    if (!skill.embedding) {
      const embedding = await generateEmbedding(skill.name)

      await prisma.$executeRawUnsafe(`
        UPDATE "Skill"
        SET embedding = '${JSON.stringify(embedding)}'
        WHERE id = '${skill.id}'
      `)

      console.log(`Embedded: ${skill.name}`)
    }
  }
}

main()