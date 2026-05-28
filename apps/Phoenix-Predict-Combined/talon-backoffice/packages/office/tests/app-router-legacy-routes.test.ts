import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const officeRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function exists(rel: string): boolean {
  return existsSync(resolve(officeRoot, rel));
}

function read(rel: string): string {
  return readFileSync(resolve(officeRoot, rel), "utf-8");
}

describe("legacy office Pages Router entrypoints", () => {
  const retiredPages = [
    "pages/index.tsx",
    "pages/logs/index.tsx",
    "pages/not-authorized/index.tsx",
    "pages/terms-and-conditions/index.tsx",
    "pages/account/settings/index.tsx",
    "pages/account/security/index.tsx",
  ];

  it("keeps user-facing legacy routes out of the Pages Router", () => {
    for (const rel of retiredPages) {
      expect(exists(rel), `${rel} should stay retired`).toBe(false);
    }
  });

  it("replaces retired entrypoints with App Router routes", () => {
    for (const rel of [
      "app/page.tsx",
      "app/logs/page.tsx",
      "app/not-authorized/page.tsx",
      "app/terms-and-conditions/page.tsx",
      "app/(dashboard)/cashier/page.tsx",
      "app/account/settings/page.tsx",
      "app/account/security/page.tsx",
    ]) {
      expect(exists(rel), `${rel} should exist`).toBe(true);
    }
  });

  it("preserves scoped audit-log filters on /logs redirects", () => {
    const logsPage = read("app/logs/page.tsx");
    expect(logsPage).toContain("new URLSearchParams");
    expect(logsPage).toContain("query.append");
    expect(logsPage).toContain('redirect(`/audit-logs');
  });
});

describe("retired App Router sportsbook and prototype surfaces", () => {
  it("keeps beta-hidden dead dashboard routes as redirects", () => {
    const redirects = [
      ["app/(dashboard)/campaigns/page.tsx", 'redirect("/dashboard")'],
      ["app/(dashboard)/reports/page.tsx", 'redirect("/dashboard")'],
      [
        "app/(dashboard)/risk-management/page.tsx",
        'redirect("/prediction-admin/risk")',
      ],
    ] as const;

    for (const [rel, redirectCall] of redirects) {
      expect(read(rel), `${rel} should remain a redirect`).toContain(
        redirectCall,
      );
    }
  });

  it("keeps sportsbook-era dashboard widgets out of source", () => {
    for (const rel of [
      "app/components/dashboard/ActiveBetsWidget.tsx",
      "app/components/dashboard/LiveMatchesWidget.tsx",
      "app/components/dashboard/RevenueWidget.tsx",
      "app/components/dashboard/RiskAlertsWidget.tsx",
      "app/components/dashboard/RecentActivityWidget.tsx",
      "app/hooks/useTradingWebSocket.ts",
    ]) {
      expect(exists(rel), `${rel} should stay retired`).toBe(false);
    }
  });

  it("keeps active barrels limited to prediction-safe exports", () => {
    const dashboardBarrel = read("app/components/dashboard/index.ts");
    expect(dashboardBarrel).toContain(
      'export { DashboardLayout } from "./DashboardLayout"',
    );
    for (const retiredExport of [
      "RevenueWidget",
      "ActiveBetsWidget",
      "LiveMatchesWidget",
      "RiskAlertsWidget",
      "RecentActivityWidget",
    ]) {
      expect(dashboardBarrel).not.toContain(retiredExport);
    }

    const hooksBarrel = read("app/hooks/index.ts");
    expect(hooksBarrel).toContain('export { useConfirm } from "./useConfirm"');
    expect(hooksBarrel).not.toContain("useTradingWebSocket");
  });

  it("mounts the closed Alpha cashier as a live dashboard route", () => {
    const cashierPage = read("app/(dashboard)/cashier/page.tsx");
    const dashboardLayout = read("app/(dashboard)/layout.tsx");
    const appLayout = read("app/layout.tsx");

    expect(cashierPage).toContain("CashierReviewPanel");
    expect(dashboardLayout).toContain('href: "/cashier"');
    expect(dashboardLayout).toContain('label: "Cashier"');
    expect(appLayout).toContain("AppRouterProviders");
  });
});
