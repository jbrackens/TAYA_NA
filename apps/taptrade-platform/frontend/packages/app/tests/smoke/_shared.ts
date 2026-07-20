import { expect, Page, test as base } from "@playwright/test";

/**
 * Shared test helpers for Predict player-app smoke tests.
 *
 * Authentication is handled by auth.setup.ts (runs once before the suite,
 * logs in as demo@taptrade.local, writes tests/.auth/demo.json which each
 * test loads via storageState). Tests don't need to login themselves.
 *
 * For unauthenticated flows (/auth/login), override with:
 *   test.use({ storageState: { cookies: [], origins: [] } });
 *
 * This helper file exports:
 *   - test: the standard Playwright test (re-exported for convenience).
 *   - expect: the standard assertion library (re-exported).
 *   - captureConsoleErrors(page, options): attach a console listener; returns a
 *     function that asserts no errors fired when called at end of test.
 *   - assertPageHealthy(page, path): navigate + assert 200 + no error
 *     boundary + non-empty body.
 */

type ConsoleErrorAllow = string | RegExp | ((text: string) => boolean);

function isAllowedConsoleError(
  text: string,
  allow: ConsoleErrorAllow[] = [],
): boolean {
  return allow.some((matcher) => {
    if (typeof matcher === "string") return text.includes(matcher);
    if (matcher instanceof RegExp) return matcher.test(text);
    return matcher(text);
  });
}

/**
 * Attach a console listener to the page that records errors. Returns a
 * function that, when called at end of test, asserts no errors were emitted.
 *
 * Ignores known-safe warnings/errors:
 *   - React hydration warnings from Next dev mode (dev-only noise)
 *   - Font-loading failures (Google Fonts can flake)
 *   - Background /api/v1/auth/session polls during transient states
 *   - /api/v1/status transient 5xx from BackendStatusBanner poll
 */
export function captureConsoleErrors(
  page: Page,
  options: { allow?: ConsoleErrorAllow[] } = {},
): () => void {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (
      text.includes("Hydration") ||
      text.includes("hydration") ||
      text.includes("failed to load font") ||
      // Local-topology artifact: `next start` has no /ws proxy, so the WS
      // client falls back to ws://localhost:18080/ws which the CSP
      // (connect-src 'self') blocks. The deployed edge proxies /ws
      // same-origin. Live frames are an enhancement layer; pages work
      // without them. Scoped narrowly to that exact endpoint.
      (text.includes("Content Security Policy") &&
        text.includes("ws://localhost:18080/ws")) ||
      text.includes("/api/v1/auth/session") ||
      text.match(/\/api\/v1\/status.*\b5\d{2}\b/) !== null ||
      isAllowedConsoleError(text, options.allow)
    ) {
      return;
    }
    errors.push(text);
  });
  return () => {
    expect(errors, `console errors observed: ${errors.join(" | ")}`).toEqual(
      [],
    );
  };
}

/**
 * Assert the Next.js App Router default-error page is NOT shown.
 *
 * Next renders a generic "Application error: a server-side exception has
 * occurred" when an error boundary above the route triggers. If we see that,
 * the page rendering actually failed even if the HTTP response was 200.
 */
export async function assertNoErrorBoundary(page: Page): Promise<void> {
  const errorBoundaryText = await page
    .getByText(/application error|server-side exception|something went wrong/i)
    .count();
  expect(
    errorBoundaryText,
    "React error boundary / Next.js error page triggered during load",
  ).toBe(0);
}

/**
 * Navigate to a path and assert the page is structurally healthy:
 *   - HTTP 200 on the navigation
 *   - React did not unmount into an error boundary
 *   - Body has non-trivial rendered content
 *
 * Waits for networkidle so React has hydrated and data-fetching effects
 * have settled. Uses textContent (raw DOM text) rather than innerText
 * (computed-visible text) since innerText returns 0 before hydration even
 * when the DOM has content.
 */
export async function assertPageHealthy(
  page: Page,
  path: string,
): Promise<void> {
  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response?.ok(), `${path} returned ${response?.status()}`).toBeTruthy();
  // Let React hydrate + initial API calls settle.
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {
    /* networkidle may not fire if WebSocket stays open — fall through */
  });
  await assertNoErrorBoundary(page);
  const bodyText = (await page.locator("body").textContent()) ?? "";
  expect(
    bodyText.length,
    `${path} rendered empty body (length=${bodyText.length})`,
  ).toBeGreaterThan(100);
}

export const test = base;
export { expect };

/**
 * P3: on the <=1023px band the market page's trade workspace lives in a
 * vaul bottom sheet behind the fixed "Trade market" CTA. Desktop renders
 * the aside directly, so this is a no-op there. Call after navigating to
 * a market page and before touching ticket controls.
 */
export async function openTradeTicket(page: Page): Promise<void> {
  const trigger = page.getByTestId("open-trade-sheet");
  const ticket = page.locator('section[aria-label="Trade ticket"]');
  // Settle first: a bare isVisible() races page load and silently no-ops.
  // Polled pair, not .or().first() — the union resolves in DOM order and
  // picks the CSS-hidden sheet trigger on desktop.
  await expect
    .poll(
      async () => {
        if (await ticket.isVisible().catch(() => false)) return true;
        return trigger.isVisible().catch(() => false);
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click();
    await ticket.waitFor({ state: "visible", timeout: 10_000 });
  }
}
