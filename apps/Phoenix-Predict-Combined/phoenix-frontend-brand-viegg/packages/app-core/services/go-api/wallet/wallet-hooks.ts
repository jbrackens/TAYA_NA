import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToken } from "@phoenix-ui/utils";
import { getBalance, deposit, withdraw, getTransactions, getPaymentTransaction } from "./wallet-client";
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
import type { AppError, GoPaginatedResponse } from "../types";

/** Query keys for wallet domain. */
export const walletKeys = {
  all: ["wallet"] as const,
  balance: (userId: string) => ["wallet", "balance", userId] as const,
  transactions: (userId: string, query: GoTransactionsQuery) =>
    ["wallet", "transactions", userId, query] as const,
};

/**
 * Fetch the current user's wallet balance.
 * Stale time: 30 seconds.
 */
export function useBalance() {
  const { getUserId } = useToken();
  const userId = getUserId();

  return useQuery<GoWallet, AppError>({
    queryKey: walletKeys.balance(userId || ""),
    queryFn: () => getBalance(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000,
  });
}

/**
 * Deposit funds into the user's wallet.
 * Invalidates wallet queries on success.
 */
export function useDeposit() {
  const queryClient = useQueryClient();
  const { getUserId } = useToken();

  return useMutation<GoDepositResponse, AppError, GoDepositRequest>({
    mutationFn: (request) => deposit(getUserId()!, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
  });
}

/**
 * Withdraw funds from the user's wallet.
 * Invalidates wallet queries on success.
 */
export function useWithdraw() {
  const queryClient = useQueryClient();
  const { getUserId } = useToken();

  return useMutation<GoWithdrawResponse, AppError, GoWithdrawRequest>({
    mutationFn: (request) => withdraw(getUserId()!, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
  });
}

/**
 * Fetch paginated transaction history.
 * Stale time: 60 seconds.
 */
export function useTransactions(query: GoTransactionsQuery = {}) {
  const { getUserId } = useToken();
  const userId = getUserId();
  const normalizedQuery: GoTransactionsQuery = {
    page: query.page ?? 1,
    limit: query.limit ?? 10,
    ...(query.type ? { type: query.type } : {}),
    ...(query.product ? { product: query.product } : {}),
    ...(query.start_date ? { start_date: query.start_date } : {}),
    ...(query.end_date ? { end_date: query.end_date } : {}),
  };

  return useQuery<GoPaginatedResponse<GoTransaction>, AppError>({
    queryKey: walletKeys.transactions(userId || "", normalizedQuery),
    queryFn: () => getTransactions(userId!, normalizedQuery),
    enabled: !!userId,
    staleTime: 60 * 1000,
    keepPreviousData: true,
  });
}

/** Fetch a single payment transaction. */
export function usePaymentTransaction(transactionId: string) {
  return useQuery<GoPaymentTransaction, AppError>({
    queryKey: ["wallet", "payment-transaction", transactionId],
    queryFn: () => getPaymentTransaction(transactionId),
    enabled: !!transactionId,
    staleTime: 5 * 1000,
  });
}
