import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Run test files serially — they share a real DB so parallel runs
    // would cause data races between tests.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    setupFiles: ['./tests/setup.ts'],
  },
});
