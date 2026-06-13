import { FinancialSummary } from "..";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { useApi, UseApi } from "../../../../../services/api/api-service";
import "@testing-library/jest-dom";

jest.mock("../../../../../services/api/api-service");
//declared becuase of TypeError: window.matchMedia is not a function
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

const AllTheProviders = ({ children }: any) => {
  return <ThemeProvider theme={{ logo: "test.png" }}>{children}</ThemeProvider>;
};

beforeEach(() => {
  jest.clearAllMocks();
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

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn().mockImplementation(() => jest.fn()),
  useSelector: jest.fn().mockImplementation(() => {
    return true;
  }),
}));

const mockedUseApiContent = useApi as jest.Mock<UseApi>;

describe("financial summary test", () => {
  test("UsersDetailsLimits deposit: should display proper current balance", async () => {
    mockedUseApiContent.mockReturnValue([
      jest.fn(),
      false,
      {
        succeeded: true,
        data: {
          currentBalance: { amount: 4158.79, currency: "USD" },
          openedBets: { amount: 0.0, currency: "USD" },
          pendingWithdrawals: { amount: 0.0, currency: "USD" },
          lifetimeDeposits: { amount: 3196.0, currency: "USD" },
          lifetimeWithdrawals: { amount: 6.0, currency: "USD" },
          netCash: { amount: 3190.0, currency: "USD" },
        },
        error: undefined,
      },
      jest.fn(),
      jest.fn(),
    ]);
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });
    const currentBalance = await screen.getByRole("currentBalance");
    expect(currentBalance.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_CURRENT_BALANCE$4,158.79",
    );
  });

  test("UsersDetailsLimits deposit: should display proper opened bets", async () => {
    mockedUseApiContent.mockReturnValue([
      jest.fn(),
      false,
      {
        succeeded: true,
        data: {
          currentBalance: { amount: 4158.79, currency: "USD" },
          openedBets: { amount: 3, currency: "USD" },
          pendingWithdrawals: { amount: 0.0, currency: "USD" },
          lifetimeDeposits: { amount: 3196.0, currency: "USD" },
          lifetimeWithdrawals: { amount: 6.0, currency: "USD" },
          netCash: { amount: 3190.0, currency: "USD" },
        },
        error: undefined,
      },
      jest.fn(),
      jest.fn(),
    ]);
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });
    const openedBets = await screen.getByRole("openedBets");
    expect(openedBets.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_OPEN_BETS$3",
    );
  });

  test("UsersDetailsLimits deposit: should display proper lifetime deposits", async () => {
    mockedUseApiContent.mockReturnValue([
      jest.fn(),
      false,
      {
        succeeded: true,
        data: {
          currentBalance: { amount: 4158.79, currency: "USD" },
          openedBets: { amount: 3, currency: "USD" },
          pendingWithdrawals: { amount: 0.0, currency: "USD" },
          lifetimeDeposits: { amount: 3196.0, currency: "USD" },
          lifetimeWithdrawals: { amount: 6.0, currency: "USD" },
          netCash: { amount: 3190.0, currency: "USD" },
        },
        error: undefined,
      },
      jest.fn(),
      jest.fn(),
    ]);
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });
    const lifetimeDeposits = await screen.getByRole("lifetimeDeposits");
    expect(lifetimeDeposits.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_DEPOSITS$3,196",
    );
  });

  test("UsersDetailsLimits deposit: should display proper lifetime withdrawals", async () => {
    mockedUseApiContent.mockReturnValue([
      jest.fn(),
      false,
      {
        succeeded: true,
        data: {
          currentBalance: { amount: 4158.79, currency: "USD" },
          openedBets: { amount: 3, currency: "USD" },
          pendingWithdrawals: { amount: 0.0, currency: "USD" },
          lifetimeDeposits: { amount: 3196.0, currency: "USD" },
          lifetimeWithdrawals: { amount: 6.0, currency: "USD" },
          netCash: { amount: 3190.0, currency: "USD" },
        },
        error: undefined,
      },
      jest.fn(),
      jest.fn(),
    ]);
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });
    const lifetimeWithdrawals = await screen.getByRole("lifetimeWithdrawals");
    expect(lifetimeWithdrawals.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_LIFETIME_WITHDRAWALS$6",
    );
  });

  test("UsersDetailsLimits deposit: should display proper pending withdrawals", async () => {
    mockedUseApiContent.mockReturnValue([
      jest.fn(),
      false,
      {
        succeeded: true,
        data: {
          currentBalance: { amount: 4158.79, currency: "USD" },
          openedBets: { amount: 3, currency: "USD" },
          pendingWithdrawals: { amount: 0.0, currency: "USD" },
          lifetimeDeposits: { amount: 3196.0, currency: "USD" },
          lifetimeWithdrawals: { amount: 6.0, currency: "USD" },
          netCash: { amount: 3190.0, currency: "USD" },
        },
        error: undefined,
      },
      jest.fn(),
      jest.fn(),
    ]);
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });
    const pendingWithdrawals = await screen.getByRole("pendingWithdrawals");
    expect(pendingWithdrawals.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_PENDING_WITHDRAWALS$0",
    );
  });

  test("UsersDetailsLimits deposit: should display proper summary profit", async () => {
    mockedUseApiContent.mockReturnValue([
      jest.fn(),
      false,
      {
        succeeded: true,
        data: {
          currentBalance: { amount: 4158.79, currency: "USD" },
          openedBets: { amount: 3, currency: "USD" },
          pendingWithdrawals: { amount: 0.0, currency: "USD" },
          lifetimeDeposits: { amount: 3196.0, currency: "USD" },
          lifetimeWithdrawals: { amount: 6.0, currency: "USD" },
          netCash: { amount: 3190.0, currency: "USD" },
        },
        error: undefined,
      },
      jest.fn(),
      jest.fn(),
    ]);
    render(<FinancialSummary id="1" />, {
      wrapper: AllTheProviders,
    });
    const summaryProfit = await screen.getByRole("summaryProfit");
    expect(summaryProfit.textContent).toBe(
      "HEADER_CARD_FINANCIAL_SUMMARY_PROFIT$3,190",
    );
  });
});
