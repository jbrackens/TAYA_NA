import { apiClient } from "./client";

// Privacy preferences for the session user. Currently exposes the
// "appear anonymously on leaderboards" opt-out per PLAN-loyalty-leaderboards.md.

export interface PrivacyPreferences {
  displayAnonymous: boolean;
}

export async function getPrivacy(): Promise<PrivacyPreferences> {
  return apiClient.get<PrivacyPreferences>("/api/v1/me/privacy");
}

export async function updatePrivacy(
  prefs: PrivacyPreferences,
): Promise<PrivacyPreferences> {
  // apiClient.put expects Record<string, unknown>; widen PrivacyPreferences
  // via an intermediate cast to unknown (plain assignment trips TS on the
  // narrower interface type).
  return apiClient.put<PrivacyPreferences>(
    "/api/v1/me/privacy",
    prefs as unknown as Record<string, unknown>,
  );
}
