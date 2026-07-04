import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LoyaltyDetailPage from "../app/(dashboard)/loyalty/[id]/page";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-97 (§29 read-only permission scope): the loyalty manual points-adjustment
// control moves balances (backend gates finances:write), so the "Apply
// Adjustment" button gates fail-closed on can("finances:write") — a read-only
// caller sees it disabled. Same class as GAP-84/GAP-95/GAP-96.

vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "player-1" }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

const account = {
  accountId: "acc-1",
  playerId: "player-1",
  rank: 2,
  rankName: "Silver",
  nextRank: 3,
  nextRankName: "Gold",
  pointsBalance: 1200,
  pointsEarnedLifetime: 5000,
  pointsEarned7D: 100,
  pointsEarned30D: 400,
  pointsEarnedCurrentMonth: 400,
  xpToNextRank: 800,
  unit: "PTS",
  createdAt: "2026-01-01T00:00:00Z",
};

function mockFetch() {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/loyalty/accounts/")) {
      return Promise.resolve(
        new Response(JSON.stringify({ account, ledger: [], tiers: [] }), {
          status: 200,
        }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ items: [] }), { status: 200 }),
    );
  }) as unknown as typeof fetch;
}

function renderPage(perms: string[]) {
  return render(
    <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
      <LoyaltyDetailPage />
    </PermissionsContext.Provider>,
  );
}

describe("Loyalty adjustment permission gate", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => mockFetch());
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("disables Apply Adjustment for a read-only caller (no finances:write)", async () => {
    renderPage(["markets:read"]);
    await screen.findByTestId("loyalty-adjust-submit");
    expect(screen.getByTestId("loyalty-adjust-submit")).toBeDisabled();
  });

  it("enables Apply Adjustment for a finances:write caller", async () => {
    renderPage(["finances:write"]);
    await screen.findByTestId("loyalty-adjust-submit");
    expect(screen.getByTestId("loyalty-adjust-submit")).not.toBeDisabled();
  });
});
