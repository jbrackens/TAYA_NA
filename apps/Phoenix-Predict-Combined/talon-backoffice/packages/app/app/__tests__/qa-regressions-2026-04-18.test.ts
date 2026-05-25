/**
 * QA regression tests — 2026-04-18
 *
 * Locks in the fixes found during /qa on localhost after the
 * Pariflow dark-broadcast redesign shipped. Each test maps to a
 * specific bug found via gstack browse.
 *
 * Run: npx tsx --test app/__tests__/qa-regressions-2026-04-18.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(appRoot, rel), "utf-8");
}

// ── Bug C: cashier must guard wallet fetches on empty userId ──────

describe("cashier page: userId guard", () => {
  const source = read("cashier/page.tsx");

  it('load effect no longer passes "" fallback for the initial fetches', () => {
    // Before: the mount useEffect did `getBalance(user?.id || "")` which
    // produced /wallet//ledger (double slash → 308 → 403) and
    // /wallets//transactions (404) when auth had not resolved yet.
    // We now extract userId once, bail if empty, and pass it through.
    const loadEffect =
      /useEffect\(\(\)\s*=>\s*\{[\s\S]*?const\s+load\s*=[\s\S]*?load\(\);[\s\S]*?\}/m.exec(
        source,
      );
    assert.ok(loadEffect, "cashier should have a load useEffect");
    assert.ok(
      /const\s+userId\s*=\s*user\?\.id/.test(loadEffect![0]),
      "load effect should extract userId from user?.id",
    );
    assert.ok(
      !/getBalance\(user\?\.id\s*\|\|\s*""\)/.test(loadEffect![0]),
      "load effect should not call getBalance with empty-string fallback",
    );
    assert.ok(
      !/getTransactions\(user\?\.id\s*\|\|\s*""/.test(loadEffect![0]),
      "load effect should not call getTransactions with empty-string fallback",
    );
  });

  it("effect bails out when userId is not yet loaded", () => {
    assert.ok(
      /if\s*\(\s*!userId\s*\)\s*return/.test(source),
      "cashier load effect should early-return when userId is empty",
    );
  });

  it("effect deps array includes user?.id so it re-runs on auth resolve", () => {
    assert.ok(
      /\[dispatch,\s*user\?\.id\]/.test(source),
      "cashier useEffect deps should include user?.id",
    );
  });
});

// ── Bug C: wallet-client drops broken sportsbook fallback ─────────

describe("wallet-client: no sportsbook fallbacks", () => {
  const source = read("lib/api/wallet-client.ts");

  it("getTransactions no longer falls back to /wallets/{id}/transactions", () => {
    // The plural /wallets/ sportsbook endpoint does not exist in the
    // Predict gateway — it always 404ed.
    assert.ok(
      !source.includes("/api/v1/wallets/${userId}/transactions"),
      "wallet-client should not reference the sportsbook transactions endpoint",
    );
  });

  it("getTransactions primary path is /wallet/{id}/ledger", () => {
    assert.ok(
      source.includes("/api/v1/wallet/${userId}/ledger"),
      "wallet-client should use /wallet/{id}/ledger as the primary path",
    );
  });
});

// ── Bug E: compliance cool-off check must stay live ───────────────

describe("compliance-client: cool-off stub", () => {
  const source = read("lib/api/compliance-client.ts");

  it("getCoolOffStatus fetches /compliance/rg/restrictions", () => {
    const m = /export async function getCoolOffStatus[\s\S]*?^\}/m.exec(source);
    assert.ok(m, "getCoolOffStatus should be defined");
    assert.ok(
      m![0].includes("/api/v1/compliance/rg/restrictions"),
      "getCoolOffStatus body should call /compliance/rg/restrictions",
    );
  });

  it("getCoolOffStatus is no longer an unconditional inactive stub", () => {
    const m = /export async function getCoolOffStatus[\s\S]*?^\}/m.exec(source);
    assert.ok(
      !/return\s+\{\s*status:\s*"inactive",\s*coolOffUntil:\s*null\s*\};\s*$/.test(
        m![0].trim(),
      ),
      "function should not end as an unconditional inactive stub",
    );
  });
});

// ── Bug D: MarketCard <style> must not be inside <Link> ───────────

describe("MarketCard: style hoisted outside Link", () => {
  const source = read("components/prediction/MarketCard.tsx");

  it("does not render <style> as a child of <Link>", () => {
    // The bug: a <style>{...}</style> block was placed right after the
    // opening <Link> tag, so its text content was concatenated into
    // the link's accessible name. The fix hoists styles out via a
    // MarketCardStyles sibling component.
    const linkBlock = /<Link[\s\S]*?<\/Link>/.exec(source);
    assert.ok(linkBlock, "<Link> should exist in MarketCard");
    assert.ok(
      !linkBlock![0].includes("<style>"),
      "Link element should not contain a <style> tag — use MarketCardStyles sibling instead",
    );
  });

  it("exposes a MarketCardStyles sibling component", () => {
    assert.ok(
      /function\s+MarketCardStyles\s*\(/.test(source),
      "MarketCardStyles component should exist as the style container",
    );
    assert.ok(
      /<MarketCardStyles\s*\/>/.test(source),
      "MarketCard should render <MarketCardStyles /> as a sibling of <Link>",
    );
  });
});

// ── Bug F: P8 MarketCard invariants ───────────────────────────────
//
// Replaces the Phase-4 / Robinhood-P3 era assertions. P8 (light theme,
// landed 2026-04-28; layout remodeled 2026-05-24) composes MarketCard
// from: corner image + title, a probability label row above a slim bar,
// YES/NO pills as siblings of the body link, then a Volume / Closes stat
// footer below the pills. The percentage labels are outside the colored
// segments so the bar can stay visually compact and true to the split.

describe("MarketCard P8 composition", () => {
  const marketCardSource = read("components/prediction/MarketCard.tsx");

  it("renders the .mkt-bar probability bar", () => {
    assert.ok(
      /mkt-bar/.test(marketCardSource),
      "MarketCard should render a YES/NO probability bar (.mkt-bar)",
    );
  });

  it("renders percentage labels above the probability bar", () => {
    assert.ok(
      marketCardSource.includes("mkt-bar-labels"),
      "MarketCard should render a separate label row above the probability bar",
    );
    assert.ok(
      marketCardSource.includes("mkt-bar-pct-yes") &&
        marketCardSource.includes("mkt-bar-pct-no"),
      "MarketCard should expose YES and NO percentage labels outside the bar segments",
    );
  });

  it("keeps the probability bar slim and true to percentages", () => {
    assert.ok(
      /\.mkt-bar\s*\{[\s\S]*?height:\s*14px/.test(marketCardSource),
      "MarketCard probability bar should be half-height",
    );
    assert.ok(
      !/MIN_SEGMENT_PX\s*=/.test(marketCardSource),
      "MarketCard should not inflate tiny bar segments just to fit labels",
    );
    assert.ok(
      /style=\{\{\s*width:\s*`\$\{yesPriceCents\}%`\s*\}\}/.test(marketCardSource) &&
        /style=\{\{\s*width:\s*`\$\{noPriceCents\}%`\s*\}\}/.test(marketCardSource),
      "MarketCard bar segments should use the actual YES/NO percentages",
    );
  });

  it("keeps YES/NO action pills slimmer without losing tap size", () => {
    const pillBlock = /\.mkt-pill\s*\{[\s\S]*?\}/.exec(marketCardSource);
    assert.ok(pillBlock, "MarketCard should style YES/NO pills");
    assert.ok(
      pillBlock![0].includes("min-height: 38px"),
      "YES/NO pills should be slimmer by default",
    );
    assert.ok(
      pillBlock![0].includes("padding: 6px 12px"),
      "YES/NO pills should use slimmer vertical padding",
    );
    assert.ok(
      /@media\s*\(max-width:\s*768px\)[\s\S]*?\.mkt-pill\s*\{[\s\S]*?min-height:\s*40px/.test(
        marketCardSource,
      ),
      "YES/NO pills should keep a mobile-friendly tap size on small screens",
    );
  });

  it("YES/NO pills deep-link with ?side= so the trade ticket pre-selects", () => {
    assert.ok(
      /\?side=yes/.test(marketCardSource) && /\?side=no/.test(marketCardSource),
      "MarketCard pills should link to /market/<ticker>?side=yes|no",
    );
  });

  it("does not render seeded placeholder sparklines or fake deltas", () => {
    assert.ok(
      !marketCardSource.includes("seededSparklinePoints"),
      "MarketCard should not render seeded placeholder sparklines",
    );
    assert.ok(
      !marketCardSource.includes("mkt-delta"),
      "MarketCard should not render placeholder cent deltas",
    );
  });
});

describe("MarketChart side colors", () => {
  const marketChartSource = read("components/prediction/MarketChart.tsx");

  it("colors the chart line by selected YES/NO side, not price movement", () => {
    assert.ok(
      /const\s+lineColor\s*=\s*side\s*===\s*"no"\s*\?\s*"var\(--no-text\)"\s*:\s*"var\(--yes-text\)"/.test(
        marketChartSource,
      ),
      "MarketChart line color should match the selected side button",
    );
    assert.ok(
      !/const\s+lineColor\s*=\s*isUp\s*\?/.test(marketChartSource),
      "MarketChart line color should not switch to YES/NO based on movement",
    );
  });

  it("colors implied probability with the selected side token", () => {
    assert.ok(
      /className=\{`v \$\{side\}`\}/.test(marketChartSource),
      "MarketChart implied probability should use the selected side color",
    );
  });
});

describe("Navigation pill radius", () => {
  const allMarketsSource = read("components/prediction/AllMarketsSection.tsx");
  const topBarSource = read("components/prediction/TopBar.tsx");
  const marketChartSource = read("components/prediction/MarketChart.tsx");
  const globalsSource = read("globals.css");

  it("uses soft rectangular corners for category filter pills", () => {
    const categoryBlock = /\.ams-cat-pill\s*\{[\s\S]*?\}/.exec(allMarketsSource);
    assert.ok(categoryBlock, "AllMarketsSection should style category pills");
    assert.ok(
      categoryBlock![0].includes("border-radius: 6px"),
      "Category pills should use 6px corners",
    );
    assert.ok(
      !categoryBlock![0].includes("var(--r-pill)") && !categoryBlock![0].includes("999px"),
      "Category pills should not use capsule radius",
    );
  });

  it("uses soft rectangular corners for active segmented controls", () => {
    for (const [label, source, selector] of [
      ["closing-window shell", allMarketsSource, ".ams-time-pills"],
      ["closing-window button", allMarketsSource, ".ams-time-pill"],
      ["chart range shell", marketChartSource, ".mc-switcher"],
      ["chart range button", marketChartSource, ".mc-switcher button"],
      ["top navigation link", topBarSource, ".tb-link"],
    ] as const) {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const block = new RegExp(`${escaped}\\s*\\{[\\s\\S]*?\\}`).exec(source);
      assert.ok(block, `${label} should have a style block`);
      assert.ok(block![0].includes("border-radius: 6px"), `${label} should use 6px corners`);
      assert.ok(
        !block![0].includes("var(--r-pill)") && !block![0].includes("999px"),
        `${label} should not use capsule radius`,
      );
    }
  });

  it("uses soft rectangular corners for legacy category navigation pills", () => {
    const sportPillBlock = /\.sport-pill\s*\{[\s\S]*?\}/.exec(globalsSource);
    assert.ok(sportPillBlock, "Legacy category pills should have a style block");
    assert.ok(
      sportPillBlock![0].includes("border-radius: 6px"),
      "Legacy category pills should use 6px corners",
    );
  });
});

describe("Navigation pill active colors", () => {
  const allMarketsSource = read("components/prediction/AllMarketsSection.tsx");
  const topBarSource = read("components/prediction/TopBar.tsx");
  const marketChartSource = read("components/prediction/MarketChart.tsx");
  const globalsSource = read("globals.css");

  it("uses seafoam for category and segmented active fills", () => {
    for (const [label, source, selector] of [
      ["category active", allMarketsSource, ".ams-cat-pill.is-active"],
      ["closing-window active", allMarketsSource, ".ams-time-pill.is-active"],
      ["chart range active", marketChartSource, ".mc-switcher button.is-active"],
      ["top navigation active", topBarSource, ".tb-link.is-active"],
    ] as const) {
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const block = new RegExp(`${escaped}\\s*\\{[\\s\\S]*?\\}`).exec(source);
      assert.ok(block, `${label} should have a style block`);
      assert.ok(block![0].includes("background: var(--yes)"), `${label} should use seafoam`);
      assert.ok(!block![0].includes("background: var(--accent)"), `${label} should not use bright brand green`);
    }
  });

  it("uses seafoam tokens for legacy active category pills", () => {
    const sportActiveBlock = /\.sport-pill\.active\s*\{[\s\S]*?\}/.exec(globalsSource);
    assert.ok(sportActiveBlock, "Legacy active category pills should have a style block");
    assert.ok(
      sportActiveBlock![0].includes("background: var(--yes-soft)") &&
        sportActiveBlock![0].includes("border-color: var(--yes-border)") &&
        sportActiveBlock![0].includes("color: var(--yes-text)"),
      "Legacy active category pills should use seafoam tokens",
    );
  });
});
