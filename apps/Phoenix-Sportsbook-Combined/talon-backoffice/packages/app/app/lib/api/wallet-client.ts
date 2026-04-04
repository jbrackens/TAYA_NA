import { apiClient } from "./client";

// Request types
export interface DepositRequest {
  amount: number;
  payment_method: string;
  currency?: string;
}

export interface WithdrawRequest {
  amount: number;
  payment_method: string;
  currency?: string;
}

export interface GetTransactionsParams {
  page?: number;
  limit?: number;
  transaction_type?: string;
}

// Response types (Go API uses snake_case)
interface BalanceRaw {
  user_id: string;
  available_balance: number;
  reserved_balance: number;
  total_balance: number;
  currency: string;
}

interface DepositResponseRaw {
  transaction_id: string;
  user_id: string;
  amount: number;
  status: string;
  payment_method: string;
  currency: string;
  created_at: string;
  updated_at: string;
  redirect_url?: string;
  requires_redirect?: boolean;
}

interface WithdrawResponseRaw {
  transaction_id: string;
  user_id: string;
  amount: number;
  status: string;
  payment_method: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface TransactionRaw {
  transaction_id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  currency: string;
  description?: string;
  created_at: string;
}

interface GetTransactionsPaginatedResponseRaw {
  transactions: TransactionRaw[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Normalized response types (camelCase)
export interface Balance {
  userId: string;
  availableBalance: number;
  reservedBalance: number;
  totalBalance: number;
  currency: string;
}

export interface DepositResponse {
  transactionId: string;
  userId: string;
  amount: number;
  status: string;
  paymentMethod: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
  redirectUrl?: string;
  requiresRedirect?: boolean;
}

export interface WithdrawResponse {
  transactionId: string;
  userId: string;
  amount: number;
  status: string;
  paymentMethod: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  transactionId: string;
  userId: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  currency: string;
  description?: string;
  createdAt: string;
}

export interface GetTransactionsPaginatedResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Transaction status types (for polling pending deposits)
interface TransactionStatusRaw {
  transaction_id: string;
  status: string;
  amount: number;
  updated_at: string;
}

export interface TransactionStatus {
  transactionId: string;
  status: string;
  amount: number;
  updatedAt: string;
}

// Utility function to normalize snake_case to camelCase
function normalizeSnakeCase<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  if (Array.isArray(obj)) {
    return (obj.map(normalizeSnakeCase) as unknown) as Record<string, unknown>;
  }
  if (obj !== null && typeof obj === "object") {
    return Object.entries(obj).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter: string) =>
          letter.toUpperCase(),
        );
        acc[camelKey] =
          typeof value === "object" && value !== null
            ? normalizeSnakeCase(value as Record<string, unknown>)
            : value;
        return acc;
      },
      {},
    );
  }
  return obj;
}

/**
 * Get wallet balance for a user
 */
export async function getBalance(userId: string): Promise<Balance> {
  const raw = await apiClient.get<BalanceRaw>(`/api/v1/wallets/${userId}`);
  return normalizeSnakeCase(raw);
}

/**
 * Deposit funds to wallet
 */
export async function deposit(
  userId: string,
  request: DepositRequest,
): Promise<DepositResponse> {
  const raw = await apiClient.post<DepositResponseRaw>(
    `/api/v1/wallets/${userId}/deposit`,
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Withdraw funds from wallet
 */
export async function withdraw(
  userId: string,
  request: WithdrawRequest,
): Promise<WithdrawResponse> {
  const raw = await apiClient.post<WithdrawResponseRaw>(
    `/api/v1/wallets/${userId}/withdraw`,
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Get transaction status by transaction ID (used for polling pending deposits)
 */
export async function getTransactionStatus(
  transactionId: string,
): Promise<TransactionStatus> {
  const raw = await apiClient.get<TransactionStatusRaw>(
    `/api/v1/wallets/transactions/${transactionId}`,
  );
  return (normalizeSnakeCase(raw) as unknown) as TransactionStatus;
}

/**
 * Get transaction history for a user
 */
export async function getTransactions(
  userId: string,
  params?: GetTransactionsParams,
): Promise<GetTransactionsPaginatedResponse> {
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);
  if (params?.transaction_type)
    queryParams.transaction_type = params.transaction_type;

  const raw = await apiClient.get<GetTransactionsPaginatedResponseRaw>(
    `/api/v1/wallets/${userId}/transactions`,
    queryParams,
  );
  return normalizeSnakeCase(raw);
}
