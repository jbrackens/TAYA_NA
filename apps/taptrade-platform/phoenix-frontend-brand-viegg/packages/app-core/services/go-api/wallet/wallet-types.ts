/** GET /api/v1/wallets/{user_id} response. */
export interface GoWallet {
  user_id: string;
  balance: number;
  currency: string;
  reserved: number;
  available: number;
  last_updated: string;
}

/** POST /api/v1/wallets/{user_id}/deposits request body. */
export interface GoDepositRequest {
  amount: number;
  payment_method: string;
  payment_token: string;
  currency: string;
}

/** POST /api/v1/wallets/{user_id}/deposits response. */
export interface GoDepositResponse {
  deposit_id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
}

/** POST /api/v1/wallets/{user_id}/withdrawals request body. */
export interface GoWithdrawRequest {
  amount: number;
  bank_account_id: string;
  currency: string;
}

/** POST /api/v1/wallets/{user_id}/withdrawals response. */
export interface GoWithdrawResponse {
  withdrawal_id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
}

/** Transaction record from GET /api/v1/wallets/{user_id}/transactions. */
export interface GoTransaction {
  transaction_id: string;
  wallet_id: string;
  user_id: string;
  type: string;
  status: string;
  product?: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  reference?: string;
  provider?: string;
  provider_reference?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

/** Query parameters for GET /api/v1/wallets/{user_id}/transactions. */
export interface GoTransactionsQuery {
  page?: number;
  limit?: number;
  type?: string;
  product?: string;
  start_date?: string;
  end_date?: string;
}

/** GET /payments/transactions/{transactionId} response. */
export interface GoPaymentTransaction {
  transactionId: string;
  status: string;
  amount?: number;
  direction?: string;
  created_at?: string;
}
