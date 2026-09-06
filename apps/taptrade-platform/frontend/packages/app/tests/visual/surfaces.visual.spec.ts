/**
 * Visual regression net — docs/archive/FRONTEND_POLISH_PLAN.md P0.
 *
 * Six surfaces × two viewports, each in its route's NATIVE theme (theme is
 * route-scoped via .predict-terminal — there is no user/OS theme axis).
 * Baselines are darwin-owned; the projects only exist under RUN_VISUAL=1
 * (see playwright.config.ts) and never run in the ubuntu workflows.
 *
 * Determinism spec (each line maps to a verified flake source):
 *  - clock.setFixedTime: "Closes in …" countdowns and relative timestamps
 *    derive from Date.now(). (setFixedTime, NOT clock.install: install
 *    freezes timers, which can wedge app boot; setFixedTime only fakes
 *    Date while timers run normally.)
 *  - reducedMotion: "reduce" (project-level): stops the FeaturedCarousel
 *    setInterval auto-advance and the register-page ambient video via
 *    their existing prefers-reduced-motion gates.
 *  - The prod build serving these runs MUST be built with
 *    NEXT_PUBLIC_HERO_AMBIENT_VIDEO="" and NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS=""
 *    (inline env beats .env.local) — video off, honest empty chart states.
 *  - [data-vr-mask] masks live regions (charts, price chips, recent
 *    trades, balances): anonymous pages are full of seeded live data and
 *    the local SMM moves prices between runs.
 *  - document.fonts.ready awaited: the four Google-CDN fonts are a known
 *    flake source in this repo.
 *  - Target topology is pinned to `next start` (prod build, port 3020 by
 *    convention): the WS is CSP-blocked under local next start, which is
 *    MORE deterministic (documented in tests/smoke/_shared.ts).
 */
import path from "node:path";
import { test, expect, type Page, type TestInfo } from "@playwright/test";

// Any fixed instant works; this one is mid-2026 so seeded market close
// dates render as future ("Closes in …" not "Closed").
const FROZEN_TIME = new Date("2026-07-15T12:00:00Z");

// A seeded open market for the market-page/trade-ticket surfaces.
// Override per-box with VISUAL_MARKET_TICKER if the local catalog differs.
const MARKET_TICKER = process.env.VISUAL_MARKET_TICKER ?? "IMP-EB0BD076";

const MASK = "[data-vr-mask]";

/**
 * Data freeze: every /api/v1/* response is recorded to a per-surface,
 * per-project HAR on a VISUAL_RECORD=1 run and REPLAYED from it on
 * normal runs. The local gateway is a live-ish exchange (the SMM moves
 * prices and market ordering between runs), so screenshots are only
 * deterministic if the data layer is pinned. Baselines and HARs are
 * captured together and committed together:
 *
 *   VISUAL_RECORD=1 RUN_VISUAL=1 npx playwright test --project=visual-* \
 *     --update-snapshots
 */
async function freezeData(
  page: Page,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  await page.routeFromHAR(
    path.join(__dirname, "hars", `${name}-${testInfo.project.name}.har`),
    {
      url: /\/api\/v1\//,
      update: process.env.VISUAL_RECORD === "1",
      notFound: "abort",
    },
  );
}

async function prep(
  page: Page,
  urlPath: string,
  name: string,
  testInfo: TestInfo,
): Promise<void> {
  await freezeData(page, name, testInfo);
  await page.clock.setFixedTime(FROZEN_TIME);
  await page.goto(urlPath);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

async function shoot(page: Page, name: string): Promise<void> {
  await expect(page).toHaveScreenshot(`${name}.png`, {
    fullPage: true,
    mask: [page.locator(MASK)],
  });
}

test.describe("anonymous surfaces @anon", () => {
  test("hero (/)", async ({ page }, testInfo) => {
    await prep(page, "/", "hero", testInfo);
    await shoot(page, "hero");
  });

  test("discover (/predict)", async ({ page }, testInfo) => {
    await prep(page, "/predict", "discover", testInfo);
    await shoot(page, "discover");
  });

  test("market page", async ({ page }, testInfo) => {
    await prep(page, `/market/${MARKET_TICKER}`, "market", testInfo);
    await shoot(page, "market");
  });

  // /store is auth-gated (middleware 307 → /auth/login) — the store surface
  // itself lives in the @authed block; the login page is captured here as
  // its own surface (it's on the P2 propagation list anyway).
  test("login (/auth/login)", async ({ page }, testInfo) => {
    await prep(page, "/auth/login/", "login", testInfo);
    await shoot(page, "login");
  });
});

test.describe("authenticated surfaces @authed", () => {
  test("market page with trade ticket", async ({ page }, testInfo) => {
    await prep(page, `/market/${MARKET_TICKER}`, "market-authed", testInfo);
    await shoot(page, "market-authed");
  });

  test("store (/store)", async ({ page }, testInfo) => {
    await prep(page, "/store", "store", testInfo);
    await shoot(page, "store");
  });

  test("portfolio", async ({ page }, testInfo) => {
    await prep(page, "/portfolio", "portfolio", testInfo);
    await shoot(page, "portfolio");
  });
});
