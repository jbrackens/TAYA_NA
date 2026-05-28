import { apiClient } from "./client";

type EthereumProvider = {
  request<T = unknown>(args: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }): Promise<T>;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export interface AlphaCashierConfig {
  enabled: boolean;
  chainId: number;
  chainName: string;
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  treasuryAddress: string;
  confirmations: number;
  minDepositCents: number;
  maxDepositCents: number;
  dailyDepositLimitCents: number;
  withdrawalsEnabled: boolean;
  withdrawalReviewRequired: boolean;
}

export interface WalletChallenge {
  nonce: string;
  message: string;
  walletAddress: string;
  chainId: number;
  expiresAt: string;
}

export interface WalletConnection {
  id: string;
  userId: string;
  chainId: number;
  walletAddress: string;
  normalizedAddress: string;
}

export interface DepositIntent {
  id: string;
  chainId: number;
  chainName: string;
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  treasuryAddress: string;
  fromAddress: string;
  amountCents: number;
  amountUnits: string;
  status: string;
  txHash?: string;
  expiresAt: string;
}

export interface WithdrawalRequest {
  id: string;
  chainId: number;
  tokenSymbol: string;
  tokenAddress: string;
  destinationAddress: string;
  amountCents: number;
  amountUnits: string;
  status: string;
  walletReservationId?: string;
  broadcastTxHash?: string;
  requestedAt: string;
}

const BASE = "/api/v1/cashier/alpha";

export function dollarsToCents(value: number): number {
  return Math.round(value * 100);
}

export function centsToDollars(value?: number): number {
  return typeof value === "number" ? value / 100 : 0;
}

export function newIdempotencyKey(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

export async function getAlphaCashierConfig(): Promise<AlphaCashierConfig> {
  const res = await apiClient.get<{ alphaCashier: AlphaCashierConfig }>(
    `${BASE}/config`,
  );
  return res.alphaCashier;
}

export async function createWalletChallenge(
  walletAddress: string,
): Promise<WalletChallenge> {
  const res = await apiClient.post<{ challenge: WalletChallenge }>(
    `${BASE}/wallet/challenge`,
    { walletAddress },
  );
  return res.challenge;
}

export async function connectWallet(
  nonce: string,
  signature: string,
): Promise<WalletConnection> {
  const res = await apiClient.post<{ wallet: WalletConnection }>(
    `${BASE}/wallet/connect`,
    { nonce, signature },
  );
  return res.wallet;
}

export async function listWalletConnections(): Promise<WalletConnection[]> {
  const res = await apiClient.get<{ wallets: WalletConnection[] }>(
    `${BASE}/wallets`,
  );
  return Array.isArray(res.wallets) ? res.wallets : [];
}

export async function createDepositIntent(
  walletAddress: string,
  amountCents: number,
): Promise<DepositIntent> {
  const res = await apiClient.post<{ depositIntent: DepositIntent }>(
    `${BASE}/deposit-intents`,
    { walletAddress, amountCents },
    { "Idempotency-Key": newIdempotencyKey("alpha-deposit") },
  );
  return res.depositIntent;
}

export async function submitDepositTx(
  intentId: string,
  txHash: string,
): Promise<DepositIntent | null> {
  const res = await apiClient.post<
    { depositIntent?: DepositIntent; status?: string }
  >(
    `${BASE}/deposit-intents/${intentId}/submit-tx`,
    { txHash },
    { "Idempotency-Key": newIdempotencyKey("alpha-deposit-submit") },
  );
  return res.depositIntent ?? null;
}

export async function listDepositIntents(): Promise<DepositIntent[]> {
  const res = await apiClient.get<{ depositIntents: DepositIntent[] }>(
    `${BASE}/deposit-intents`,
  );
  return Array.isArray(res.depositIntents) ? res.depositIntents : [];
}

export async function createWithdrawalRequest(
  destinationAddress: string,
  amountCents: number,
): Promise<WithdrawalRequest> {
  const res = await apiClient.post<{ withdrawalRequest: WithdrawalRequest }>(
    `${BASE}/withdrawal-requests`,
    { destinationAddress, amountCents },
    { "Idempotency-Key": newIdempotencyKey("alpha-withdrawal") },
  );
  return res.withdrawalRequest;
}

export async function listWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const res = await apiClient.get<{ withdrawalRequests: WithdrawalRequest[] }>(
    `${BASE}/withdrawal-requests`,
  );
  return Array.isArray(res.withdrawalRequests) ? res.withdrawalRequests : [];
}

export async function requestMetaMaskAccount(): Promise<string> {
  const provider = window.ethereum;
  if (!provider) {
    throw new Error("MetaMask is required for USDC cashier");
  }
  const accounts = await provider.request<string[]>({
    method: "eth_requestAccounts",
  });
  const account = accounts?.[0];
  if (!account) {
    throw new Error("No MetaMask account selected");
  }
  return account;
}

export async function switchMetaMaskChain(chainId: number): Promise<void> {
  const provider = window.ethereum;
  if (!provider) {
    throw new Error("MetaMask is required for USDC cashier");
  }
  await provider.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: `0x${chainId.toString(16)}` }],
  });
}

export async function signWalletChallenge(
  walletAddress: string,
): Promise<WalletConnection> {
  const provider = window.ethereum;
  if (!provider) {
    throw new Error("MetaMask is required for USDC cashier");
  }
  const challenge = await createWalletChallenge(walletAddress);
  const signature = await provider.request<string>({
    method: "personal_sign",
    params: [challenge.message, walletAddress],
  });
  return connectWallet(challenge.nonce, signature);
}

export async function sendUSDCTransfer(
  intent: DepositIntent,
): Promise<string> {
  const provider = window.ethereum;
  if (!provider) {
    throw new Error("MetaMask is required for USDC cashier");
  }
  await switchMetaMaskChain(intent.chainId);
  const data = encodeERC20TransferData(
    intent.treasuryAddress,
    intent.amountUnits,
  );
  return provider.request<string>({
    method: "eth_sendTransaction",
    params: [
      {
        from: intent.fromAddress,
        to: intent.tokenAddress,
        data,
      },
    ],
  });
}

function encodeERC20TransferData(to: string, amountUnits: string): string {
  const cleanTo = to.replace(/^0x/i, "").toLowerCase();
  if (!/^[a-f0-9]{40}$/.test(cleanTo)) {
    throw new Error("Invalid treasury address");
  }
  const amount = BigInt(amountUnits);
  if (amount <= 0n) {
    throw new Error("Invalid transfer amount");
  }
  const selector = "a9059cbb";
  const encodedTo = cleanTo.padStart(64, "0");
  const encodedAmount = amount.toString(16).padStart(64, "0");
  return `0x${selector}${encodedTo}${encodedAmount}`;
}
