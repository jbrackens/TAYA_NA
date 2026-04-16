import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { useRouter } from "next/router";
import RiskManagementSummaryContainer from "..";
import { useApi, UseApi } from "../../../services/api/api-service";

jest.mock("../../../services/api/api-service");
jest.mock("next/router");

jest.mock("i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const mockedUseApi = useApi as jest.Mock<UseApi>;
const mockedUseRouter = useRouter as jest.Mock;

describe("RiskManagementSummaryContainer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("requests promo usage summary with URL filters and renders metrics", async () => {
    const triggerPromoUsage = jest.fn().mockResolvedValue({});
    const triggerCorrectionTasks = jest.fn().mockResolvedValue({});
    const triggerRiskPlayerScore = jest.fn().mockResolvedValue({});
    const triggerRiskSegments = jest.fn().mockResolvedValue({});
    mockedUseApi.mockImplementation((url: string) => {
      switch (url) {
        case "admin/promotions/usage":
          return [
            triggerPromoUsage,
            false,
            {
              succeeded: true,
              data: {
                summary: {
                  totalBets: 25,
                  totalStakeCents: 31000,
                  betsWithFreebet: 8,
                  betsWithOddsBoost: 10,
                  betsWithBoth: 4,
                  totalFreebetAppliedCents: 2000,
                  totalBoostedStakeCents: 12000,
                  uniqueUsers: 12,
                  uniqueFreebets: 3,
                  uniqueOddsBoosts: 2,
                  freebets: [],
                  oddsBoosts: [],
                },
              },
            },
            jest.fn(),
            jest.fn(),
          ];
        case "admin/wallet/corrections/tasks":
          return [
            triggerCorrectionTasks,
            false,
            {
              succeeded: true,
              data: {
                items: [],
                summary: {
                  open: 2,
                  resolved: 1,
                  suggestedAdjustSum: 450,
                },
              },
            },
            jest.fn(),
            jest.fn(),
          ];
        case "admin/risk/player-scores":
          return [
            triggerRiskPlayerScore,
            false,
            {
              succeeded: true,
              data: {
                userId: "u-11",
                churnScore: 66,
                ltvScore: 44,
                riskScore: 51,
                modelVersion: "risk-v1",
                generatedAt: "2026-03-05T09:00:00Z",
              },
            },
            jest.fn(),
            jest.fn(),
          ];
        case "admin/risk/segments":
          return [
            triggerRiskSegments,
            false,
            {
              succeeded: true,
              data: {
                items: [
                  {
                    userId: "u-11",
                    segmentId: "vip",
                    segmentReason: "value",
                    riskScore: 51,
                    hasManualOverride: true,
                    generatedAt: "2026-03-05T09:00:00Z",
                  },
                ],
              },
            },
            jest.fn(),
            jest.fn(),
          ];
        default:
          return [jest.fn(), false, {}, jest.fn(), jest.fn()];
      }
    });
    mockedUseRouter.mockReturnValue({
      query: {
        userId: "u-11",
        freebetId: "fb-77",
        oddsBoostId: "ob-21",
        breakdownLimit: "30",
      },
      push: jest.fn(),
    });

    render(<RiskManagementSummaryContainer />);

    await waitFor(() =>
      expect(triggerPromoUsage).toHaveBeenCalledWith(undefined, {
        query: {
          userId: "u-11",
          freebetId: "fb-77",
          oddsBoostId: "ob-21",
          breakdownLimit: 30,
        },
      }),
    );
    await waitFor(() =>
      expect(triggerCorrectionTasks).toHaveBeenCalledWith(undefined, {
        query: {
          includeScan: "true",
          userId: "u-11",
          limit: 25,
        },
      }),
    );
    await waitFor(() =>
      expect(triggerRiskSegments).toHaveBeenCalledWith(undefined, {
        query: {
          userId: "u-11",
          limit: 20,
        },
      }),
    );
    await waitFor(() =>
      expect(triggerRiskPlayerScore).toHaveBeenCalledWith(undefined, {
        query: {
          userId: "u-11",
        },
      }),
    );

    expect(screen.getByText("SUMMARY_TITLE")).toBeInTheDocument();
    expect(screen.getByText("RISK_INTELLIGENCE_TITLE")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  test("drills down into audit logs with aligned promo filters", async () => {
    const triggerApi = jest.fn().mockResolvedValue({});
    const triggerCorrectionTasks = jest.fn().mockResolvedValue({});
    const triggerRiskPlayerScore = jest.fn().mockResolvedValue({});
    const triggerRiskSegments = jest.fn().mockResolvedValue({});
    const push = jest.fn();
    mockedUseApi.mockImplementation((url: string) => {
      switch (url) {
        case "admin/promotions/usage":
          return [
            triggerApi,
            false,
            {
              succeeded: true,
              data: {
                summary: {
                  totalBets: 2,
                  freebets: [],
                  oddsBoosts: [],
                },
              },
            },
            jest.fn(),
            jest.fn(),
          ];
        case "admin/wallet/corrections/tasks":
          return [triggerCorrectionTasks, false, { succeeded: true, data: { items: [], summary: {} } }, jest.fn(), jest.fn()];
        case "admin/risk/player-scores":
          return [triggerRiskPlayerScore, false, { succeeded: true, data: {} }, jest.fn(), jest.fn()];
        case "admin/risk/segments":
          return [triggerRiskSegments, false, { succeeded: true, data: { items: [] } }, jest.fn(), jest.fn()];
        default:
          return [jest.fn(), false, {}, jest.fn(), jest.fn()];
      }
    });
    mockedUseRouter.mockReturnValue({
      query: {
        userId: "u-11",
        freebetId: "fb-77",
        oddsBoostId: "ob-21",
        breakdownLimit: "30",
      },
      push,
    });

    render(<RiskManagementSummaryContainer />);
    fireEvent.click(screen.getByText("OPEN_AUDIT_LOGS"));

    expect(push).toHaveBeenCalledWith({
      pathname: "/logs",
      query: {
        action: "bet.placed",
        userId: "u-11",
        freebetId: "fb-77",
        oddsBoostId: "ob-21",
        p: 1,
        limit: 20,
      },
    });
  });
});
