import { defineConfig } from "@playwright/test";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: {
    baseURL: FRONTEND_URL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --host 0.0.0.0",
    url: FRONTEND_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});