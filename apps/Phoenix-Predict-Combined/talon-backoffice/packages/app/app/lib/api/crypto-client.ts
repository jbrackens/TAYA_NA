import { apiClient } from "./client";

/** Crypto rail configuration as reported by the gateway. */
export interface CryptoRailConfig {
  name: string;
  network: string;
  asset: string;
  confirmations: number;
  configured: boolean;
}

const CONFIG_PATH = "/api/v1/payments/crypto/config";

/** Returns rail config. `configured: false` means crypto deposits aren't live yet. */
export async function getCryptoConfig(): Promise<CryptoRailConfig> {
  return apiClient.get<CryptoRailConfig>(CONFIG_PATH);
}
