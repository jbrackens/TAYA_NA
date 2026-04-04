import TransactionHistoryList from "../index";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../core-theme";
import {
  PaymentMethodTypeEnum,
  WalletActionTypeEnum,
  WalletHistoryActionElement,
  WalletHistoryStatusEnum,
  WalletProductEnum,
} from "@phoenix-ui/utils";

jest.mock("react-redux", () => ({
  useSelector: jest.fn().mockReturnValue("Europe/London"),
  useDispatch: jest.fn(),
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

jest.mock("next/config", () => ({
  default: () => ({
    publicRuntimeConfig: {},
  }),
}));

jest.mock("antd", () => {
  const React = require("react");
  const passthrough = (tag = "div") => ({ children, ...props }: any) =>
    React.createElement(tag, props, children);
  const List: any = ({ dataSource = [], renderItem }: any) =>
    React.createElement(
      "div",
      {},
      dataSource.map((item: any, index: number) =>
        React.createElement("div", { key: index }, renderItem(item)),
      ),
    );
  List.Item = ({ children, extra }: any) =>
    React.createElement(
      "div",
      {},
      React.createElement("div", {}, children),
      React.createElement("div", {}, extra),
    );
  List.Item.Meta = ({ title }: any) => React.createElement("div", {}, title);

  return {
    List,
    Row: passthrough(),
    Col: passthrough(),
    Divider: passthrough("hr"),
    Spin: passthrough(),
    Button: passthrough("button"),
    Modal: passthrough(),
    Typography: { Title: passthrough("h1") },
    Collapse: Object.assign(passthrough(), { Panel: passthrough() }),
  };
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
    product: WalletProductEnum.SPORTSBOOK,
    status: WalletHistoryStatusEnum.PENDING,
    transactionAmount: {
      amount: 5,
      currency: "USD",
    },
    transactionId: "transactionId",
    walletId: "17e35b46-574f-4389-ae3b-2be4273285e4",
    externalId: "external-123",
    paymentMethod: {
      type: PaymentMethodTypeEnum.CARD,
      adminPunterId: "admin-1",
      details: "details",
    },
  },
];

describe("transaction history list", () => {
  test("renders transaction amount and balance", () => {
    render(
      <ThemeProvider theme={theme}>
        <TransactionHistoryList transactions={transactions} isLoading={false} />
      </ThemeProvider>,
    );

    expect(screen.getByRole("transactionAmount").textContent).toBe("$5.00");
    expect(screen.getByRole("balance").textContent).toBe("$1196.00");
  });

  test("renders transaction identifiers and payment method", () => {
    render(
      <ThemeProvider theme={theme}>
        <TransactionHistoryList transactions={transactions} isLoading={false} />
      </ThemeProvider>,
    );

    expect(screen.getByRole("transactionId").textContent).toBe("transactionId");
    expect(screen.getByRole("paymentMethod").textContent).toBe(
      "WITHDRAWAL_CREDIT_CARD_PAYMENT_METHOD",
    );
  });
});
