import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  PunterProfile,
  type RiskTabData,
} from "../app/components/users/PunterProfile";
import { AccountActions } from "../app/components/users/AccountActions";

// GAP-102 (§29 read-only permission scope): the Profile-360 account-status +
// add-note controls gate on users:write (canManageStatus) and the risk
// recompute/override/clear controls gate on compliance:write (canManageRisk),
// fail-closed — a read-only caller sees them disabled. Same class as
// GAP-84/95/96/97/100.

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

const risk: RiskTabData = {
  effectiveTier: "low",
  computedTier: "low",
  score: 12,
  amlOpenAlertPoints: 0,
  screeningStatus: "clear",
};

describe("Profile-360 §29 permission gates (GAP-102)", () => {
  it("disables status + risk controls for a read-only caller (fail-closed defaults)", () => {
    render(<PunterProfile punter={punter} risk={risk} />);
    // status control (overview, always visible) — users:write
    expect(
      screen.getByRole("button", { name: /suspend account/i }),
    ).toBeDisabled();
    // risk controls — compliance:write
    fireEvent.click(screen.getByTestId("profile-risk-tab"));
    expect(screen.getByTestId("risk-recompute")).toBeDisabled();
  });

  it("enables status controls with users:write and risk controls with compliance:write", () => {
    render(
      <PunterProfile
        punter={punter}
        risk={risk}
        canManageStatus
        canManageRisk
      />,
    );
    expect(
      screen.getByRole("button", { name: /suspend account/i }),
    ).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("profile-risk-tab"));
    expect(screen.getByTestId("risk-recompute")).not.toBeDisabled();
  });

  it("gates risk independently of status (compliance:write only)", () => {
    render(<PunterProfile punter={punter} risk={risk} canManageRisk />);
    // no users:write -> status disabled
    expect(
      screen.getByRole("button", { name: /suspend account/i }),
    ).toBeDisabled();
    // compliance:write -> risk enabled
    fireEvent.click(screen.getByTestId("profile-risk-tab"));
    expect(screen.getByTestId("risk-recompute")).not.toBeDisabled();
  });

  // Reverse independence (verifier #32 LOW): users:write alone must NOT enable
  // the risk controls — catches an OR-wiring regression (canManageRisk ||
  // canManageStatus).
  it("gates status independently of risk (users:write only)", () => {
    render(<PunterProfile punter={punter} risk={risk} canManageStatus />);
    expect(
      screen.getByRole("button", { name: /suspend account/i }),
    ).not.toBeDisabled();
    // PunterProfile's own Add Note is users:write-gated too
    expect(
      screen.getByRole("button", { name: /^add note$/i }),
    ).not.toBeDisabled();
    fireEvent.click(screen.getByTestId("profile-risk-tab"));
    expect(screen.getByTestId("risk-recompute")).toBeDisabled();
  });

  // All THREE risk controls carry the compliance:write gate (verifier #32 LOW:
  // only recompute was asserted). overrideTier in the fixture makes
  // clear-override render; filling tier+reason isolates apply-override's gate.
  it("gates clear-override and apply-override on compliance:write", () => {
    const withOverride: RiskTabData = {
      ...risk,
      overrideTier: "prohibited",
      overrideReason: "SAR filed",
    };
    const { unmount } = render(
      <PunterProfile punter={punter} risk={withOverride} />,
    );
    fireEvent.click(screen.getByTestId("profile-risk-tab"));
    expect(screen.getByTestId("risk-clear-override")).toBeDisabled();
    fireEvent.change(screen.getByTestId("risk-override-tier"), {
      target: { value: "high" },
    });
    fireEvent.change(screen.getByTestId("risk-override-reason"), {
      target: { value: "aml alert" },
    });
    // tier + reason filled, so only the missing canManageRisk disables Apply
    expect(screen.getByTestId("risk-override-apply")).toBeDisabled();
    // PunterProfile's own Add Note stays disabled without users:write
    expect(screen.getByRole("button", { name: /^add note$/i })).toBeDisabled();
    unmount();

    render(<PunterProfile punter={punter} risk={withOverride} canManageRisk />);
    fireEvent.click(screen.getByTestId("profile-risk-tab"));
    expect(screen.getByTestId("risk-clear-override")).not.toBeDisabled();
    fireEvent.change(screen.getByTestId("risk-override-tier"), {
      target: { value: "high" },
    });
    fireEvent.change(screen.getByTestId("risk-override-reason"), {
      target: { value: "aml alert" },
    });
    expect(screen.getByTestId("risk-override-apply")).not.toBeDisabled();
  });
});

describe("AccountActions §29 permission gate (GAP-102)", () => {
  it("disables Suspend/Add-Note without users:write, enables with it", () => {
    const onAction = () => {};
    const { rerender } = render(
      <AccountActions currentStatus="active" onAction={onAction} />,
    );
    expect(screen.getByRole("button", { name: /suspend/i })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /add admin note/i }),
    ).toBeDisabled();

    rerender(
      <AccountActions
        currentStatus="active"
        onAction={onAction}
        canManageStatus
      />,
    );
    expect(screen.getByRole("button", { name: /suspend/i })).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: /add admin note/i }),
    ).not.toBeDisabled();
  });
});
