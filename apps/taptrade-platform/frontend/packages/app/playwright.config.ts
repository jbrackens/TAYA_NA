import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Predict player-app smoke tests.
 *
 * Phase 0.5 of PLAN-liquid-glass-redesign.md. These are STRUCTURAL smoke
 * tests — one per major route — asserting that the page loads, the React
 * error boundary did not trigger, and the key content surface is present.
 * Not pixel-diff visual regression. Pixel-diff is a future TODO.
 *
 * Prereqs for local runs:
 *   1. docker compose up -d postgres redis gateway auth    (predict stack)
 *   2. cd packages/app && npm run dev -- -p 3010             (Next.js 3010)
 *   3. npx playwright install chromium                      (one-time)
 *   4. yarn test:smoke                                      (this config)
 *
 * CI will wire steps 1-3 into a GitHub Action in a future commit.
 */
export default defineConfig({
  testDir: "./tests/smoke",
  // Match both .smoke.spec.ts (actual tests) and auth.setup.ts (one-shot
  // login). The project-level testMatch on "setup" filters appropriately.
  testMatch: ["**/*.smoke.spec.ts", "**/auth.setup.ts"],

  // Dev server is stateful (single Postgres, shared auth cookies).
  // Sequential execution avoids race conditions around auth state.
  fullyParallel: false,
  workers: 1,

  // Don't fail CI on retry — smoke tests are binary pass/fail.
  retries: process.env.CI ? 1 : 0,

  // 30s per test is plenty; Next.js dev server may compile on first hit.
  timeout: 30_000,

  reporter: [
    ["list"],
    ["html", { outputFolder: "./playwright-report", open: "never" }],
  ],

  // Visual regression thresholds (only affects toHaveScreenshot assertions,
  // i.e. the visual-* projects below; smoke tests take no screenshots).
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3010",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    // Ignore HTTPS self-signed in case the stack ever runs behind a local cert.
    ignoreHTTPSErrors: true,
  },

  projects: [
    // Runs once before everything else, logs in as demo user, persists
    // auth state to tests/.auth/demo.json. Avoids per-test logins that
    // trigger the auth service's rate limiter.
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { channel: "chrome" },
    },
    {
      name: "desktop-chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1440, height: 900 },
        storageState: "./tests/.auth/demo.json",
      },
    },
    // Cross-engine coverage (J8): Safari/WebKit matters for the PH market's
    // iOS users; Firefox for Gecko parity. Same storageState as desktop.
    {
      name: "desktop-webkit",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Safari"],
        viewport: { width: 1440, height: 900 },
        storageState: "./tests/.auth/demo.json",
      },
    },
    {
      name: "desktop-firefox",
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 1440, height: 900 },
        storageState: "./tests/.auth/demo.json",
      },
    },
    {
      name: "mobile-chromium",
      dependencies: ["setup"],
      use: {
        ...devices["Pixel 5"],
        channel: "chrome",
        // Force exact 375 x 812 to match the mockup reference viewport.
        viewport: { width: 375, height: 812 },
        storageState: "./tests/.auth/demo.json",
      },
    },

    // ── Visual regression (docs/archive/FRONTEND_POLISH_PLAN.md P0) ─────────────────
    // Gated behind RUN_VISUAL=1: baselines are darwin-owned (generated on
    // the deploy-preflight Mac) and Playwright snapshots are platform-
    // suffixed, so these projects must never run in the ubuntu workflows —
    // linux font rendering guarantees a red gate against darwin baselines.
    // Explicit testDir/testMatch: the global testMatch only sees
    // *.smoke.spec.ts, which would silently run zero visual tests.
    //
    //   RUN_VISUAL=1 PLAYWRIGHT_BASE_URL=http://localhost:3020 \
    //     npx playwright test --project=visual-desktop --project=visual-mobile
    ...(process.env.RUN_VISUAL === "1"
      ? [
          {
            name: "visual-desktop",
            testDir: "./tests/visual",
            testMatch: /.*\.visual\.spec\.ts/,
            grep: /@anon/,
            use: {
              ...devices["Desktop Chrome"],
              channel: "chrome",
              viewport: { width: 1280, height: 800 },
              contextOptions: { reducedMotion: "reduce" as const },
            },
          },
          {
            name: "visual-mobile",
            testDir: "./tests/visual",
            testMatch: /.*\.visual\.spec\.ts/,
            grep: /@anon/,
            use: {
              ...devices["Pixel 5"],
              channel: "chrome",
              viewport: { width: 375, height: 812 },
              contextOptions: { reducedMotion: "reduce" as const },
            },
          },
          {
            name: "visual-desktop-authed",
            testDir: "./tests/visual",
            testMatch: /.*\.visual\.spec\.ts/,
            grep: /@authed/,
            dependencies: ["setup"],
            use: {
              ...devices["Desktop Chrome"],
              channel: "chrome",
              viewport: { width: 1280, height: 800 },
              contextOptions: { reducedMotion: "reduce" as const },
              storageState: "./tests/.auth/demo.json",
            },
          },
          {
            name: "visual-mobile-authed",
            testDir: "./tests/visual",
            testMatch: /.*\.visual\.spec\.ts/,
            grep: /@authed/,
            dependencies: ["setup"],
            use: {
              ...devices["Pixel 5"],
              channel: "chrome",
              viewport: { width: 375, height: 812 },
              contextOptions: { reducedMotion: "reduce" as const },
              storageState: "./tests/.auth/demo.json",
            },
          },
        ]
      : []),
  ],

  // We do NOT use Playwright's webServer reverse-proxy — the dev server
  // is managed externally by the developer or CI workflow.
});
