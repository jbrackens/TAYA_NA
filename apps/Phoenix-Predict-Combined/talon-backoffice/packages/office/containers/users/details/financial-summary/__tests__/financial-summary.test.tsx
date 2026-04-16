import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider } from "styled-components";

import { useApi, UseApi } from "../../../../../services/api/api-service";
import { FinancialSummary } from "..";

jest.mock("../../../../../services/api/api-service");

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

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

jest.mock("i18n", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn().mockImplementation(() => jest.fn()),
  useSelector: jest.fn().mockImplementation(() => true),
}));

const mockedUseApiContent = useApi as jest.Mock<UseApi>;

const AllTheProviders = ({ children }: { children?: ReactNode }) => (
  <ThemeProvider theme={{ logo: "test.png" }}>{children}</ThemeProvider>
);

const financialSummaryFixture = {
  currentBalance: { amount: 4158.79, currency: "USD" },
  openedBets: { amount: 203, currency: "USD" },
  pendingWithdrawals: { amount: 0.0, currency: "USD" },
  lifetimeDeposits: { amount: 3196.0, currency: "USD" },
  lifetimeWithdrawals: { amount: 6.0, currency: "USD" },
  netCash: { amount: 3190.0, currency: "USD" },
  productBreakdown: {
    sportsbook: {
      openExposure: { amount: 150, currency: "USD" },
    },
    prediction: {
      openExposure: { amount: 53, currency: "USD" },
      openOrders: 2,
      settledOrders: 4,
      cancelledOrders: 1,
    },
  },
};

const mockApiResponse = () =>
  mockedUseApiContent.mockReturnValue([
    jest.fn(),
    false,
    {
      succeeded: true,
      data: financialSummaryFixture,
      error: undefined,
    },
    jest.fn(),
    jest.fn(),
  ]);

describe("financial summary test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApiResponse();
  });

  test("should display current balance", async () => {
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });

    const currentBalance = await screen.getByRole("currentBalance");
    expect(currentBalance.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_CURRENT_BALANCE$4,158.79",
    );
  });

  test("should display opened bets", async () => {
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });

    const openedBets = await screen.getByRole("openedBets");
    expect(openedBets.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_OPEN_BETS$203",
    );
  });

  test("should display lifetime deposits", async () => {
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });

    const lifetimeDeposits = await screen.getByRole("lifetimeDeposits");
    expect(lifetimeDeposits.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_DEPOSITS$3,196",
    );
  });

  test("should display lifetime withdrawals", async () => {
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });

    const lifetimeWithdrawals = await screen.getByRole("lifetimeWithdrawals");
    expect(lifetimeWithdrawals.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_WITHDRAWALS$6",
    );
  });

  test("should display pending withdrawals", async () => {
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });

    const pendingWithdrawals = await screen.getByRole("pendingWithdrawals");
    expect(pendingWithdrawals.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_PENDING_WITHDRAWALS$0",
    );
  });

  test("should display summary profit", async () => {
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });

    const summaryProfit = await screen.getByRole("summaryProfit");
    expect(summaryProfit.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_PROFIT$3,190",
    );
  });

  test("should display sportsbook and prediction exposure breakdown", async () => {
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });

    const sportsbookOpenExposure = await screen.getByRole(
      "sportsbookOpenExposure",
    );
    const predictionOpenExposure = await screen.getByRole(
      "predictionOpenExposure",
    );

    expect(sportsbookOpenExposure.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_SPORTSBOOK_EXPOSURE$150",
    );
    expect(predictionOpenExposure.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_PREDICTION_EXPOSURE$53",
    );
  });

  test("should display prediction order counts", async () => {
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });

    const predictionOpenOrders = await screen.getByRole("predictionOpenOrders");
    const predictionSettledOrders = await screen.getByRole(
      "predictionSettledOrders",
    );
    const predictionCancelledOrders = await screen.getByRole(
      "predictionCancelledOrders",
    );

    expect(predictionOpenOrders.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_PREDICTION_OPEN_ORDERS2",
    );
    expect(predictionSettledOrders.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_PREDICTION_SETTLED_ORDERS4",
    );
    expect(predictionCancelledOrders.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_PREDICTION_CANCELLED_ORDERS1",
    );
  });
});

describe("financial summary Go snake_case normalization", () => {
  const goFinancialSummaryFixture = {
    current_balance: 4158.79,
    opened_bets: 203,
    pending_withdrawals: 0.0,
    lifetime_deposits: 3196.0,
    lifetime_withdrawals: 6.0,
    net_cash: 3190.0,
    product_breakdown: {
      sportsbook: {
        open_exposure: 150,
      },
      prediction: {
        open_exposure: 53,
        open_orders: 2,
        settled_orders: 4,
        cancelled_orders: 1,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseApiContent.mockReturnValue([
      jest.fn(),
      false,
      {
        succeeded: true,
        data: goFinancialSummaryFixture,
        error: undefined,
      },
      jest.fn(),
      jest.fn(),
    ]);
  });

  test("should normalize Go snake_case balance to camelCase {amount, currency}", async () => {
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });

    const currentBalance = await screen.getByRole("currentBalance");
    expect(currentBalance.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_CURRENT_BALANCE$4,158.79",
    );
  });

  test("should normalize Go snake_case deposits and withdrawals", async () => {
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });

    const lifetimeDeposits = await screen.getByRole("lifetimeDeposits");
    expect(lifetimeDeposits.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_DEPOSITS$3,196",
    );

    const lifetimeWithdrawals = await screen.getByRole("lifetimeWithdrawals");
    expect(lifetimeWithdrawals.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_WITHDRAWALS$6",
    );
  });

  test("should normalize Go snake_case product breakdown", async () => {
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });

    const sportsbookOpenExposure = await screen.getByRole(
      "sportsbookOpenExposure",
    );
    expect(sportsbookOpenExposure.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_SPORTSBOOK_EXPOSURE$150",
    );

    const predictionOpenOrders = await screen.getByRole("predictionOpenOrders");
    expect(predictionOpenOrders.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_PREDICTION_OPEN_ORDERS2",
    );
  });
});
