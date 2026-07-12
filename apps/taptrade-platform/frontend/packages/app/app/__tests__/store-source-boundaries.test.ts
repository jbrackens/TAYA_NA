/**
 * Point Store — source boundaries.
 *
 * Pins the formatting discipline (point figures ONLY through lib/points,
 * USD prices ONLY through lib/usd — no local formatters, no stray
 * Intl/NumberFormat/toFixed in store surfaces), the E2E data-testid
 * contract, and the entry-point wiring (TopBar chip/button, TradeTicket
 * insufficient-balance link with validated return context, rewards and
 * portfolio cross-links, lazy i18n namespace registration).
 *
 * Run: npx tsx --test app/__tests__/store-source-boundaries.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const appRoot = resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(resolve(appRoot, rel), "utf-8");
}

const STORE_SURFACES = [
  "store/page.tsx",
  ...readdirSync(resolve(appRoot, "components/store"))
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => `components/store/${f}`),
];

const PRICE_RENDERING_SURFACES = [
  "store/page.tsx",
  "components/store/PackGrid.tsx",
  "components/store/OrderSummary.tsx",
  "components/store/DemoCheckout.tsx",
];

describe("store formatting boundaries", () => {
  it("store surfaces import point formatting only from lib/points", () => {
    for (const rel of STORE_SURFACES) {
      const source = read(rel);
      assert.ok(
        !source.includes("function formatPoints") &&
          !source.includes("function formatPointAmount"),
        `${rel} must not define a local point formatter`,
      );
      // No ÷100 unit bugs and no ad-hoc number rendering in store surfaces.
      assert.doesNotMatch(
        source,
        /\/\s*100(?!\d)/,
        `${rel} must not divide point values by 100`,
      );
      assert.ok(
        !source.includes("toFixed("),
        `${rel} must not roll its own number formatting`,
      );
      assert.ok(
        !source.includes("Intl.NumberFormat"),
        `${rel} must not instantiate its own currency formatter — lib/usd only`,
      );
      if (source.includes("formatPoints")) {
        assert.match(
          source,
          /from ["'](?:\.\.\/)+lib\/points["']/,
          `${rel} must import point formatting from lib/points`,
        );
      }
    }
  });

  it("USD prices render only through lib/usd formatUsdCents", () => {
    for (const rel of PRICE_RENDERING_SURFACES) {
      const source = read(rel);
      if (rel === "store/page.tsx") continue; // page delegates price rows
      assert.match(
        source,
        /import \{ formatUsdCents \} from ["'](?:\.\.\/)+lib\/usd["']/,
        `${rel} must source USD formatting from lib/usd`,
      );
      assert.ok(
        source.includes("formatUsdCents("),
        `${rel} should render prices via formatUsdCents`,
      );
    }
    const usd = read("lib/usd.ts");
    assert.ok(usd.includes('new Intl.NumberFormat("en-US"'));
    assert.ok(usd.includes('currency: "USD"'));
  });

  it("store client is the only store API surface and hits /api/v1/store/*", () => {
    const client = read("lib/api/store-client.ts");
    for (const route of [
      "/api/v1/store/packs",
      "/api/v1/store/checkout",
      "/api/v1/store/purchases",
    ]) {
      assert.ok(client.includes(route), `store-client should call ${route}`);
    }
    assert.ok(
      client.includes("resolveCheckoutIdempotency"),
      "store-client should export the checkout idempotency resolver",
    );
    assert.ok(
      client.includes("crypto.randomUUID()"),
      "idempotency keys mint via crypto.randomUUID",
    );
  });

  it("success flow invalidates the wallet balance cache and dispatches Redux", () => {
    const page = read("store/page.tsx");
    assert.ok(page.includes("invalidateBalanceCache(user.id)"));
    assert.ok(page.includes("dispatch(setCurrentBalance("));
    const walletClient = read("lib/api/wallet-client.ts");
    assert.ok(
      walletClient.includes("export function invalidateBalanceCache"),
      "wallet-client should expose invalidateBalanceCache",
    );
  });

  it("ships the E2E data-testid contract", () => {
    const grid = read("components/store/PackGrid.tsx");
    assert.ok(grid.includes("data-testid={`pack-card-${pack.id}`}"));
    const summary = read("components/store/OrderSummary.tsx");
    assert.ok(summary.includes('data-testid="order-summary"'));
    const checkout = read("components/store/DemoCheckout.tsx");
    for (const id of [
      "checkout-pay",
      "checkout-fail",
      "checkout-cancel",
      "checkout-delay",
    ]) {
      assert.ok(checkout.includes(`data-testid="${id}"`), `missing ${id}`);
    }
    const results = read("components/store/PurchaseResult.tsx");
    for (const id of [
      "purchase-success",
      "purchase-failed",
      "purchase-canceled",
      "purchase-pending",
      "return-to-market",
    ]) {
      assert.ok(results.includes(`testid="${id}"`), `missing ${id}`);
    }
  });

  it("wires the Add Points entry points", () => {
    const topBar = read("components/prediction/TopBar.tsx");
    assert.ok(topBar.includes('data-testid="add-points-topbar"'));
    assert.ok(topBar.includes('href="/store"'));

    const ticket = read("components/prediction/TradeTicket.tsx");
    assert.ok(ticket.includes('data-testid="add-points-tradeticket"'));
    assert.ok(
      ticket.includes("storeReturnSuffix("),
      "trade ticket must carry a VALIDATED return context to /store",
    );

    const portfolio = read("portfolio/page.tsx");
    assert.ok(portfolio.includes('data-testid="add-points-portfolio"'));
    const rewards = read("rewards/page.tsx");
    assert.ok(rewards.includes('data-testid="add-points-rewards"'));
    // Stale-TopBar fix: rewards claims must dispatch the fresh balance.
    assert.ok(rewards.includes("refreshHeaderBalance"));
    assert.ok(rewards.includes("dispatch(setCurrentBalance("));

    // MobileTabBar deliberately unchanged: five tabs is full.
    const tabBar = read("components/MobileTabBar.tsx");
    assert.ok(!tabBar.includes('"/store"'));
  });

  it("registers the lazy store i18n namespace with all six locale bundles", () => {
    const config = read("lib/i18n/config.ts");
    assert.match(config, /"store",/);
    const initSlice = config.slice(
      config.indexOf("const INIT_NAMESPACES"),
      config.indexOf("const EN_RESOURCES"),
    );
    assert.ok(
      !initSlice.includes('"store"'),
      "store stays a lazy namespace, not an INIT namespace",
    );
    for (const lng of ["en", "zh-Hans", "zh-Hant", "tl", "ms", "id"]) {
      const bundle = JSON.parse(
        read(`../public/static/locales/${lng}/store.json`),
      ) as Record<string, unknown>;
      assert.ok(bundle.summary, `${lng}/store.json should ship summary keys`);
      assert.ok(bundle.checkout, `${lng}/store.json should ship checkout keys`);
      assert.ok(bundle.result, `${lng}/store.json should ship result keys`);
    }
  });

  it("keeps the store route login-protected in the proxy", () => {
    const proxy = read("../proxy.ts");
    const protectedRoutes = proxy.slice(
      proxy.indexOf("const PROTECTED_ROUTES = ["),
      proxy.indexOf("];", proxy.indexOf("const PROTECTED_ROUTES = [")),
    );
    assert.ok(protectedRoutes.includes('"/store"'));
  });

  it("debounces the trade ticket preview with stale-response protection", () => {
    const ticket = read("components/prediction/TradeTicket.tsx");
    assert.ok(ticket.includes("PREVIEW_DEBOUNCE_MS"));
    assert.match(
      ticket,
      /setTimeout\(\(\) => \{\s*onPreview\(side, requestedQuantity, opts\)/,
      "preview call should fire behind the debounce timer",
    );
    assert.match(
      ticket,
      /cancelled = true;\s*clearTimeout\(timer\);/,
      "cleanup must cancel both the timer and in-flight response acceptance",
    );
  });
});
