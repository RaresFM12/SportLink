/// <reference types="vitest/globals" />
import { prisma } from '../src/lib/prisma.js';

if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is not set. Create a .env file from .env.example before running tests.'
  );
}

beforeEach(async () => {
  await prisma.comment.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.event.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});
