import {
  test,
  expect,
  assertPageHealthy,
  captureConsoleErrors,
} from "./_shared";

test.describe("/leaderboards — sidebar + detail", () => {
  test("board list + detail pane render", async ({ page }) => {
    const checkErrors = captureConsoleErrors(page);

    await assertPageHealthy(page, "/leaderboards");

    // Heading present.
    await expect(
      page.getByRole("heading", { name: /rankings|leaderboards?/i }).first(),
    ).toBeVisible({ timeout: 10_000 });

    // Static boards exist — Accuracy, Weekly P&L, or Sharpness should appear.
    // predict_boards.go defines these three as the universal set.
    await expect(
      page.getByText(/accuracy|weekly p.?.?l|sharpness/i).first(),
    ).toBeVisible();

    // Table-or-empty-state content in the detail pane.
    await expect(
      page.getByText(/rank|trader|no one has qualified|be the first/i).first(),
    ).toBeVisible();

    checkErrors();
  });
});
