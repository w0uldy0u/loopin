import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const genres = [
    { id: 1, label: "Breaking" },
    { id: 2, label: "Popping" },
    { id: 3, label: "Locking" },
    { id: 4, label: "House" },
    { id: 5, label: "Krump" },
    { id: 6, label: "Hip Hop" },
    { id: 7, label: "Waacking" },
    { id: 8, label: "Voguing" },
    { id: 9, label: "Choreo" },
  ]

  for (const genre of genres) {
    await prisma.genre.upsert({
      where: { id: genre.id },
      update: { label: genre.label },
      create: genre,
    })
  }

  console.log("🌱 Seed updated successfully!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
