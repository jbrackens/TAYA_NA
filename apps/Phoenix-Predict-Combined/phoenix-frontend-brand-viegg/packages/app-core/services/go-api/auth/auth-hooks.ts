import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useToken } from "@phoenix-ui/utils";
import { logIn, logOut } from "../../../lib/slices/authSlice";
import { login, logout, register, forgotPassword, changePassword, resetPasswordByToken } from "./auth-client";
import { saveTokens, clearAuth } from "../client";
import type { GoLoginRequest, GoRegisterRequest, GoChangePasswordRequest, GoResetPasswordByTokenRequest } from "./auth-types";
import type { AppError } from "../types";

type MutationResult<T extends (...args: any[]) => Promise<any>> = T extends (
  ...args: any[]
) => Promise<infer TResult>
  ? TResult
  : never;

/**
 * Login mutation.
 *
 * On success: saves tokens to localStorage, dispatches Redux `logIn`.
 * On error: throws AppError (transformed by Axios interceptor).
 */
export function useLogin() {
  const dispatch = useDispatch();
  const { saveUserId } = useToken();

  return useMutation<
    MutationResult<typeof login>,
    AppError,
    GoLoginRequest
  >({
    mutationFn: (request) => login(request),
    onSuccess: (data) => {
      // MFA required — do not save tokens yet; the caller handles the MFA flow
      if (data.type === "VERIFICATION_REQUESTED" || data.verificationId) {
        return;
      }
      saveTokens(
        data.access_token,
        data.refresh_token,
        data.expires_in,
        data.user_id,
        data.refresh_expires_in,
      );
      saveUserId(data.user_id);
      dispatch(logIn());
    },
  });
}

/**
 * Logout mutation.
 *
 * Calls Go `POST /auth/logout`, then clears local auth state.
 */
export function useLogout() {
  const dispatch = useDispatch();

  return useMutation<void, AppError, void>({
    mutationFn: () => logout(),
    onSettled: () => {
      // Always clear local state, even if the server call fails
      clearAuth();
      dispatch(logOut());
    },
  });
}

/**
 * Registration mutation.
 *
 * Registers a new player via Go `POST /api/v1/users`.
 * Does NOT auto-login — the caller should prompt login after success.
 */
export function useRegister() {
  return useMutation<
    MutationResult<typeof register>,
    AppError,
    GoRegisterRequest
  >({
    mutationFn: (request) => register(request),
  });
}

/** Forgot password mutation. */
export function useForgotPassword() {
  return useMutation<void, AppError, { email: string; headers?: Record<string, string> }>({
    mutationFn: ({ email, headers }) => forgotPassword({ email }, headers),
  });
}

/** Change password (authenticated). */
export function useChangePassword() {
  return useMutation<void, AppError, GoChangePasswordRequest>({
    mutationFn: (request) => changePassword(request),
  });
}

/** Reset password by email token. */
export function useResetPasswordByToken(token: string) {
  return useMutation<void, AppError, GoResetPasswordByTokenRequest>({
    mutationFn: (request) => resetPasswordByToken(token, request),
  });
}
