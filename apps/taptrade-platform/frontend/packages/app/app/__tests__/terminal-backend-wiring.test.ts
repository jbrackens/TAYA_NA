import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { isPredictionTerminalRoute } from "../lib/prediction-terminal";
import { DISCOVER_RANKING_SECTIONS } from "../components/prediction/discover-rankings";

const appRoot = fileURLToPath(new URL("../", import.meta.url));
const read = (path: string) => readFileSync(`${appRoot}${path}`, "utf8");

describe("prediction terminal backend wiring", () => {
  it("uses the connected trade controller in the redesigned workspace", () => {
    const workspace = read("components/prediction/PredictionWorkspace.tsx");
    const connectedTicket = read(
      "components/prediction/ConnectedTradeTicket.tsx",
    );

    assert.ok(workspace.includes("<ConnectedTradeTicket"));
    assert.ok(!workspace.includes("const reviewHref ="));
    assert.ok(connectedTicket.includes("api.previewOrder"));
    assert.ok(connectedTicket.includes("api.placeOrder"));
    assert.ok(connectedTicket.includes("resolveIdempotencyKey"));
    assert.ok(connectedTicket.includes("api.getPositions"));
    assert.ok(connectedTicket.includes("getBalance"));
  });

  it("restores the complete backend market directory on predict", () => {
    const workspace = read("components/prediction/PredictionWorkspace.tsx");
    const catalog = read("components/prediction/AllMarketsSection.tsx");

    assert.ok(workspace.includes("<AllMarketsSection"));
    assert.ok(workspace.includes("available-markets-heading"));
    assert.ok(catalog.includes("api.getMarkets"));
    assert.ok(catalog.includes("SEARCH_MARKETS_PLACEHOLDER"));
    assert.ok(catalog.includes("LOAD_MORE_MARKETS"));
  });

  it("loads seven in-place discovery ranking tabs and real movement from backend APIs", () => {
    const discover = read("discover/page.tsx");

    assert.ok(discover.includes("api.getDiscovery"));
    assert.ok(discover.includes("api.getMarkets"));
    assert.ok(discover.includes("api.getMarketPriceHistory"));
    assert.ok(discover.includes('"1d"'));
    assert.ok(discover.includes("movementFromHistory"));
    // Honest deltas: a row with no real series renders a dash, never an
    // invented number.
    assert.ok(discover.includes('movement && movement.direction !== "flat"'));
    assert.ok(discover.includes('id="discover-heading"'));
    assert.ok(discover.includes("buildDiscoverRankings"));
    assert.ok(discover.includes("activeRankingKey"));
    assert.ok(discover.includes("setActiveRankingKey"));
    assert.ok(discover.includes('role="tablist"'));
    assert.ok(discover.includes('role="tabpanel"'));
    assert.ok(discover.includes("<RankingBoard"));
    assert.ok(discover.includes("overflow-x-auto"));
    assert.ok(discover.includes("max-w-none"));
    assert.ok(!discover.includes("grid-cols-2 items-start gap-x-8 gap-y-10"));
    assert.ok(discover.includes("max-[1023px]:grid-cols-1"));
    assert.equal(DISCOVER_RANKING_SECTIONS.length, 7);
    assert.deepEqual(
      DISCOVER_RANKING_SECTIONS.map((section) => section.key),
      [
        "trending",
        "active",
        "discussed",
        "yes",
        "no",
        "gainers",
        "decliners",
      ],
    );
    assert.ok(
      DISCOVER_RANKING_SECTIONS.every(
        (section) => section.viewAllHref === "/predict",
      ),
    );
  });

  it("shares the terminal shell across predict and discover", () => {
    const route = read("lib/prediction-terminal.ts");
    const shell = read("components/AppShell.tsx");
    const topBar = read("components/prediction/TopBar.tsx");
    const mobileTabs = read("components/MobileTabBar.tsx");

    assert.ok(route.includes('pathname === "/discover"'));
    assert.ok(route.includes('pathname.startsWith("/market/")'));
    assert.ok(shell.includes("isPredictionTerminalRoute(pathname)"));
    assert.ok(topBar.includes("isPredictionTerminalRoute(pathname)"));
    assert.ok(mobileTabs.includes("isPredictionTerminalRoute(pathname)"));
    assert.ok(topBar.includes('{ href: "/predict", labelKey: "NAV_MARKETS" }'));
    assert.ok(
      topBar.includes('{ href: "/discover", labelKey: "NAV_TRENDING" }'),
    );
    assert.ok(mobileTabs.includes('labelKey: "NAV_TRENDING"'));
    assert.ok(topBar.includes('pathname.startsWith("/market/")'));
  });

  it("routes market detail through the same terminal shell", () => {
    for (const pathname of [
      "/predict",
      "/predict/",
      "/discover",
      "/discover/",
      "/market/IMP-TEST",
      "/market/IMP-TEST/",
    ]) {
      assert.equal(
        isPredictionTerminalRoute(pathname),
        true,
        `${pathname} should use the terminal shell`,
      );
    }

    for (const pathname of [null, "/", "/auth/login", "/portfolio"]) {
      assert.equal(
        isPredictionTerminalRoute(pathname),
        false,
        `${pathname ?? "null"} should keep its existing shell`,
      );
    }

    const marketPage = read("market/[ticker]/page.tsx");
    assert.ok(marketPage.includes("<TerminalCategoryRail"));
    assert.ok(marketPage.includes('variant="terminal"'));
  });
});
