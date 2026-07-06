import { defineConfig, devices } from "@playwright/test";

/**
 * Prediction-app e2e config (separate from the legacy sportsbook
 * playwright.config.ts, whose specs target removed surfaces). Drives the live
 * stack: the player app on PREDICT_BASE_URL (Caddy same-origin, /api proxied to
 * the gateway) so cookies + CSRF behave exactly as in production.
 *
 * Run: npx playwright test --config playwright.prediction.config.ts
 * Override target: PREDICT_BASE_URL=http://localhost:8080
 */
const BASE = process.env.PREDICT_BASE_URL || "http://localhost:8080";

export default defineConfig({
  testDir: "./e2e/prediction",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "api",
      testMatch: /.*\.api\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "ui",
      testMatch: /.*\.ui\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/predict-user.json",
      },
    },
  ],
});
