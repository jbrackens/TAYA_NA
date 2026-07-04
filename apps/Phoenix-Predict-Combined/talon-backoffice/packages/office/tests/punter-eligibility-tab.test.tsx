import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  PunterProfile,
  type PlayerMarketEligibilityRow,
} from "../app/components/users/PunterProfile";

// GAP-93 (§15 per-trader account view): the Market Eligibility tab renders the
// player's per-restricted-market standing from the admin market-eligibility
// route (compliance:read). Component test: opens the tab, asserts eligible vs
// ineligible rows render, plus the empty state.

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

const eligibility: PlayerMarketEligibilityRow[] = [
  {
    marketId: "mkt-us-only",
    requiredTags: [10, 11],
    missingTags: [11],
    eligible: false,
  },
  {
    marketId: "mkt-open",
    requiredTags: [10],
    missingTags: [],
    eligible: true,
  },
];

describe("PunterProfile market eligibility tab", () => {
  it("renders per-market eligible/ineligible standing", () => {
    render(<PunterProfile punter={punter} eligibility={eligibility} />);
    fireEvent.click(screen.getByTestId("profile-eligibility-tab"));
    const content = within(screen.getByTestId("profile-eligibility-content"));
    const rows = content.getAllByTestId("eligibility-row");
    expect(rows).toHaveLength(2);
    // Row 0: the restricted (ineligible) market, missing tag 11 surfaced.
    // ("Eligible" also appears as a column header, so scope to the row.)
    expect(within(rows[0]).getByText("mkt-us-only")).toBeTruthy();
    expect(within(rows[0]).getByText("Ineligible")).toBeTruthy();
    expect(within(rows[0]).getByText("11")).toBeTruthy();
    // Row 1: the eligible market.
    expect(within(rows[1]).getByText("Eligible")).toBeTruthy();
  });

  it("shows an empty message when no restricted-market rules apply", () => {
    render(<PunterProfile punter={punter} eligibility={[]} />);
    fireEvent.click(screen.getByTestId("profile-eligibility-tab"));
    const content = within(screen.getByTestId("profile-eligibility-content"));
    expect(content.getByText(/No restricted-market eligibility/i)).toBeTruthy();
  });
});
