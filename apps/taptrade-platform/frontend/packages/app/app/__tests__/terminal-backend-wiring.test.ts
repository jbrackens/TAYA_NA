import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { isPredictionTerminalRoute } from "../lib/prediction-terminal";

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

  // Ink & lime step 5 (2026-07-26, Discover.dc.html 14a/14b): the
  // paginated getMarkets list + filter pills gave way to the featured
  // hero and two independent sections. The contract this test protects
  // is unchanged: everything on /discover comes from real backend data —
  // getDiscovery for the lists, the real /prices series for deltas.
  it("loads curated discovery sections and movements from backend APIs", () => {
    const discover = read("discover/page.tsx");

    assert.ok(discover.includes("api.getDiscovery"));
    assert.ok(discover.includes("api.getMarketPriceHistory"));
    assert.ok(discover.includes('"1d"'));
    assert.ok(discover.includes("movementFromHistory"));
    // Honest deltas: a row with no real series renders a dash, never an
    // invented number.
    assert.ok(discover.includes('movement == null || movement.direction === "flat"'));
    assert.ok(discover.includes('id="discover-heading"'));
    assert.ok(discover.includes('id="trending-heading"'));
    assert.ok(discover.includes('id="closing-heading"'));
    // Trending leads with the delta; closing-soon leads with time.
    assert.ok(discover.includes('lead="delta"'));
    assert.ok(discover.includes('lead="time"'));
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
