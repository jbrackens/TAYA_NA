import { apiClient } from "./client";

// Request types
export interface GoLoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth: string;
  ssn_last4?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyMfaRequest {
  user_id: string;
  code: string;
  action?: string;
}

export interface RequestMfaCodeRequest {
  user_id: string;
  method?: "sms" | "email";
}

export interface ChangePasswordRequest {
  user_id: string;
  current_password: string;
  new_password: string;
}

export interface AcceptTermsRequest {
  user_id: string;
  terms_version: string;
}

// Response types (Go API uses snake_case)
interface GoLoginResponseRaw {
  access_token: string;
  refresh_token: string;
  user_id: string;
  username: string;
}

interface GoRefreshResponseRaw {
  access_token: string;
  refresh_token: string;
}

interface RegisterResponseRaw {
  user_id: string;
  username: string;
  email: string;
  requires_email_verification: boolean;
  requires_mfa: boolean;
}

interface ForgotPasswordResponseRaw {
  message: string;
}

interface ResetPasswordResponseRaw {
  message: string;
}

interface VerifyEmailResponseRaw {
  user_id: string;
  status: string;
}

interface VerifyMfaResponseRaw {
  verified: boolean;
  access_token?: string;
  refresh_token?: string;
}

interface RequestMfaCodeResponseRaw {
  sent: boolean;
  method: string;
}

interface ChangePasswordResponseRaw {
  message: string;
}

interface AcceptTermsResponseRaw {
  accepted: boolean;
  terms_version: string;
}

// Normalized response types (camelCase)
export interface GoLoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  username: string;
}

export interface GoRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

interface SessionResponseRaw {
  authenticated: boolean;
  userId: string;
  username: string;
  expiresAt: string;
}

export interface SessionResponse {
  authenticated: boolean;
  userId: string;
  username: string;
  expiresAt: string;
}

export interface RegisterResponse {
  userId: string;
  username: string;
  email: string;
  requiresEmailVerification: boolean;
  requiresMfa: boolean;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface VerifyEmailResponse {
  userId: string;
  status: string;
}

export interface VerifyMfaResponse {
  verified: boolean;
  accessToken?: string;
  refreshToken?: string;
}

export interface RequestMfaCodeResponse {
  sent: boolean;
  method: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface AcceptTermsResponse {
  accepted: boolean;
  termsVersion: string;
}

// Utility function to normalize snake_case to camelCase
function normalizeSnakeCase<T extends Record<string, unknown>>(
  obj: T,
): Record<string, unknown> {
  if (Array.isArray(obj)) {
    return (obj.map(normalizeSnakeCase) as unknown) as Record<string, unknown>;
  }
  if (obj !== null && typeof obj === "object") {
    return Object.entries(obj).reduce<Record<string, unknown>>(
      (acc, [key, value]) => {
        const camelKey = key.replace(/_([a-z])/g, (_, letter: string) =>
          letter.toUpperCase(),
        );
        acc[camelKey] =
          typeof value === "object" && value !== null
            ? normalizeSnakeCase(value as Record<string, unknown>)
            : value;
        return acc;
      },
      {},
    );
  }
  return obj;
}

/**
 * Login with username and password
 */
export async function login(request: GoLoginRequest): Promise<GoLoginResponse> {
  const response = await fetch("/api/auth/login/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const body = await response.text();
    let readable = body || "Login failed";
    try {
      const parsed: unknown = JSON.parse(body);
      if (parsed && typeof parsed === 'object' && 'error' in parsed) {
        const errObj = (parsed as Record<string, unknown>).error;
        if (errObj && typeof errObj === 'object' && 'message' in errObj) {
          readable = String((errObj as Record<string, unknown>).message);
        }
      }
    } catch {
      // body is not JSON, use as-is
    }
    throw new Error(readable);
  }

  const raw = (await response.json()) as GoLoginResponseRaw;
  return normalizeSnakeCase(raw) as GoLoginResponse;
}

/**
 * Refresh access token
 */
export async function refresh(
  refreshToken: string,
): Promise<GoRefreshResponse> {
  const response = await fetch("/api/v1/auth/refresh/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const raw = (await response.json()) as GoRefreshResponseRaw;
  return normalizeSnakeCase(raw) as GoRefreshResponse;
}

export async function getSession(
  accessToken?: string,
): Promise<SessionResponse> {
  const token = accessToken || apiClient.getToken();
  if (!token) {
    throw new Error("No access token available");
  }

  const response = await fetch("/api/v1/auth/session/", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const raw = (await response.json()) as SessionResponseRaw;
  return raw;
}

/**
 * Register a new user
 */
export async function register(
  request: RegisterRequest,
): Promise<RegisterResponse> {
  const raw = await apiClient.post<RegisterResponseRaw>(
    "/auth/register",
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Request password reset
 */
export async function forgotPassword(
  request: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> {
  const raw = await apiClient.post<ForgotPasswordResponseRaw>(
    "/auth/forgot-password",
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Reset password with token
 */
export async function resetPassword(
  request: ResetPasswordRequest,
): Promise<ResetPasswordResponse> {
  const raw = await apiClient.post<ResetPasswordResponseRaw>(
    "/auth/reset-password",
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Verify email with token
 */
export async function verifyEmail(
  request: VerifyEmailRequest,
): Promise<VerifyEmailResponse> {
  const raw = await apiClient.post<VerifyEmailResponseRaw>(
    "/auth/verify-email",
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Verify MFA code
 */
export async function verifyMfa(
  request: VerifyMfaRequest,
): Promise<VerifyMfaResponse> {
  const raw = await apiClient.post<VerifyMfaResponseRaw>(
    "/auth/verify-mfa",
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Request MFA code
 */
export async function requestMfaCode(
  request: RequestMfaCodeRequest,
): Promise<RequestMfaCodeResponse> {
  const raw = await apiClient.post<RequestMfaCodeResponseRaw>(
    "/auth/request-mfa-code",
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Change user password
 */
export async function changePassword(
  request: ChangePasswordRequest,
): Promise<ChangePasswordResponse> {
  const raw = await apiClient.post<ChangePasswordResponseRaw>(
    "/auth/change-password",
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Accept terms and conditions
 */
export async function acceptTerms(
  request: AcceptTermsRequest,
): Promise<AcceptTermsResponse> {
  const raw = await apiClient.post<AcceptTermsResponseRaw>(
    "/auth/accept-terms",
    request,
  );
  return normalizeSnakeCase(raw);
}

// Session types
interface SessionRaw {
  id: string;
  device: string;
  location: string;
  last_active: string;
  current: boolean;
}

export interface Session {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

/**
 * Get active sessions for a user
 */
export async function getSessions(userId: string): Promise<Session[]> {
  const raw = await apiClient.get<SessionRaw[]>("/api/v1/auth/sessions", {
    user_id: userId,
  });
  if (Array.isArray(raw)) {
    return raw.map(
      (s) =>
        (normalizeSnakeCase(
          s as Record<string, unknown>,
        ) as unknown) as Session,
    );
  }
  return [];
}

/**
 * Revoke (sign out) a specific session
 */
export async function revokeSession(
  sessionId: string,
): Promise<{ message: string }> {
  const raw = await apiClient.delete<{ message: string }>(
    `/api/v1/auth/sessions/${sessionId}`,
  );
  return raw;
}
