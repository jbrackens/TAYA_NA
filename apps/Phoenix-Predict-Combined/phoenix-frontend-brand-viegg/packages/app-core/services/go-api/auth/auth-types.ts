/** POST /auth/login request body. */
export interface GoLoginRequest {
  username: string;
  password: string;
  device_id?: string;
}

/** POST /auth/login response — normal login. */
export interface GoLoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: string;
  token_type: string;
  refresh_expires_in?: number;
  has_to_accept_terms?: boolean;
  hasToAcceptTerms?: boolean;
  session_id?: string;
  sessionId?: string;
  last_sign_in?: string;
  lastSignIn?: string;
  type?: string;
  verificationId?: string;
}

/** POST /auth/refresh request body. */
export interface GoRefreshRequest {
  refresh_token: string;
}

/** POST /auth/refresh response. */
export interface GoRefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  refresh_expires_in?: number;
}

/** POST /api/v1/users request body (registration). */
export interface GoRegisterRequest {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string; // "YYYY-MM-DD"
  country: string;
}

/** POST /api/v1/users response. */
export interface GoRegisterResponse {
  user_id: string;
  email: string;
  username: string;
  created_at: string;
  status: string;
}

/** POST /password/forgot request body. */
export interface GoForgotPasswordRequest {
  email: string;
}

/** POST /password/change request body. */
export interface GoChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  verificationId?: string;
  verificationCode?: string;
}

/** POST /password/reset/{token} request body. */
export interface GoResetPasswordByTokenRequest {
  password: string;
  verificationId?: string;
  verificationCode?: string;
}
