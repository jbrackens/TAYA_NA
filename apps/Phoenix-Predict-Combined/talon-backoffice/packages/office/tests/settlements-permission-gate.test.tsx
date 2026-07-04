import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { App } from "antd";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-95 slice 1 (§29 read-only permission scope / §17 Settlement Ops): the
// settlement Settle + Replay-Points controls mutate settlement state, so they are
// gated on settlements:resolve — a read-only caller (e.g. the Auditor) sees them
// DISABLED. The gateway still enforces the permission server-side; this is the
// §29 UI-consistency layer.

// vi.mock is hoisted above the module body, so the market fixture must be
// hoisted too (via vi.hoisted) to be referenceable inside the factory.
const { market } = vi.hoisted(() => ({
  market: {
    id: "mkt-1",
    ticker: "FED-CUT",
    title: "Fed cuts in July",
    status: "closed",
    yesPricePointsCents: 55,
    volumePointsCents: 123400,
    closeAt: "2026-06-30T00:00:00Z",
    settlementSourceKey: "manual",
    tianggeLifecycle: { label: "Closed" },
  },
}));

vi.mock("@phoenix-ui/api-client/src/prediction-client", () => ({
  createPredictionClient: () => ({
    getMarkets: vi.fn().mockResolvedValue({ data: [market] }),
    getDriftAlerts: vi.fn().mockResolvedValue({ data: [] }),
    replayIncompleteSettlements: vi.fn().mockResolvedValue({}),
    settleMarket: vi.fn().mockResolvedValue({}),
  }),
}));

import PredictionSettlementsContainer from "../containers/prediction-settlements";

function renderSettlements(perms: string[]) {
  return render(
    <App>
      <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
        <PredictionSettlementsContainer />
      </PermissionsContext.Provider>
    </App>,
  );
}

describe("Prediction settlements permission gate", () => {
  afterEach(() => vi.clearAllMocks());

  it("disables Settle + Replay Points for a read-only caller (no settlements:resolve)", async () => {
    renderSettlements(["markets:read"]);
    await screen.findByText("FED-CUT");
    expect(screen.getByRole("button", { name: /^settle$/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /replay points/i }),
    ).toBeDisabled();
  });

  it("enables Settle + Replay Points for a settlements:resolve caller", async () => {
    renderSettlements(["settlements:resolve"]);
    await screen.findByText("FED-CUT");
    expect(
      screen.getByRole("button", { name: /^settle$/i }),
    ).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: /replay points/i }),
    ).not.toBeDisabled();
  });
});
