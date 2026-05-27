import { defineConfig } from "@playwright/test";

const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:5173";
const SKIP_WEB_SERVER = process.env.PW_SKIP_WEB_SERVER === "1";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: FRONTEND_URL,
    ignoreHTTPSErrors: true,
    trace: "on-first-retry",
  },
  ...(SKIP_WEB_SERVER
    ? {}
    : {
        webServer: {
          command: "npm run dev -- --host 0.0.0.0",
          url: FRONTEND_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
        },
      }),
});
