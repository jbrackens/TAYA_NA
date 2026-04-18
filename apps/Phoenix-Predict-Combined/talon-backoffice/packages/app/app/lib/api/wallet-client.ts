import { apiClient } from "./client";

interface TimedCacheEntry<T> {
  data: T;
  ts: number;
}

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

interface WalletBalanceRaw {
  userId: string;
  balanceCents: number;
}

interface WalletLedgerEntryRaw {
  entryId: string;
  userId: string;
  type: string;
  amountCents: number;
  balanceCents: number;
  idempotencyKey: string;
  reason?: string;
  transactionTime: string;
}

interface WalletLedgerResponseRaw {
  userId: string;
  items: WalletLedgerEntryRaw[];
  total: number;
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

function centsToDollars(value?: number): number {
  return typeof value === "number" ? value / 100 : 0;
}

function mapLedgerType(type: string): string {
  if (type === "credit") return "deposit";
  if (type === "debit") return "withdrawal";
  return type;
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

const BALANCE_CACHE_TTL_MS = 15_000;
const balanceCache = new Map<
  string,
  { entry: TimedCacheEntry<Balance> | null; promise: Promise<Balance> | null }
>();

function isFresh<T>(
  entry: TimedCacheEntry<T> | null,
  ttlMs: number,
): entry is TimedCacheEntry<T> {
  return !!entry && Date.now() - entry.ts < ttlMs;
}

// Utility function to normalize snake_case to camelCase
function normalizeSnakeCase<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  if (Array.isArray(obj)) {
    return obj.map(normalizeSnakeCase) as unknown as Record<string, unknown>;
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
  const cached = balanceCache.get(userId);
  if (cached && isFresh(cached.entry, BALANCE_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    try {
      const raw = await apiClient.get<WalletBalanceRaw>(
        `/api/v1/wallet/${userId}`,
      );
      const availableBalance = centsToDollars(raw.balanceCents);
      const result: Balance = {
        userId: raw.userId,
        availableBalance,
        reservedBalance: 0,
        totalBalance: availableBalance,
        currency: "USD",
      };
      balanceCache.set(userId, {
        entry: { data: result, ts: Date.now() },
        promise: null,
      });
      return result;
    } catch {
      const raw = await apiClient.get<BalanceRaw>(`/api/v1/wallets/${userId}`);
      const result = normalizeSnakeCase(raw) as unknown as Balance;
      balanceCache.set(userId, {
        entry: { data: result, ts: Date.now() },
        promise: null,
      });
      return result;
    }
  })();

  balanceCache.set(userId, {
    entry: cached?.entry || null,
    promise,
  });

  return promise;
}

/**
 * Deposit funds to wallet
 */
export async function deposit(
  userId: string,
  request: DepositRequest,
): Promise<DepositResponse> {
  const raw = await apiClient.post<DepositResponseRaw>(
    "/api/v1/payments/deposit",
    { ...request, user_id: userId },
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
    "/api/v1/payments/withdraw",
    { ...request, user_id: userId },
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
    "/api/v1/payments/status",
    { transactionId },
  );
  return normalizeSnakeCase(raw) as unknown as TransactionStatus;
}

/**
 * Get transaction history for a user
 */
export async function getTransactions(
  userId: string,
  params?: GetTransactionsParams,
): Promise<GetTransactionsPaginatedResponse> {
  // Predict gateway exposes the wallet ledger at /api/v1/wallet/{id}/ledger.
  // The sportsbook fallback at /api/v1/wallets/{id}/transactions (plural)
  // doesn't exist here — removing it so we don't generate 404 noise.
  const ledgerParams: Record<string, string> = {};
  if (params?.limit) ledgerParams.limit = String(params.limit);
  const raw = await apiClient.get<WalletLedgerResponseRaw>(
    `/api/v1/wallet/${userId}/ledger`,
    ledgerParams,
  );

  const page = params?.page || 1;
  const limit = params?.limit || raw.items.length || 10;
  const filtered = raw.items.filter((item) =>
    params?.transaction_type
      ? mapLedgerType(item.type) === params.transaction_type
      : true,
  );
  const start = (page - 1) * limit;
  const transactions = filtered.slice(start, start + limit).map((item) => ({
    transactionId: item.entryId,
    userId: item.userId,
    type: mapLedgerType(item.type),
    amount: centsToDollars(item.amountCents),
    balanceBefore: centsToDollars(item.balanceCents - item.amountCents),
    balanceAfter: centsToDollars(item.balanceCents),
    currency: "USD",
    description: item.reason,
    createdAt: item.transactionTime,
  }));

  return {
    transactions,
    total: filtered.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
  };
}
