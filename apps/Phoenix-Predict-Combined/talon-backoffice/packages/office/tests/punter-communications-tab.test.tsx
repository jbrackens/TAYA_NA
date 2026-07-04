import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  PunterProfile,
  type PlayerCommunicationRow,
} from "../app/components/users/PunterProfile";

// GAP-90 slice 1: Communications tab over the GAP-43 sent-communication history
// (§20 Notes, Documents & Communication History; Scenario 12). Component test:
// renders PunterProfile with the communications prop, opens the tab, asserts the
// player's sent communications render (and the empty state when there are none).

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

const communications: PlayerCommunicationRow[] = [
  {
    id: 1,
    channel: "email",
    templateKey: "kyc_reminder",
    subject: "Please complete your verification",
    body: "…",
    status: "sent",
    actorId: "support-1",
    createdAt: "2026-03-01T00:00:00Z",
  },
];

describe("PunterProfile communications tab", () => {
  it("lists the player's sent communications when the tab is opened", () => {
    render(<PunterProfile punter={punter} communications={communications} />);
    fireEvent.click(screen.getByTestId("profile-communications-tab"));
    const content = within(
      screen.getByTestId("profile-communications-content"),
    );
    expect(content.getByText("Please complete your verification")).toBeTruthy();
    expect(content.getByText("kyc_reminder")).toBeTruthy();
    expect(content.getByText("sent")).toBeTruthy();
    expect(content.getByTestId("communication-row")).toBeTruthy();
  });

  it("shows an empty message when the player has no communications", () => {
    render(<PunterProfile punter={punter} communications={[]} />);
    fireEvent.click(screen.getByTestId("profile-communications-tab"));
    const content = within(
      screen.getByTestId("profile-communications-content"),
    );
    expect(content.getByText(/No communications sent/i)).toBeTruthy();
  });
});
