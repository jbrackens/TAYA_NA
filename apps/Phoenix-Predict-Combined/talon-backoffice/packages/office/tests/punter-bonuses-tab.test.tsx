import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  PunterProfile,
  type PlayerBonusRow,
} from "../app/components/users/PunterProfile";

// GAP-35 (§10 Profile 360): the Bonuses/Rewards tab lists a player's bonus
// grants from GET /api/v1/admin/bonuses?user_id={id}. Component test — renders
// PunterProfile with the bonuses prop, opens the tab, asserts the grant renders.

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

const bonuses: PlayerBonusRow[] = [
  {
    bonusId: 7,
    campaignName: "Welcome Bonus",
    bonusType: "deposit_match",
    status: "active",
    grantedPointsCents: 50000,
    remainingPointsCents: 20000,
    playProgressPct: 60,
    grantedAt: "2026-03-01T00:00:00Z",
    expiresAt: "2026-04-01T00:00:00Z",
  },
];

describe("PunterProfile bonuses tab", () => {
  it("lists the player's bonuses when the Bonuses tab is opened", () => {
    render(<PunterProfile punter={punter} bonuses={bonuses} />);
    fireEvent.click(screen.getByTestId("profile-bonuses-tab"));
    const content = within(screen.getByTestId("profile-bonuses-content"));
    expect(content.getByText("Welcome Bonus")).toBeTruthy();
    expect(content.getByText("deposit_match")).toBeTruthy();
    expect(content.getByText("active")).toBeTruthy();
    // 50000 cents -> 500.00 pts (granted).
    expect(content.getByText(/500\.00 pts/)).toBeTruthy();
    expect(content.getByText(/60%/)).toBeTruthy();
    expect(content.getByTestId("bonus-row")).toBeTruthy();
  });

  it("shows an empty message when the player has no bonuses", () => {
    render(<PunterProfile punter={punter} bonuses={[]} />);
    fireEvent.click(screen.getByTestId("profile-bonuses-tab"));
    const content = within(screen.getByTestId("profile-bonuses-content"));
    expect(content.getByText(/No bonuses or rewards/i)).toBeTruthy();
  });
});
