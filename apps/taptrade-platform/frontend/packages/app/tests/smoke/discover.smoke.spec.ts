import {
  assertPageHealthy,
  captureConsoleErrors,
  expect,
  test,
} from "./_shared";

test.describe("/discover — tabbed market rankings", () => {
  test("replaces the selected ranking without navigating", async ({ page }) => {
    const checkErrors = captureConsoleErrors(page);

    await assertPageHealthy(page, "/discover");

    const tabs = page.getByTestId("discover-ranking-tabs");
    const trending = tabs.getByRole("tab", { name: "Trending", exact: true });
    const mostActive = tabs.getByRole("tab", {
      name: "Most Active",
      exact: true,
    });
    const panel = page.getByRole("tabpanel");

    await expect(tabs.getByRole("tab")).toHaveCount(7);
    await expect(trending).toHaveAttribute("aria-selected", "true");
    await expect(panel).toHaveCount(1);
    await expect(panel).toBeVisible();

    const urlBeforeSelection = page.url();
    await mostActive.click();

    await expect(mostActive).toHaveAttribute("aria-selected", "true");
    await expect(trending).toHaveAttribute("aria-selected", "false");
    await expect(panel).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Most Active",
    );
    await expect(page).toHaveURL(urlBeforeSelection);

    checkErrors();
  });
});
