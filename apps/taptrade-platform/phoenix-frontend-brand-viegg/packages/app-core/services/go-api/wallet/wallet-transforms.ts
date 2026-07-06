import {
  PaymentMethodTypeEnum,
  WalletActionType,
  WalletActionTypeEnum,
  WalletHistoryActionElement,
  WalletHistoryStatus,
  WalletHistoryStatusEnum,
  WalletProduct,
  WalletProductEnum,
} from "@phoenix-ui/utils";
import type { PaginatedResponse } from "../../api/contracts";
import type { GoPaginatedResponse } from "../types";
import type { GoTransaction } from "./wallet-types";

const DEFAULT_CURRENCY = "USD";
type SupportedWalletHistoryCategory =
  | WalletActionTypeEnum.DEPOSIT
  | WalletActionTypeEnum.WITHDRAWAL
  | WalletActionTypeEnum.BET_SETTLEMENT
  | WalletActionTypeEnum.BET_PLACEMENT;

export function mapWalletActionTypeToGoTransactionType(
  value?: WalletActionType,
): string | undefined {
  switch (value) {
    case WalletActionTypeEnum.DEPOSIT:
      return "deposit";
    case WalletActionTypeEnum.WITHDRAWAL:
      return "withdrawal";
    case WalletActionTypeEnum.BET_PLACEMENT:
      return "bet_placed";
    case WalletActionTypeEnum.BET_SETTLEMENT:
      return "bet_settlement";
    default:
      return undefined;
  }
}

export function mapWalletProductToGoTransactionProduct(
  value?: WalletProduct,
): string | undefined {
  switch (value) {
    case WalletProductEnum.SPORTSBOOK:
      return "SPORTSBOOK";
    case WalletProductEnum.PREDICTION:
      return "PREDICTION";
    default:
      return undefined;
  }
}

export function transformGoTransactionsResponse(
  response: GoPaginatedResponse<GoTransaction>,
): PaginatedResponse<WalletHistoryActionElement> {
  const data = response.data.map(transformGoTransaction);
  return {
    data,
    totalCount: response.pagination.total,
    itemsPerPage: response.pagination.limit,
    currentPage: response.pagination.page,
    hasNextPage:
      response.pagination.page * response.pagination.limit <
      response.pagination.total,
  };
}

export function transformGoTransaction(
  transaction: GoTransaction,
): WalletHistoryActionElement {
  const category = mapGoTransactionType(transaction);
  const common = {
    walletId: transaction.wallet_id,
    transactionId: transaction.transaction_id,
    createdAt: transaction.timestamp,
    status: mapGoTransactionStatus(transaction.status),
    product:
      transaction.product === "PREDICTION"
        ? WalletProductEnum.PREDICTION
        : WalletProductEnum.SPORTSBOOK,
    transactionAmount: {
      amount: transaction.amount,
      currency: DEFAULT_CURRENCY,
    },
    preTransactionBalance: {
      amount: transaction.balance_before,
      currency: DEFAULT_CURRENCY,
    },
    postTransactionBalance: {
      amount: transaction.balance_after,
      currency: DEFAULT_CURRENCY,
    },
  };

  if (
    category === WalletActionTypeEnum.BET_PLACEMENT ||
    category === WalletActionTypeEnum.BET_SETTLEMENT
  ) {
    return {
      ...common,
      category,
      betId: transaction.reference || transaction.transaction_id,
    };
  }

  return {
    ...common,
    category,
    externalId:
      transaction.provider_reference ||
      transaction.reference ||
      transaction.transaction_id,
    paymentMethod: {
      adminPunterId: "",
      details:
        transaction.provider_reference ||
        transaction.provider ||
        transaction.reference ||
        "",
      type: mapGoPaymentMethodType(transaction),
    },
  };
}

function mapGoTransactionType(
  transaction: GoTransaction,
): SupportedWalletHistoryCategory {
  switch (transaction.type) {
    case "bet_place":
    case "bet_placed":
      return WalletActionTypeEnum.BET_PLACEMENT;
    case "bet_win":
    case "bet_refund":
      return WalletActionTypeEnum.BET_SETTLEMENT;
    case "withdrawal":
      return WalletActionTypeEnum.WITHDRAWAL;
    case "deposit":
      return WalletActionTypeEnum.DEPOSIT;
    default:
      return transaction.amount < 0
        ? WalletActionTypeEnum.WITHDRAWAL
        : WalletActionTypeEnum.DEPOSIT;
  }
}

function mapGoTransactionStatus(status: string): WalletHistoryStatus {
  switch (status.trim().toUpperCase()) {
    case "SUCCEEDED":
    case "COMPLETED":
    case "APPROVED":
    case "SETTLED":
    case "REFUNDED":
      return WalletHistoryStatusEnum.COMPLETED;
    case "PENDING":
    case "PENDING_APPROVAL":
    case "PENDING_REVIEW":
    case "PROCESSING":
    case "ACTION_REQUIRED":
    case "RETRYING":
      return WalletHistoryStatusEnum.PENDING;
    default:
      return WalletHistoryStatusEnum.CANCELLED;
  }
}

function mapGoPaymentMethodType(transaction: GoTransaction): PaymentMethodTypeEnum {
  const haystack = [
    transaction.provider,
    transaction.reference,
    transaction.provider_reference,
    transaction.metadata?.payment_method,
    transaction.metadata?.payment_method_type,
    transaction.metadata?.method,
  ]
    .map(stringifyUnknown)
    .join(" ")
    .toLowerCase();

  if (haystack.includes("cheque")) {
    return PaymentMethodTypeEnum.CHEQUE;
  }
  if (haystack.includes("cash")) {
    return PaymentMethodTypeEnum.CASH;
  }
  if (haystack.includes("manual") || haystack.includes("backoffice")) {
    return PaymentMethodTypeEnum.BACKOFFICE_MANUAL;
  }
  if (
    haystack.includes("card") ||
    haystack.includes("credit") ||
    haystack.includes("visa") ||
    haystack.includes("mastercard")
  ) {
    return PaymentMethodTypeEnum.CARD;
  }
  return PaymentMethodTypeEnum.NOT_APPLICABLE;
}

function stringifyUnknown(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}
