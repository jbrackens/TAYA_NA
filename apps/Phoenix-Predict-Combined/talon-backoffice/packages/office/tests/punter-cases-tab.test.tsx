import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  PunterProfile,
  type PlayerCaseRow,
} from "../app/components/users/PunterProfile";

// GAP-35 Cases tab over the GAP-32 cross-domain case center (§19). Component
// test: renders PunterProfile with the cases prop, opens the tab, asserts the
// player's cases render.

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

const cases: PlayerCaseRow[] = [
  {
    id: "aml-7",
    type: "aml",
    title: "Structuring review",
    status: "investigating",
    priority: "high",
    openedBy: "compliance-1",
    createdAt: "2026-03-01T00:00:00Z",
  },
];

describe("PunterProfile cases tab", () => {
  it("lists the player's cases when the Cases tab is opened", () => {
    render(<PunterProfile punter={punter} cases={cases} />);
    fireEvent.click(screen.getByTestId("profile-cases-tab"));
    const content = within(screen.getByTestId("profile-cases-content"));
    expect(content.getByText("Structuring review")).toBeTruthy();
    expect(content.getByText("investigating")).toBeTruthy();
    expect(content.getByText("aml")).toBeTruthy();
    expect(content.getByTestId("case-row")).toBeTruthy();
  });

  it("shows an empty message when the player has no cases", () => {
    render(<PunterProfile punter={punter} cases={[]} />);
    fireEvent.click(screen.getByTestId("profile-cases-tab"));
    const content = within(screen.getByTestId("profile-cases-content"));
    expect(content.getByText(/No compliance cases/i)).toBeTruthy();
  });
});
