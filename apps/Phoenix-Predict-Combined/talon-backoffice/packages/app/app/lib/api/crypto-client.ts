import { apiClient } from "./client";

/** Crypto rail configuration as reported by the gateway. */
export interface CryptoRailConfig {
  name: string;
  network: string;
  asset: string;
  confirmations: number;
  configured: boolean;
}

/** A user's on-chain deposit address for the configured rail. */
export interface CryptoDepositAddress {
  address: string;
  network: string;
  asset: string;
}

const CONFIG_PATH = "/api/v1/payments/crypto/config";
const DEPOSIT_ADDRESS_PATH = "/api/v1/payments/crypto/deposit-address";

/** Returns rail config. `configured: false` means crypto deposits aren't live yet. */
export async function getCryptoConfig(): Promise<CryptoRailConfig> {
  return apiClient.get<CryptoRailConfig>(CONFIG_PATH);
}

/**
 * Returns the session user's deposit address. Throws ApiError(503) while the
 * rail is configured-but-incomplete (caller renders the "coming soon" state).
 */
export async function getCryptoDepositAddress(): Promise<CryptoDepositAddress> {
  return apiClient.get<CryptoDepositAddress>(DEPOSIT_ADDRESS_PATH);
}
