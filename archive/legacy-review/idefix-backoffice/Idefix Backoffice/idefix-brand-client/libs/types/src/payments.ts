export interface Payment {
  Amount: string;
  PaymentMethodName: string;
  Timestamp: string;
  TransactionTypeName: string;
  UniqueTransactionID: string;
}

export type PaymentMethod = {
  id: string;
  name: string;
  account: string;
  method: string;
  lowerLimit: number;
  upperLimit: number;
  lowerLimit_formatted: string;
  upperLimit_formatted: string;
  paymentAccountID: number;
  currencyISO: string;
  currencySymbol: string;
  title: string;
  copyrightText: string;
};

export interface Transaction {
  month: string;
  text: string;
}

export interface HistorySummary {
  deposits: string;
  withdrawals: string;
  total: string;
}

export interface TransactionHistory {
  payments: Payment[];
  transactions: Transaction[];
  summary: HistorySummary;
}
