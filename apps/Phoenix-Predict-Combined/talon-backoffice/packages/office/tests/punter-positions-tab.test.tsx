import { afterEach, describe, expect, it, vi } from "vitest";
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
    // GAP-99: mark 55c on a 40-share YES position avg 52c => (55-52)*40 = 120c
    currentPricePointsCents: 55,
    unrealizedPointsCents: 120,
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
    // GAP-99: per-position unrealized P/L surfaced (120c => +1.20 pts)
    const posRow = within(content.getByTestId("position-row"));
    expect(posRow.getByText("+1.20 pts")).toBeTruthy();
    // GAP-101: the order-cancel control is fail-closed (no canCancelOrders prop)
    expect(content.getByTestId("cancel-order-ord-1")).toBeDisabled();
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

  // Exposure is a SUM across positions — a multi-row case guards against a
  // summation bug the single-row case cannot catch (verifier #28 observation).
  it("sums exposure across multiple positions", () => {
    const multi: PlayerPositionRow[] = [
      { ...positions[0], id: "pos-1", totalCostPointsCents: 2080 },
      { ...positions[0], id: "pos-2", totalCostPointsCents: 1920 },
    ];
    render(<PunterProfile punter={punter} openOrders={[]} positions={multi} />);
    fireEvent.click(screen.getByTestId("profile-positions-tab"));
    const content = within(screen.getByTestId("profile-positions-content"));
    expect(content.getAllByTestId("position-row")).toHaveLength(2);
    // 2080c + 1920c = 4000c => 40.00 pts
    expect(content.getByTestId("positions-exposure").textContent).toContain(
      "40.00",
    );
  });

  // GAP-99: the unrealized column handles a negative mark-to-market and an
  // absent value ('—') — the two branches the positive-only case skipped
  // (verifier #31 LOW).
  it("renders negative and absent unrealized P/L", () => {
    const rows: PlayerPositionRow[] = [
      { ...positions[0], id: "pos-neg", unrealizedPointsCents: -240 },
      { ...positions[0], id: "pos-none", unrealizedPointsCents: undefined },
    ];
    render(<PunterProfile punter={punter} openOrders={[]} positions={rows} />);
    fireEvent.click(screen.getByTestId("profile-positions-tab"));
    const content = within(screen.getByTestId("profile-positions-content"));
    const cells = content.getAllByTestId("position-row");
    // -240c => -2.40 pts
    expect(within(cells[0]).getByText("-2.40 pts")).toBeTruthy();
    // undefined => em-dash placeholder
    expect(within(cells[1]).getByText("—")).toBeTruthy();
  });

  // GAP-101 (§16): a markets:edit caller can cancel a working order — after a
  // confirm, it routes through onAction("cancelOrder", {orderId}).
  describe("order cancel", () => {
    const realConfirm = window.confirm;
    afterEach(() => {
      window.confirm = realConfirm;
      vi.restoreAllMocks();
    });

    it("cancels a working order via onAction after confirmation (canCancelOrders)", () => {
      window.confirm = vi.fn(() => true);
      const onAction = vi.fn();
      render(
        <PunterProfile
          punter={punter}
          openOrders={openOrders}
          positions={positions}
          canCancelOrders
          onAction={onAction}
        />,
      );
      fireEvent.click(screen.getByTestId("profile-positions-tab"));
      const cancel = screen.getByTestId("cancel-order-ord-1");
      expect(cancel).not.toBeDisabled();
      fireEvent.click(cancel);
      expect(window.confirm).toHaveBeenCalled();
      expect(onAction).toHaveBeenCalledWith("cancelOrder", {
        orderId: "ord-1",
      });
    });

    it("does not cancel if the operator declines the confirm", () => {
      window.confirm = vi.fn(() => false);
      const onAction = vi.fn();
      render(
        <PunterProfile
          punter={punter}
          openOrders={openOrders}
          positions={positions}
          canCancelOrders
          onAction={onAction}
        />,
      );
      fireEvent.click(screen.getByTestId("profile-positions-tab"));
      fireEvent.click(screen.getByTestId("cancel-order-ord-1"));
      expect(onAction).not.toHaveBeenCalled();
    });
  });
});
