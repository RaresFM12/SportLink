import { beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";

// Clean the database before every test file runs.
// Order matters: delete children before parents (FK constraints).
beforeEach(async () => {
  await prisma.comment.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});