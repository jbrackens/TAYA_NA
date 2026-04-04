import TransactionHistoryList from "../index";
import { render, screen } from "@testing-library/react";
import { useApi, UseApi } from "../../../services/api/api-service";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../core-theme";
import {
  WalletHistoryActionElement,
  WalletActionTypeEnum,
  WalletHistoryStatusEnum,
} from "@phoenix-ui/utils";

jest.mock("../../../services/api/api-service");

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useDispatch: jest.fn(),
  useSelector: jest.fn().mockImplementation(() => {
    return "Europe/London";
  }),
}));

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

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

const mockedUseApiContent = useApi as jest.Mock<UseApi>;

mockedUseApiContent.mockReturnValue({
  triggerApi: jest.fn(),
  isLoading: false,
  data: null,
  error: false,
});

beforeEach(() => {
  jest.clearAllMocks();
});

const transactions: Array<WalletHistoryActionElement> = [
  {
    category: WalletActionTypeEnum.WITHDRAWAL,
    createdAt: "2021-02-23T15:20:53.12803Z",
    postTransactionBalance: {
      amount: 1196,
      currency: "USD",
    },
    preTransactionBalance: {
      amount: 1201,
      currency: "USD",
    },
    status: WalletHistoryStatusEnum.PENDING,
    transactionAmount: {
      amount: 5,
      currency: "USD",
    },
    transactionId: "transactionId",
    walletId: "17e35b46-574f-4389-ae3b-2be4273285e4",
    paymentMethod: {
      type: `fakePaymentMethod`,
      adminPunterId: "asdasdsa",
      details: "details",
    },
  },
];

describe("transaction history list test", () => {
  test("displaying data: should display proper transaction amount", async () => {
    render(
      <ThemeProvider theme={theme}>
        <TransactionHistoryList transactions={transactions} isLoading={false} />
      </ThemeProvider>,
    );
    const transactionAmount = screen.getByRole("transactionAmount");
    expect(transactionAmount.textContent).toBe("$5.00");
  });

  test("displaying data: should display proper balance", async () => {
    render(
      <ThemeProvider theme={theme}>
        <TransactionHistoryList transactions={transactions} isLoading={false} />
      </ThemeProvider>,
    );
    const balance = screen.getByRole("balance");
    expect(balance.textContent).toBe("$1196.00");
  });

  // test("displaying data: should display createdAt time", async () => {
  //   render(
  //     <ThemeProvider theme={theme}>
  //       <TransactionHistoryList transactions={transactions} isLoading={false} />
  //     </ThemeProvider>,
  //   );
  //   const createdAt = screen.getByRole("createdAt");
  //   expect(createdAt.textContent).toBe("Feb 23, 2021 4:20 PM");
  // });

  test("displaying data: should display proper transaction Id", async () => {
    render(
      <ThemeProvider theme={theme}>
        <TransactionHistoryList transactions={transactions} isLoading={false} />
      </ThemeProvider>,
    );
    const transactionId = screen.getByRole("transactionId");
    expect(transactionId.textContent).toBe("transactionId");
  });

  test("displaying data: should display proper payment method", async () => {
    render(
      <ThemeProvider theme={theme}>
        <TransactionHistoryList transactions={transactions} isLoading={false} />
      </ThemeProvider>,
    );
    const paymentMethod = screen.getByRole("paymentMethod");
    expect(paymentMethod.textContent).toBe(`WITHDRAWAL_fakePaymentMethod`);
  });
});
