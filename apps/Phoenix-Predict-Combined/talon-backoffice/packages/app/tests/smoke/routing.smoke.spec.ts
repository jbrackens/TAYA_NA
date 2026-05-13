import { test, expect } from "./_shared";

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("route protection", () => {
  test("unknown signed-out routes show not-found instead of login", async ({
    page,
  }) => {
    const response = await page.goto("/not-a-real-route", {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status(), "unknown route should return 404").toBe(404);
    expect(page.url()).not.toContain("/auth/login");
    await expect(page.getByText(/page not found/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("signed-out private routes still redirect to login", async ({
    page,
  }) => {
    const response = await page.goto("/portfolio", {
      waitUntil: "domcontentloaded",
    });

    expect(response?.ok(), "/portfolio redirect should land on login").toBe(
      true,
    );
    expect(page.url()).toContain("/auth/login");
    expect(page.url()).toContain("returnUrl=%2Fportfolio");
    await expect(page.getByRole("button", { name: /log in/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});
