import { Id } from "../common/default";
export enum WalletActionTypeEnum {
  DEPOSIT = "DEPOSIT",
  WITHDRAWAL = "WITHDRAWAL",
  BET_SETTLEMENT = "BET_SETTLEMENT",
  BET_PLACEMENT = "BET_PLACEMENT",
  ADJUSTMENT_DEPOSIT = "ADJUSTMENT_DEPOSIT",
  ADJUSTMENT_WITHDRAWAL = "ADJUSTMENT_WITHDRAWAL",
}

export type WalletActionType =
  | WalletActionTypeEnum.BET_PLACEMENT
  | WalletActionTypeEnum.BET_SETTLEMENT
  | WalletActionTypeEnum.DEPOSIT
  | WalletActionTypeEnum.WITHDRAWAL
  | WalletActionTypeEnum.ADJUSTMENT_DEPOSIT
  | WalletActionTypeEnum.ADJUSTMENT_WITHDRAWAL;

type BetAction = {
  category:
    | WalletActionTypeEnum.BET_PLACEMENT
    | WalletActionTypeEnum.BET_SETTLEMENT;
  betId: string;
};

export enum PaymentMethodTypeEnum {
  CHEQUE = "CHEQUE_WITHDRAWAL_PAYMENT_METHOD",
  CASH = "CASH_WITHDRAWAL_PAYMENT_METHOD",
  BACKOFFICE_MANUAL = "BACKOFFICE_MANUAL_PAYMENT_METHOD",
  CARD = "CREDIT_CARD_PAYMENT_METHOD",
  NOT_APPLICABLE = "NOT_APPLICABLE_PAYMENT_METHOD",
}

type PaymentMethodType =
  | PaymentMethodTypeEnum.CHEQUE
  | PaymentMethodTypeEnum.BACKOFFICE_MANUAL
  | PaymentMethodTypeEnum.CARD
  | PaymentMethodTypeEnum.CASH
  | PaymentMethodTypeEnum.NOT_APPLICABLE;

type PaymentMethod = {
  adminPunterId: string;
  details: string;
  type: PaymentMethodType;
};

type ExternalAction = {
  category: WalletActionTypeEnum.DEPOSIT | WalletActionTypeEnum.WITHDRAWAL;
  externalId?: Id;
  paymentMethod: PaymentMethod;
};

export enum WalletHistoryStatusEnum {
  CANCELLED = "CANCELLED",
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
}

export type WalletHistoryStatus =
  | WalletHistoryStatusEnum.COMPLETED
  | WalletHistoryStatusEnum.PENDING
  | WalletHistoryStatusEnum.CANCELLED;

export type WalletTransactionStatus = {
  amount: number;
  currency: string;
};

export type WalletHistoryActionElement = {
  walletId: string;
  transactionId: Id;
  createdAt: string;
  status: WalletHistoryStatus;
  transactionAmount: WalletTransactionStatus;
  preTransactionBalance: WalletTransactionStatus;
  postTransactionBalance: WalletTransactionStatus;
} & (BetAction | ExternalAction);
