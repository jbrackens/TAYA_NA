import {
  test,
  expect,
  assertPageHealthy,
  captureConsoleErrors,
} from "./_shared";

test.describe("/predict — discovery landing", () => {
  test("renders the Moments grid and switches rankings in place", async ({ page }) => {
    const checkErrors = captureConsoleErrors(page);

    await assertPageHealthy(page, "/predict");

    const cards = page.getByTestId("market-card");
    const grid = page.getByTestId("market-grid");
    await expect(cards).toHaveCount(9, { timeout: 10_000 });
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    const expectedColumns = viewportWidth > 1120 ? 3 : viewportWidth > 640 ? 2 : 1;
    await expect
      .poll(async () => {
        const template = await grid.evaluate(
          (element) => getComputedStyle(element).gridTemplateColumns,
        );
        return template.split(" ").filter(Boolean).length;
      })
      .toBe(expectedColumns);

    await page.getByRole("button", { name: /load more markets/i }).click();
    await expect(cards).toHaveCount(18, { timeout: 10_000 });

    const activeTab = page.getByRole("tab", {
      name: "Most Active",
      exact: true,
    });
    await expect(activeTab).toBeVisible();
    await activeTab.click();
    await expect(activeTab).toHaveAttribute("aria-selected", "true");

    // The approved discovery card shows both live market sides as
    // percentage actions, not as a dense single-column price table.
    await expect(cards.first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("link", { name: /\d+% buy yes/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /\d+% buy no/i }).first()).toBeVisible();

    checkErrors();
  });
});
