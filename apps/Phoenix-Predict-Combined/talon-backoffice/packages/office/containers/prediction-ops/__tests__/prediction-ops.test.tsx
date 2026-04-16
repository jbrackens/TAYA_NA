import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "styled-components";
import { PunterRoleEnum } from "@phoenix-ui/utils";
import PredictionOpsContainer from "..";
import { useApi, UseApi } from "../../../services/api/api-service";
import * as authUtils from "../../../utils/auth";

jest.mock("../../../services/api/api-service");
jest.mock("../../../utils/auth", () => ({
  resolveToken: jest.fn(),
  validateAndCheckEligibility: jest.fn(),
}));

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

const mockPush = jest.fn();

jest.mock("next/router", () => ({
  useRouter: () => ({
    push: mockPush,
    query: {},
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
const mockedResolveToken = authUtils.resolveToken as jest.Mock;
const mockedValidateAndCheckEligibility =
  authUtils.validateAndCheckEligibility as jest.Mock;

describe("PredictionOpsContainer", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockedResolveToken.mockReturnValue("token");
    mockedValidateAndCheckEligibility.mockReturnValue(true);

    const summaryResponse = {
      succeeded: true,
      data: {
        totalMarkets: 1,
        liveMarkets: 1,
        featuredMarkets: 1,
        totalVolumeUsd: 4825000,
        totalLiquidityUsd: 965000,
        totalOrders: 1,
        openOrders: 1,
        cancelledOrders: 0,
        categories: [{ key: "crypto", label: "Crypto" }],
        topMarkets: [],
      },
    };
    const marketsResponse = {
      succeeded: true,
      data: {
        totalCount: 1,
        markets: [
          {
            marketId: "pm-btc-120k-2026",
            slug: "bitcoin-120k-before-2026-close",
            title: "Will Bitcoin trade above $120k before December 31, 2026?",
            shortTitle: "BTC above $120k in 2026",
            categoryKey: "crypto",
            categoryLabel: "Crypto",
            status: "live",
            featured: true,
            live: true,
            closesAt: "2026-12-31T23:00:00Z",
            resolvesAt: "2026-12-31T23:59:00Z",
            volumeUsd: 4825000,
            liquidityUsd: 965000,
            participants: 1842,
            summary: "A flagship crypto prediction market.",
            insight: "ETF inflows and macro easing kept YES in control.",
            rules: ["Resolves YES if BTC trades above 120k before market close."],
            tags: ["Featured", "Live"],
            resolutionSource: "Composite BTC/USD reference basket",
            heroMetricLabel: "Implied YES",
            heroMetricValue: "62%",
            probabilityPercent: 62,
            priceChangePercent: 8.4,
            outcomes: [
              { outcomeId: "yes", label: "Yes", priceCents: 62, change1d: 4.2 },
              { outcomeId: "no", label: "No", priceCents: 38, change1d: -4.2 },
            ],
            relatedMarketIds: [],
          },
        ],
      },
    };
    const ordersResponse = {
      succeeded: true,
      data: {
        totalCount: 1,
        orders: [
          {
            orderId: "po-1001",
            punterId: "punter-001",
            marketId: "pm-btc-120k-2026",
            marketTitle: "BTC above $120k in 2026",
            categoryKey: "crypto",
            categoryLabel: "Crypto",
            outcomeId: "yes",
            outcomeLabel: "Yes",
            priceCents: 62,
            stakeUsd: 125,
            shares: 201.61,
            maxPayoutUsd: 201.61,
            maxProfitUsd: 76.61,
            status: "open",
            createdAt: "2026-03-06T14:18:00Z",
            updatedAt: "2026-03-06T14:18:00Z",
          },
        ],
      },
    };
    const auditLogsResponse = {
      succeeded: true,
      data: {
        data: [
          {
            id: "al:prediction:1",
            action: "prediction.market.updated",
            actorId: "admin-risk-1",
            targetId: "pm-btc-120k-2026",
            occurredAt: "2026-03-07T11:00:00Z",
            details: "Operator refreshed live pricing bands after upstream market move.",
            product: "prediction",
          },
        ],
      },
    };
    const lifecycleHistoryResponse = {
      succeeded: true,
      data: {
        marketId: "pm-btc-120k-2026",
        totalCount: 1,
        items: [
          {
            id: "plh-1001",
            marketId: "pm-btc-120k-2026",
            action: "open",
            marketStatusBefore: "open",
            marketStatusAfter: "open",
            performedBy: "seed-system",
            reason: "seed market bootstrap",
            performedAt: "2026-03-01T09:00:00Z",
          },
        ],
      },
    };
    const defaultResponse = {};

    mockedUseApi.mockImplementation((url: string) => {
      if (url === "admin/prediction/summary") {
        return [jest.fn().mockResolvedValue({}), false, summaryResponse, jest.fn(), jest.fn()];
      }
      if (url === "admin/prediction/markets") {
        return [jest.fn().mockResolvedValue({}), false, marketsResponse, jest.fn(), jest.fn()];
      }
      if (url === "admin/prediction/orders") {
        return [jest.fn().mockResolvedValue({}), false, ordersResponse, jest.fn(), jest.fn()];
      }
      if (url === "admin/prediction/markets/:id/lifecycle") {
        return [jest.fn().mockResolvedValue({}), false, lifecycleHistoryResponse, jest.fn(), jest.fn()];
      }
      if (url === "admin/audit-logs") {
        return [jest.fn().mockResolvedValue({}), false, auditLogsResponse, jest.fn(), jest.fn()];
      }
      return [jest.fn().mockResolvedValue({}), false, defaultResponse, jest.fn(), jest.fn()];
    });
  });

  test("renders prediction ops market table", async () => {
    render(
      <ThemeProvider theme={{ logo: "test.png" }}>
        <PredictionOpsContainer />
      </ThemeProvider>,
    );

    expect(await screen.findByText("TABLE_TITLE")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "Will Bitcoin trade above $120k before December 31, 2026?",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("ACTION_VIEW_AUDIT")).toBeInTheDocument();
  });

  test("shows read-only warning and disables lifecycle actions for non-admin roles", async () => {
    mockedValidateAndCheckEligibility.mockReturnValue(false);

    render(
      <ThemeProvider theme={{ logo: "test.png" }}>
        <PredictionOpsContainer />
      </ThemeProvider>,
    );

    expect(await screen.findByText("READ_ONLY_WARNING")).toBeInTheDocument();
    expect(screen.getByText("READ_ONLY_WARNING_DETAIL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ACTION_SUSPEND" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "ACTION_VIEW_AUDIT" })).toBeDisabled();
  });

  test("keeps operator sessions in oversight mode without audit pivots or exports", async () => {
    mockedValidateAndCheckEligibility.mockImplementation(
      (_token: string, roles: PunterRoleEnum[]) =>
        roles.includes(PunterRoleEnum.OPERATOR),
    );

    render(
      <ThemeProvider theme={{ logo: "test.png" }}>
        <PredictionOpsContainer />
      </ThemeProvider>,
    );

    expect(await screen.findByText("TABLE_TITLE")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ACTION_VIEW_AUDIT" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "ACTION_EXPORT_MARKETS" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "ACTION_EXPORT_ORDERS" })).not.toBeInTheDocument();
  });
});
