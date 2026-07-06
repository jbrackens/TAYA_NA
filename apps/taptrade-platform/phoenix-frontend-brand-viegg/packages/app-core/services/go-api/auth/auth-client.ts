import { goApi } from "../client";
import type {
  GoLoginRequest,
  GoLoginResponse,
  GoRefreshRequest,
  GoRefreshResponse,
  GoRegisterRequest,
  GoRegisterResponse,
  GoForgotPasswordRequest,
  GoChangePasswordRequest,
  GoResetPasswordByTokenRequest,
} from "./auth-types";

type RawAuthTokenBundle = {
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  refreshExpiresIn?: number;
  tokenType?: string;
  userId?: string;
};

type RawLoginResponse = Partial<GoLoginResponse> & {
  user?: {
    user_id?: string;
  };
  token?: RawAuthTokenBundle;
};

type RawRefreshResponse = Partial<GoRefreshResponse> & {
  token?: RawAuthTokenBundle;
};

function normalizeLoginResponse(data: RawLoginResponse): GoLoginResponse {
  return {
    access_token: data.access_token || data.token?.token || "",
    refresh_token: data.refresh_token || data.token?.refreshToken || "",
    expires_in: data.expires_in ?? data.token?.expiresIn ?? 0,
    refresh_expires_in:
      data.refresh_expires_in ?? data.token?.refreshExpiresIn,
    user_id: data.user_id || data.user?.user_id || data.token?.userId || "",
    token_type: data.token_type || data.token?.tokenType || "Bearer",
    has_to_accept_terms:
      data.has_to_accept_terms ?? data.hasToAcceptTerms ?? false,
    hasToAcceptTerms:
      data.hasToAcceptTerms ?? data.has_to_accept_terms ?? false,
    session_id: data.session_id || data.sessionId,
    sessionId: data.sessionId || data.session_id,
    last_sign_in: data.last_sign_in || data.lastSignIn,
    lastSignIn: data.lastSignIn || data.last_sign_in,
    type: data.type,
    verificationId: data.verificationId,
  };
}

function normalizeRefreshResponse(data: RawRefreshResponse): GoRefreshResponse {
  return {
    access_token: data.access_token || data.token?.token || "",
    refresh_token: data.refresh_token || data.token?.refreshToken,
    expires_in: data.expires_in ?? data.token?.expiresIn ?? 0,
    refresh_expires_in:
      data.refresh_expires_in ?? data.token?.refreshExpiresIn,
    token_type: data.token_type || data.token?.tokenType || "Bearer",
  };
}

/** Authenticate a player against the Go gateway. */
export async function login(
  request: GoLoginRequest,
): Promise<GoLoginResponse> {
  const { data } = await goApi.post<RawLoginResponse>(
    "/auth/login",
    request,
  );
  return normalizeLoginResponse(data);
}

/** Refresh the access token. */
export async function refresh(
  refreshToken: string,
): Promise<GoRefreshResponse> {
  const body: GoRefreshRequest = { refresh_token: refreshToken };
  const { data } = await goApi.post<RawRefreshResponse>(
    "/auth/refresh",
    body,
  );
  return normalizeRefreshResponse(data);
}

/** Invalidate the current session. */
export async function logout(): Promise<void> {
  await goApi.post("/auth/logout");
}

/** Register a new player account. */
export async function register(
  request: GoRegisterRequest,
): Promise<GoRegisterResponse> {
  const { data } = await goApi.post<GoRegisterResponse>(
    "/api/v1/users",
    request,
  );
  return data;
}

/** Initiate forgot-password email flow. */
export async function forgotPassword(
  request: GoForgotPasswordRequest,
  headers?: Record<string, string>,
): Promise<void> {
  await goApi.post("/password/forgot", request, { headers });
}

/** Change password (authenticated, with MFA). */
export async function changePassword(
  request: GoChangePasswordRequest,
): Promise<void> {
  await goApi.post("/password/change", request);
}

/** Reset password using email token. */
export async function resetPasswordByToken(
  token: string,
  request: GoResetPasswordByTokenRequest,
): Promise<void> {
  await goApi.post(`/password/reset/${token}`, request);
}
