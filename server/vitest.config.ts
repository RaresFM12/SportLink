import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    setupFiles: ['./tests/setup.ts'],
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? '',
    },
  },
  resolve: {
    conditions: ['node'],
  },
  ssr: {
    noExternal: [],
    external: ['@prisma/client', '.prisma/client'],
  },
});
