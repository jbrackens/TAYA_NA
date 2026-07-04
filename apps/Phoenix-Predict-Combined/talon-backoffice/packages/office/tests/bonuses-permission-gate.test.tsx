import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BonusesPage from "../app/(dashboard)/bonuses/page";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-84-residual (§29): bonus grants are finances:write server-side, so the
// Grant control is disabled for a read-only caller.

function mockFetch() {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    let body: unknown = {};
    if (url.includes("/campaigns"))
      body = {
        campaigns: [
          {
            id: 1,
            name: "Welcome",
            campaignType: "point_reward",
            status: "active",
            budgetPointsCents: null,
            spentPointsCents: 0,
            claimCount: 0,
          },
        ],
      };
    else if (url.includes("/bonuses")) body = { bonuses: [] };
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  }) as unknown as typeof fetch;
}

function renderBonuses(perms: string[]) {
  return render(
    <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
      <BonusesPage />
    </PermissionsContext.Provider>,
  );
}

describe("Bonuses page permission gate", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => mockFetch());
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("enables Grant for a finances:write caller", async () => {
    renderBonuses(["finances:write", "finances:read"]);
    expect(await screen.findByTestId("grant-submit")).not.toBeDisabled();
  });

  it("disables Grant for a read-only caller (no finances:write)", async () => {
    renderBonuses(["finances:read"]);
    expect(await screen.findByTestId("grant-submit")).toBeDisabled();
  });
});
