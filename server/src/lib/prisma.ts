import { PrismaClient } from "@prisma/client";

// Single shared instance across the whole app.
// In tests each test file can call prisma.$disconnect() in afterAll.
export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["query", "warn", "error"]
      : ["warn", "error"],
});