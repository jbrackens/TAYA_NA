import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  PunterProfile,
  type PlayerOpenOrderRow,
  type PlayerPositionRow,
} from "../app/components/users/PunterProfile";

// GAP-89 slice 2: Positions & Orders tab over the admin orders route (GAP-21)
// and the admin positions route (GAP-89 slice 1), §16 Prediction Market
// Operations. Component test: renders PunterProfile with openOrders + positions,
// opens the tab, asserts the rows + the exposure summary (and the empty states).

const punter = {
  id: "u-1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  createdAt: "2026-01-01T00:00:00Z",
  status: "active" as const,
  verificationStatus: "verified" as const,
  balance: 0,
  portfolioValue: 0,
  totalPredictions: 0,
  openPositions: 0,
  accuracyPct: 0,
  pnl: 0,
  unrealizedPnl: 0,
};

const openOrders: PlayerOpenOrderRow[] = [
  {
    id: "ord-1",
    marketId: "mkt-fed-cut",
    side: "yes",
    action: "buy",
    orderType: "limit",
    pricePointsCents: 55,
    quantity: 100,
    filledQuantity: 40,
    remainingQuantity: 60,
    status: "partial",
    createdAt: "2026-03-01T00:00:00Z",
  },
];

const positions: PlayerPositionRow[] = [
  {
    id: "pos-1",
    marketId: "mkt-fed-cut",
    side: "yes",
    quantity: 40,
    avgPricePointsCents: 52,
    totalCostPointsCents: 2080,
    realizedPointsCents: -125,
    reservedQuantity: 0,
    createdAt: "2026-03-01T00:00:00Z",
  },
];

describe("PunterProfile positions & orders tab", () => {
  it("lists working orders, positions, and the total exposure", () => {
    render(
      <PunterProfile
        punter={punter}
        openOrders={openOrders}
        positions={positions}
      />,
    );
    fireEvent.click(screen.getByTestId("profile-positions-tab"));
    const content = within(screen.getByTestId("profile-positions-content"));

    // working order row
    expect(content.getByTestId("open-order-row")).toBeTruthy();
    expect(content.getByText("partial")).toBeTruthy();
    // position row
    expect(content.getByTestId("position-row")).toBeTruthy();
    // exposure = sum of totalCostPointsCents (2080c => 20.80 pts)
    expect(content.getByTestId("positions-exposure").textContent).toContain(
      "20.80",
    );
  });

  it("shows empty states when the player has no orders or positions", () => {
    render(<PunterProfile punter={punter} openOrders={[]} positions={[]} />);
    fireEvent.click(screen.getByTestId("profile-positions-tab"));
    const content = within(screen.getByTestId("profile-positions-content"));
    expect(content.getByText(/No open orders/i)).toBeTruthy();
    expect(content.getByText(/No open positions/i)).toBeTruthy();
    // exposure of an empty book is 0.00 pts
    expect(content.getByTestId("positions-exposure").textContent).toContain(
      "0.00",
    );
  });
});
