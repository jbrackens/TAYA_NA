import { apiClient } from "./client";

export type CashierDepositStatus =
  | "created"
  | "address_issued"
  | "source_detected"
  | "bridging"
  | "settled"
  | "recovery_required"
  | "failed";

export type CashierSettlementChain = "polygon" | "bsc" | "base" | "arbitrum";

export interface CashierWallet {
  userId: string;
  embeddedWalletAddress: string;
  smartWalletAddress: string;
  settlementChain: CashierSettlementChain;
  createdAt: string;
}

export interface CashierDepositIntent {
  id: string;
  userId: string;
  rail: "tron-usdt-deposit-address" | "evm-stablecoin-direct" | "manual-recovery";
  status: CashierDepositStatus;
  sourceChain: "tron" | CashierSettlementChain;
  sourceAsset: "USDT" | "USDC" | "hUSD";
  sourceDecimals: number;
  settlementChain: CashierSettlementChain;
  settlementAsset: "USDT" | "USDC" | "hUSD";
  destinationWalletAddress: string;
  provider?: "relay" | "symbiosis" | "lifi" | "debridge" | "manual";
  providerRequestId?: string;
  depositAddress?: string;
  recoveryReason?: string;
  idempotencyKey?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCashierDepositIntentRequest {
  rail: CashierDepositIntent["rail"];
  settlementChain: CashierSettlementChain;
  idempotencyKey: string;
}

export interface CreateCashierWithdrawalIntentRequest {
  destinationAddress: string;
  amountUnits: string;
  asset: "USDT" | "USDC" | "hUSD";
  settlementChain: CashierSettlementChain;
  userAuthorizationHash: string;
  userAuthorizationNonce: string;
  userAuthorizationExpiresAt: string;
  idempotencyKey: string;
}

export interface CashierWithdrawalIntent {
  id: string;
  userId: string;
  status:
    | "created"
    | "user_authorized"
    | "policy_approved"
    | "submitted"
    | "confirmed"
    | "recovery_required"
    | "failed";
  settlementChain: CashierSettlementChain;
  destinationAddress: string;
  amount: {
    asset: "USDT" | "USDC" | "hUSD";
    chain: string;
    decimals: number;
    units: string;
  };
  userAuthorizationHash?: string;
  userAuthorizationNonce?: string;
  userAuthorizationExpiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export async function getCashierWallet(): Promise<CashierWallet> {
  return apiClient.get<CashierWallet>("/v1/cashier/wallet");
}

export async function createCashierDepositIntent(
  request: CreateCashierDepositIntentRequest,
): Promise<CashierDepositIntent> {
  return apiClient.post<CashierDepositIntent>(
    "/v1/cashier/deposit-intents",
    {
      rail: request.rail,
      settlementChain: request.settlementChain,
    },
    { "Idempotency-Key": request.idempotencyKey },
  );
}

export async function getCashierDepositIntent(
  id: string,
): Promise<CashierDepositIntent> {
  return apiClient.get<CashierDepositIntent>(
    `/v1/cashier/deposit-intents/${encodeURIComponent(id)}`,
  );
}

export async function createCashierWithdrawalIntent(
  request: CreateCashierWithdrawalIntentRequest,
): Promise<CashierWithdrawalIntent> {
  return apiClient.post<CashierWithdrawalIntent>(
    "/v1/cashier/withdrawal-intents",
    {
      destinationAddress: request.destinationAddress,
      amountUnits: request.amountUnits,
      asset: request.asset,
      settlementChain: request.settlementChain,
      userAuthorizationHash: request.userAuthorizationHash,
      userAuthorizationNonce: request.userAuthorizationNonce,
      userAuthorizationExpiresAt: request.userAuthorizationExpiresAt,
    },
    { "Idempotency-Key": request.idempotencyKey },
  );
}
