import { expect, Page, test as base } from "@playwright/test";

/**
 * Shared test helpers for Predict player-app smoke tests.
 *
 * Authentication is handled by auth.setup.ts (runs once before the suite,
 * logs in as demo@phoenix.local, writes tests/.auth/demo.json which each
 * test loads via storageState). Tests don't need to login themselves.
 *
 * For unauthenticated flows (/auth/login), override with:
 *   test.use({ storageState: { cookies: [], origins: [] } });
 *
 * This helper file exports:
 *   - test: the standard Playwright test (re-exported for convenience).
 *   - expect: the standard assertion library (re-exported).
 *   - captureConsoleErrors(page): attach a console listener; returns a
 *     function that asserts no errors fired when called at end of test.
 *   - assertPageHealthy(page, path): navigate + assert 200 + no error
 *     boundary + non-empty body.
 */

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
export function captureConsoleErrors(page: Page): () => void {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (
      text.includes("Hydration") ||
      text.includes("hydration") ||
      text.includes("failed to load font") ||
      text.includes("/api/v1/auth/session") ||
      text.match(/\/api\/v1\/status.*\b5\d{2}\b/) !== null
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
