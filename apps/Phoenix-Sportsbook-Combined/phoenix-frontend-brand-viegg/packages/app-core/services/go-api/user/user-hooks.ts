import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToken } from "@phoenix-ui/utils";
import { getProfile, updateProfile, deleteAccount, updatePreferences } from "./user-client";
import type { GoUserProfile, GoUpdateProfileRequest, GoUpdatePreferencesRequest } from "./user-types";
import type { AppError } from "../types";

/** Query keys for user domain. */
export const userKeys = {
  all: ["user"] as const,
  profile: (userId: string) => ["user", "profile", userId] as const,
};

/**
 * Fetch the current user's profile.
 * Automatically uses userId from token store.
 * Stale time: 5 minutes.
 */
export function useProfile() {
  const { getUserId } = useToken();
  const userId = getUserId();

  return useQuery<GoUserProfile, AppError>({
    queryKey: userKeys.profile(userId || ""),
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Update the current user's profile.
 * Invalidates the profile query on success.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { getUserId } = useToken();

  return useMutation<
    { user_id: string; updated_at: string },
    AppError,
    GoUpdateProfileRequest
  >({
    mutationFn: (request) => updateProfile(getUserId()!, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}

/** Delete account mutation. */
export function useDeleteAccount() {
  return useMutation<void, AppError, void>({
    mutationFn: deleteAccount,
  });
}

/** Update preferences mutation. */
export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation<void, AppError, GoUpdatePreferencesRequest>({
    mutationFn: updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
}
