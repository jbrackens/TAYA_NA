import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

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

  it("loads curated trending signals and movements from backend APIs", () => {
    const discover = read("discover/page.tsx");

    assert.ok(discover.includes("api.getMarkets"));
    assert.ok(discover.includes("api.getDiscovery"));
    assert.ok(discover.includes("api.getMarketPriceHistory"));
    assert.ok(discover.includes('"1d"'));
    assert.ok(discover.includes("meta.total"));
    assert.ok(discover.includes('useState<MarketFilter>("trending")'));
    assert.ok(!discover.includes('{ key: "all", label: "All" }'));
    assert.ok(discover.includes('id="trending-heading"'));
  });

  it("shares the terminal shell across predict and discover", () => {
    const route = read("lib/prediction-terminal.ts");
    const shell = read("components/AppShell.tsx");
    const topBar = read("components/prediction/TopBar.tsx");
    const mobileTabs = read("components/MobileTabBar.tsx");

    assert.ok(route.includes('pathname === "/discover"'));
    assert.ok(shell.includes("isPredictionTerminalRoute(pathname)"));
    assert.ok(topBar.includes("isPredictionTerminalRoute(pathname)"));
    assert.ok(mobileTabs.includes("isPredictionTerminalRoute(pathname)"));
    assert.ok(topBar.includes('{ href: "/predict", labelKey: "NAV_MARKETS" }'));
    assert.ok(
      topBar.includes('{ href: "/discover", labelKey: "NAV_TRENDING" }'),
    );
    assert.ok(mobileTabs.includes('labelKey: "NAV_TRENDING"'));
  });
});
