/**
 * Phoenix Sportsbook API Client Singleton
 * Single instance of the API client for use throughout the player app
 */

import { PhoenixApiClient } from '@phoenix-ui/api-client';

let apiClientInstance: PhoenixApiClient | null = null;

/**
 * Get or create the API client singleton instance
 */
export function getApiClient(): PhoenixApiClient {
  if (!apiClientInstance) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080';

    apiClientInstance = new PhoenixApiClient({
      baseUrl,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 100,
    });
  }
  return apiClientInstance;
}

/**
 * Export the API client singleton instance directly
 */
export const api = getApiClient();

/**
 * Reset API client instance (mainly for testing)
 */
export function resetApiClient(): void {
  apiClientInstance = null;
}
