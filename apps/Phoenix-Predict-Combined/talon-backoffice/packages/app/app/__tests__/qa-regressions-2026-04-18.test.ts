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
import { existsSync } from "node:fs";
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

// ── Bug D: MarketCard styling must not be inside <Link> ───────────

describe("MarketCard: Tailwind styling outside Link", () => {
  const source = read("components/prediction/MarketCard.tsx");

  it("does not render <style> as a child of <Link>", () => {
    // The bug: a <style>{...}</style> block was placed right after the
    // opening <Link> tag, so its text content was concatenated into
    // the link's accessible name. The Tailwind migration keeps all styling
    // in className strings and renders no local style block.
    const linkBlock = /<Link[\s\S]*?<\/Link>/.exec(source);
    assert.ok(linkBlock, "<Link> should exist in MarketCard");
    assert.ok(
      !linkBlock![0].includes("<style>"),
      "Link element should not contain a <style> tag — keep styling in Tailwind classes outside the Link body",
    );
  });

  it("does not reintroduce a MarketCardStyles style helper", () => {
    assert.ok(
      !/MarketCardStyles/.test(source),
      "MarketCard should not rely on a local style helper after Tailwind migration",
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

  it("renders the probability bar", () => {
    assert.ok(
      /role="img"[\s\S]*?MARKET_BAR_LABEL/.test(marketCardSource),
      "MarketCard should render an accessible YES/NO probability bar",
    );
  });

  it("renders percentage labels above the probability bar", () => {
    assert.ok(
      /aria-hidden="true"[\s\S]*?\{yesPriceCents\}%[\s\S]*?\{noPriceCents\}%/.test(
        marketCardSource,
      ),
      "MarketCard should render a separate label row above the probability bar",
    );
    assert.ok(
      marketCardSource.includes("text-[var(--yes-text)]") &&
        marketCardSource.includes("text-[var(--no-text)]"),
      "MarketCard should expose YES and NO percentage labels outside the bar segments",
    );
  });

  it("keeps the probability bar slim and true to percentages", () => {
    assert.ok(
      /className="[^"]*h-3\.5/.test(marketCardSource) &&
        /viewBox="0 0 100 14"/.test(marketCardSource),
      "MarketCard probability bar should be half-height",
    );
    assert.ok(
      !/MIN_SEGMENT_PX\s*=/.test(marketCardSource),
      "MarketCard should not inflate tiny bar segments just to fit labels",
    );
    assert.ok(
      /<rect\s+width=\{yesPriceCents\}/.test(marketCardSource) &&
        /width=\{noPriceCents\}/.test(marketCardSource),
      "MarketCard bar segments should use the actual YES/NO percentages",
    );
  });

  it("keeps YES/NO action pills slimmer without losing tap size", () => {
    assert.ok(
      marketCardSource.includes("min-h-9"),
      "YES/NO pills should be slimmer by default",
    );
    assert.ok(
      marketCardSource.includes("py-1.5"),
      "YES/NO pills should use slimmer vertical padding",
    );
    assert.ok(
      marketCardSource.includes("max-[768px]:min-h-10"),
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
      /chartStatValueClass\(side\)/.test(marketChartSource),
      "MarketChart implied probability should use the selected side color",
    );
  });
});

describe("Navigation underline treatment", () => {
  const allMarketsSource = read("components/prediction/AllMarketsSection.tsx");
  const topBarSource = read("components/prediction/TopBar.tsx");
  const marketChartSource = read("components/prediction/MarketChart.tsx");
  const globalsSource = read("globals.css");

  function functionBody(source: string, name: string): string {
    const match = new RegExp(`function\\s+${name}\\([\\s\\S]*?^\\}`, "m").exec(
      source,
    );
    assert.ok(match, `${name} should be declared`);
    return match[0];
  }

  function constValue(source: string, name: string): string {
    const match = new RegExp(
      `const\\s+${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
    ).exec(source);
    assert.ok(match, `${name} should be declared as a class constant`);
    return match[1] ?? match[2] ?? "";
  }

  it("uses Tailwind underline links for category and top navigation", () => {
    for (const [label, source, container, item, active] of [
      [
        "category navigation",
        allMarketsSource,
        "CATEGORY_LIST_CLASS",
        "CATEGORY_PILL_BASE_CLASS",
        "categoryPillClass",
      ],
      [
        "top navigation",
        topBarSource,
        "TOP_BAR_NAV_CLASS",
        "TOP_BAR_LINK_CLASS",
        "TOP_BAR_LINK_ACTIVE_CLASS",
      ],
    ] as const) {
      assert.ok(
        constValue(source, container).includes(
          "flex items-center gap-6 border-b border-neutral-200 w-full",
        ),
        `${label} should use the shared underline container classes`,
      );
      const itemClass = constValue(source, item);
      for (const token of [
        "relative",
        "pb-3",
        "pt-2",
        "text-sm",
        "font-medium",
        "border-b-2",
        "transition-all",
        "duration-200",
      ]) {
        assert.ok(itemClass.includes(token), `${label} should include ${token}`);
      }
      assert.ok(
        source.includes("text-neutral-500") &&
          source.includes("border-transparent") &&
          source.includes("hover:text-neutral-800") &&
          source.includes("hover:border-neutral-300"),
        `${label} should keep inactive borders transparent`,
      );
      const activeClass =
        active === "categoryPillClass"
          ? functionBody(source, active)
          : constValue(source, active);
      assert.ok(
        activeClass.includes("text-[var(--accent)]") &&
          source.includes("font-semibold") &&
          source.includes("border-[var(--accent)]"),
        `${label} should draw the selected mint underline`,
      );
    }

    assert.ok(
      !functionBody(allMarketsSource, "categoryPillClass").includes(
        "bg-[var(--yes)] font-semibold text-[#061a10]",
      ),
      "Category navigation should no longer use active pill fill",
    );
    assert.ok(
      !constValue(topBarSource, "TOP_BAR_LINK_ACTIVE_CLASS").includes(
        "bg-[var(--yes)] font-semibold text-[#061a10]",
      ),
      "Top navigation should no longer use active pill fill",
    );
  });

  it("uses soft rectangular corners for active segmented controls", () => {
    for (const [label, source, constant] of [
      ["closing-window shell", allMarketsSource, "TIME_PILLS_CLASS"],
      ["closing-window button", allMarketsSource, "TIME_PILL_BASE_CLASS"],
      ["chart range shell", marketChartSource, "CHART_SWITCHER_CLASS"],
      ["chart range button", marketChartSource, "CHART_BUTTON_BASE_CLASS"],
    ] as const) {
      const classValue = constValue(source, constant);
      assert.ok(
        classValue.includes("rounded-md"),
        `${label} should use 6px Tailwind corners`,
      );
      assert.ok(
        !classValue.includes("var(--r-pill)") &&
          !classValue.includes("999px"),
        `${label} should not use capsule radius`,
      );
    }
  });

  it("uses soft rectangular corners for category navigation pills", () => {
    const categoryPillsSource = read("components/prediction/CategoryPills.tsx");
    const categoryPillClass = constValue(categoryPillsSource, "PILL_BASE_CLASS");
    assert.ok(
      categoryPillClass.includes("rounded-md"),
      "Category pills should use 6px Tailwind corners",
    );
    assert.ok(
      !categoryPillClass.includes("var(--r-pill)") &&
        !categoryPillClass.includes("999px"),
      "Category pills should not use capsule radius",
    );
  });
});

describe("Navigation pill active colors", () => {
  const allMarketsSource = read("components/prediction/AllMarketsSection.tsx");
  const marketChartSource = read("components/prediction/MarketChart.tsx");
  const globalsSource = read("globals.css");
  const categoryPillsSource = read("components/prediction/CategoryPills.tsx");

  function functionBody(source: string, name: string): string {
    const match = new RegExp(`function\\s+${name}\\([\\s\\S]*?^\\}`, "m").exec(
      source,
    );
    assert.ok(match, `${name} should be declared`);
    return match[0];
  }

  it("uses seafoam for remaining segmented active fills", () => {
    for (const [label, activeClass] of [
      [
        "closing-window active",
        functionBody(allMarketsSource, "timePillClass"),
      ],
      [
        "chart range active",
        functionBody(marketChartSource, "rangeButtonClass"),
      ],
    ] as const) {
      assert.ok(
        activeClass.includes("bg-[var(--yes)]"),
        `${label} should use seafoam`,
      );
      assert.ok(
        !activeClass.includes("bg-[var(--accent)]"),
        `${label} should not use bright brand green`,
      );
    }
  });

  it("uses seafoam tokens for active category pills", () => {
    function constValue(source: string, name: string): string {
      const match = new RegExp(
        `const\\s+${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
      ).exec(source);
      assert.ok(match, `${name} should be declared as a class constant`);
      return match[1] ?? match[2] ?? "";
    }

    const categoryActiveClass = constValue(categoryPillsSource, "PILL_ACTIVE_CLASS");
    assert.ok(
      categoryActiveClass.includes("bg-[var(--yes-soft)]") &&
        categoryActiveClass.includes("border-[var(--yes-border)]") &&
        categoryActiveClass.includes("text-[var(--yes-text)]"),
      "Active category pills should use seafoam tokens",
    );
  });
});

describe("Static informational pages", () => {
  const contentPageSource = read("components/ContentPage.tsx");
  const footerSource = read("components/prediction/PredictFooter.tsx");
  const globalsSource = read("globals.css");
  const proxySource = read("../proxy.ts");
  const tosSource = read("tos/page.tsx");
  const aboutSource = read("about/page.tsx");

  it("exposes /tos as the Terms of Use page and keeps /about content available", () => {
    assert.ok(
      tosSource.includes('export { default } from "../terms/page"'),
      "/tos should render the Terms of Use content",
    );
    assert.ok(
      aboutSource.includes('slug="about-us"') &&
        aboutSource.includes("About Hula Na!"),
      "/about should render the About Us fallback content",
    );
  });

  it("keeps Terms of Use linked through the public footer and auth proxy", () => {
    assert.ok(
      footerSource.includes('href: "/tos"') &&
        footerSource.includes('label: "Terms of Use"'),
      "Footer should link Terms of Use to /tos",
    );
    assert.ok(
      proxySource.includes('"/tos"'),
      "/tos should be listed as a public informational route",
    );
  });

  it("uses the light static content page treatment", () => {
    assert.ok(
      contentPageSource.includes('className="content-page"') &&
        contentPageSource.includes('className="content-page-body"'),
      "ContentPageRenderer should use the static content page classes",
    );
    assert.ok(
      globalsSource.includes(".content-page") &&
        globalsSource.includes("background: var(--surface-1)") &&
        globalsSource.includes("color: var(--t1)") &&
        globalsSource.includes(".content-page-body h2"),
      "Static pages should use light readable typography styles",
    );
    assert.ok(
      !contentPageSource.includes("prose-invert"),
      "Static content pages should not use inverted dark prose styling",
    );
  });
});

describe("Social auth feature gate", () => {
  const featuresSource = read("lib/features.ts");

  it("keeps social OAuth buttons hidden unless provider credentials are enabled", () => {
    assert.ok(
      featuresSource.includes("FEATURE_SOCIAL_AUTH") &&
        featuresSource.includes("NEXT_PUBLIC_FEATURE_SOCIAL_AUTH"),
      "social auth should have an explicit public feature flag",
    );
    for (const file of ["auth/login/page.tsx", "auth/register/page.tsx"]) {
      assert.ok(
        read(file).includes("FEATURE_SOCIAL_AUTH") &&
          read(file).includes("<SocialAuthButtons />"),
        `${file} should gate social buttons behind FEATURE_SOCIAL_AUTH`,
      );
    }
  });
});

describe("Registration auth flow", () => {
  const registerSource = read("auth/register/page.tsx");

  it("signs the user in after account creation instead of returning to login", () => {
    assert.ok(
      registerSource.includes("const { login } = useAuth();") &&
        registerSource.includes("await login(form.username, form.password);"),
      "register page should establish an authenticated session after successful signup",
    );
    assert.ok(
      registerSource.includes("router.replace(safeReturnPath(searchParams.get(\"returnUrl\")))"),
      "register page should land on the validated returnUrl after automatic login",
    );
    assert.ok(
      !registerSource.includes("window.location.href = \"/auth/login\""),
      "register page should not force users back through the sign-in screen after signup",
    );
  });
});

describe("Mobile navigation and chat parity", () => {
  const mobileTabBarSource = read("components/MobileTabBar.tsx");
  const chatSidebarSource = read("components/chat/ChatSidebar.tsx");

  it("keeps mobile primary nav aligned with desktop auth rules", () => {
    assert.ok(
      mobileTabBarSource.includes('href: "/discover"') &&
        mobileTabBarSource.includes("NAV_DISCOVER"),
      "mobile nav should expose Discover like the desktop primary nav",
    );
    assert.ok(
      mobileTabBarSource.includes("useAuth()") &&
        mobileTabBarSource.includes("requiresAuth") &&
        mobileTabBarSource.includes("isAuthenticated"),
      "mobile nav should hide auth-required destinations until login",
    );
    assert.ok(
      mobileTabBarSource.includes("NAV_LEADERBOARDS") &&
        !mobileTabBarSource.includes("NAV_BOARDS"),
      "mobile nav should use the same Leaderboards label key as desktop",
    );
  });

  it("opens mobile chat in the native in-app chat surface", () => {
    assert.ok(
      chatSidebarSource.includes("chat-mobile-sheet") &&
        chatSidebarSource.includes("renderChatPanel(false)") &&
        chatSidebarSource.includes("<ChatFrame"),
      "mobile chat should render the same in-app ChatFrame as desktop",
    );
    assert.ok(
      !chatSidebarSource.includes("window.open"),
      "mobile chat should not send users to a different external chat flow",
    );
  });
});

describe("Market copy localization", () => {
  const marketContentSource = read("components/prediction/market-content.ts");
  const predictionTypesSource = read(
    "../../api-client/src/prediction-types.ts",
  );

  it("models API-provided market translations", () => {
    assert.ok(
      predictionTypesSource.includes("export interface MarketTranslation") &&
        predictionTypesSource.includes(
          "translations?: Record<string, MarketTranslation>",
        ),
      "PredictionMarket should expose API-provided localized title/description copy",
    );
  });

  it("prefers API-provided localized copy before static fallback files", () => {
    assert.ok(
      marketContentSource.includes("market.translations"),
      "market-content should read dynamic translations from the market payload",
    );
    assert.ok(
      marketContentSource.indexOf(
        'const apiTitle = localizedCopy(market, "title")',
      ) <
        marketContentSource.indexOf(
          'const bundledTitle = staticCopy(t, market, "title")',
        ) &&
        marketContentSource.indexOf(
          'const bundledTitle = staticCopy(t, market, "title")',
        ) <
          marketContentSource.indexOf(
            'const templatedTitle = templateCopy(t, market, "title")',
          ),
      "marketTitle should prefer API translations before bundled market-content fallbacks",
    );
    assert.ok(
      marketContentSource.indexOf(
        'const apiDescription = localizedCopy(market, "description")',
      ) <
        marketContentSource.indexOf(
          'const bundledDescription = staticCopy(t, market, "description")',
        ) &&
        marketContentSource.indexOf(
          'const bundledDescription = staticCopy(t, market, "description")',
        ) <
          marketContentSource.indexOf(
            'const templatedDescription = templateCopy(t, market, "description")',
          ),
      "marketDescription should prefer API translations before bundled market-content fallbacks",
    );
  });
});

describe("Full-page translation coverage", () => {
  const i18nConfigSource = read("lib/i18n/config.ts");
  const criticalPageNamespaces = [
    "account",
    "portfolio",
    "rewards",
    "settings",
    "leaderboards",
  ];

  function flattenStrings(
    value: unknown,
    prefix = "",
    output: Record<string, string> = {},
  ): Record<string, string> {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return output;
    }
    for (const [key, child] of Object.entries(value)) {
      const nextKey = prefix ? `${prefix}.${key}` : key;
      if (child && typeof child === "object" && !Array.isArray(child)) {
        flattenStrings(child, nextKey, output);
      } else if (typeof child === "string") {
        output[nextKey] = child;
      }
    }
    return output;
  }

  function readLocale(lang: string, namespace: string): Record<string, string> {
    const source = readFileSync(
      resolve(
        appRoot,
        `../public/static/locales/${lang}/${namespace}.json`,
      ),
      "utf-8",
    );
    return flattenStrings(JSON.parse(source));
  }

  it("loads page namespaces for portfolio and leaderboards", () => {
    assert.ok(
      i18nConfigSource.includes('"portfolio"') &&
        i18nConfigSource.includes('"leaderboards"'),
      "i18n config should register the portfolio and leaderboards namespaces",
    );
  });

  it("routes requested account surfaces through i18n", () => {
    for (const file of [
      "account/page.tsx",
      "account/settings/page.tsx",
      "portfolio/page.tsx",
      "leaderboards/page.tsx",
      "rewards/page.tsx",
    ]) {
      assert.ok(
        read(file).includes("useTranslation("),
        `${file} should use i18n for visible page copy`,
      );
    }
  });

  it("ships locale JSON for requested pages in every supported language", () => {
    for (const lang of ["en", "zh-Hans", "zh-Hant", "tl", "ms", "id"]) {
      for (const ns of ["portfolio", "leaderboards"]) {
        assert.ok(
          existsSync(
            resolve(appRoot, `../public/static/locales/${lang}/${ns}.json`),
          ),
          `${lang}/${ns}.json should exist`,
        );
      }
    }
  });

  it("does not ship mostly-English fallback copy for SEA full-page locales", () => {
    const allowedSharedStrings = new Set([
      "P&L",
      "ROI",
      "YES",
      "NO",
      "pts",
      "Portfolio",
      "Cashier",
      "Rewards Center",
      "Leaderboards",
    ]);

    for (const namespace of criticalPageNamespaces) {
      const english = readLocale("en", namespace);
      for (const lang of ["tl", "ms", "id"]) {
        const localized = readLocale(lang, namespace);
        const comparable = Object.entries(english).filter(([, value]) => {
          const trimmed = value.trim();
          return (
            trimmed.length >= 3 &&
            !allowedSharedStrings.has(trimmed) &&
            !/^{{[^}]+}}/.test(trimmed)
          );
        });
        const identical = comparable.filter(
          ([key, value]) => localized[key]?.trim() === value.trim(),
        );
        const identicalRatio = identical.length / comparable.length;

        assert.ok(
          identicalRatio <= 0.25,
          `${lang}/${namespace}.json has too much English fallback copy: ${identical.length}/${comparable.length} identical strings`,
        );
      }
    }
  });
});
