import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "antd";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-95 slice 2 (§29 read-only permission scope / §16 Market Ops): the market
// create / edit / lifecycle (open/pause/close/void) controls mutate market
// state, so they are gated on markets:edit — a read-only caller sees them
// DISABLED. The gateway still enforces server-side; this is the §29 UI layer.

const { openMarket } = vi.hoisted(() => ({
  openMarket: {
    id: "mkt-1",
    ticker: "FED-CUT",
    title: "Fed cuts in July",
    status: "open",
    executionMode: "amm",
    yesPricePointsCents: 55,
    volumePointsCents: 123400,
    closeAt: "2026-06-30T00:00:00Z",
    settlementSourceKey: "manual",
    eventId: "evt-1",
    tianggeLifecycle: { label: "Open" },
  },
}));

vi.mock("@phoenix-ui/api-client/src/prediction-client", () => ({
  createPredictionClient: () => ({
    getAdminMarkets: vi.fn().mockResolvedValue({ data: [openMarket] }),
    getCategories: vi.fn().mockResolvedValue([]),
    getEvents: vi.fn().mockResolvedValue({ data: [] }),
    getDriftAlerts: vi.fn().mockResolvedValue({ data: [] }),
  }),
}));

import PredictionMarketsContainer from "../containers/prediction-markets";

function renderMarkets(perms: string[]) {
  return render(
    <App>
      <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
        <PredictionMarketsContainer />
      </PermissionsContext.Provider>
    </App>,
  );
}

describe("Prediction markets permission gate", () => {
  afterEach(() => vi.clearAllMocks());

  it("disables create + lifecycle controls for a read-only caller (no markets:edit)", async () => {
    renderMarkets(["surveillance:read"]);
    await screen.findByText("FED-CUT");
    expect(
      screen.getByRole("button", { name: /create market/i }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /draft from article/i }),
    ).toBeDisabled();
    // per-row lifecycle button for an open market
    expect(screen.getByRole("button", { name: /pause/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /edit/i })).toBeDisabled();
    // Region opens the jurisdiction geo-policy editor — a mutation, so gated too.
    expect(screen.getByRole("button", { name: /region/i })).toBeDisabled();
  });

  it("enables create + lifecycle controls for a markets:edit caller", async () => {
    renderMarkets(["markets:edit"]);
    await screen.findByText("FED-CUT");
    expect(
      screen.getByRole("button", { name: /create market/i }),
    ).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /pause/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /edit/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /region/i })).not.toBeDisabled();
  });
});
