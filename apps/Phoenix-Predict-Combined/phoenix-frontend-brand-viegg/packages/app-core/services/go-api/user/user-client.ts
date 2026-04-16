import { goApi } from "../client";
import type { GoUserProfile, GoUpdateProfileRequest, GoUpdatePreferencesRequest } from "./user-types";

/** Fetch the authenticated user's profile. */
export async function getProfile(userId: string): Promise<GoUserProfile> {
  const { data } = await goApi.get<GoUserProfile>(
    `/api/v1/users/${userId}`,
  );
  return data;
}

/** Update user profile fields. */
export async function updateProfile(
  userId: string,
  request: GoUpdateProfileRequest,
): Promise<{ user_id: string; updated_at: string }> {
  const { data } = await goApi.put(`/api/v1/users/${userId}`, request);
  return data;
}

/** Delete the user's account. */
export async function deleteAccount(): Promise<void> {
  await goApi.post("/punters/delete");
}

/** Update communication/betting preferences. */
export async function updatePreferences(
  request: GoUpdatePreferencesRequest,
): Promise<void> {
  await goApi.put("/profile/preferences", request);
}
