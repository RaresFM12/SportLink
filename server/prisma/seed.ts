import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clear existing data in dependency order
  await prisma.comment.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();

  // Seed events
  const football = await prisma.event.create({
    data: {
      title: "Football Meetup",
      sport: "Football",
      city: "Bucharest",
      date: "2026-05-10",
      startTime: "10:00",
      duration: "2 hours",
      location: "National Arena",
      maxParticipants: 22,
      description: "A casual football meetup for all skill levels.",
      participants: {
        create: [
          { userName: "Rares" },
          { userName: "Alex" },
          { userName: "Maria" },
        ],
      },
    },
  });

  const basketball = await prisma.event.create({
    data: {
      title: "Basketball Session",
      sport: "Basketball",
      city: "Cluj-Napoca",
      date: "2026-05-12",
      startTime: "14:00",
      duration: "1.5 hours",
      location: "Sports Hall Cluj",
      maxParticipants: 10,
      description: "Pick-up basketball game. Bring your own water.",
      participants: {
        create: [{ userName: "Dan" }, { userName: "Ioana" }],
      },
    },
  });

  const tennis = await prisma.event.create({
    data: {
      title: "Tennis Training",
      sport: "Tennis",
      city: "Timisoara",
      date: "2026-05-15",
      startTime: "09:00",
      duration: "1 hour",
      location: "City Tennis Club",
      maxParticipants: 4,
      description: "Singles and doubles practice.",
      participants: {
        create: [{ userName: "Vlad" }],
      },
    },
  });

  await prisma.comment.createMany({
    data: [
      {
        eventId: football.id,
        author: "Rares",
        content: "Looking forward to this!",
      },
      {
        eventId: football.id,
        author: "Alex",
        content: "Should we bring extra balls?",
      },
      {
        eventId: basketball.id,
        author: "Dan",
        content: "I will be there at 13:45.",
      },
    ],
  });

  console.log(
    `Seeded: events (${[football.id, basketball.id, tennis.id].join(", ")})`
  );
  console.log("Seeding complete.");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());