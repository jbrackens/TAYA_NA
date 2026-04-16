import { goApi } from "../client";
import type { GoPaginatedResponse } from "../types";
import type {
  GoWallet,
  GoDepositRequest,
  GoDepositResponse,
  GoWithdrawRequest,
  GoWithdrawResponse,
  GoTransaction,
  GoPaymentTransaction,
  GoTransactionsQuery,
} from "./wallet-types";

type RawGoWallet = Omit<GoWallet, "balance" | "reserved" | "available"> & {
  balance: number | string;
  reserved: number | string;
  available: number | string;
};

function normalizeGoWallet(data: RawGoWallet): GoWallet {
  return {
    ...data,
    balance: Number(data.balance ?? 0),
    reserved: Number(data.reserved ?? 0),
    available: Number(data.available ?? 0),
  };
}

/** Fetch the user's wallet balance. */
export async function getBalance(userId: string): Promise<GoWallet> {
  const { data } = await goApi.get<RawGoWallet>(
    `/api/v1/wallets/${userId}`,
  );
  return normalizeGoWallet(data);
}

/** Initiate a deposit. */
export async function deposit(
  userId: string,
  request: GoDepositRequest,
): Promise<GoDepositResponse> {
  const { data } = await goApi.post<GoDepositResponse>(
    `/api/v1/wallets/${userId}/deposits`,
    request,
  );
  return data;
}

/** Initiate a withdrawal. */
export async function withdraw(
  userId: string,
  request: GoWithdrawRequest,
): Promise<GoWithdrawResponse> {
  const { data } = await goApi.post<GoWithdrawResponse>(
    `/api/v1/wallets/${userId}/withdrawals`,
    request,
  );
  return data;
}

/** Fetch paginated transaction history. */
export async function getTransactions(
  userId: string,
  query: GoTransactionsQuery = {},
): Promise<GoPaginatedResponse<GoTransaction>> {
  const { data } = await goApi.get<GoPaginatedResponse<GoTransaction>>(
    `/api/v1/wallets/${userId}/transactions`,
    { params: query },
  );
  return data;
}

/** Fetch a single payment transaction by ID. */
export async function getPaymentTransaction(
  transactionId: string,
): Promise<GoPaymentTransaction> {
  const { data } = await goApi.get<GoPaymentTransaction>(
    `/payments/transactions/${transactionId}`,
  );
  return data;
}
