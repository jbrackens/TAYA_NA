// ── Go Verification / MFA / KYC API Types ──

/** POST /verification/request */
export type GoVerificationRequestResponse = {
  verificationId: string;
};

/** POST /verification/check */
export type GoVerificationCheckRequest = {
  verification_id: string;
  verification_code: string;
};

export type GoVerificationCheckResponse = {
  success: boolean;
  verified_at?: string;
};

/** POST /login-with-verification */
export type GoLoginWithVerificationRequest = {
  username: string;
  password: string;
  verification_id: string;
  verification_code: string;
  device_id?: string;
};

export type GoLoginWithVerificationResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: string;
  token_type: string;
  refresh_expires_in?: number;
};

/** PUT /profile/multi-factor-authentication */
export type GoMfaToggleRequest = {
  enabled: boolean;
  verification_id?: string;
  verification_code?: string;
};

export type GoMfaToggleResponse = {
  twoFactorAuthEnabled: boolean;
};

/** POST /registration/answer-kba-questions */
export type GoKbaQuestion = {
  question_id: string;
  question_text: string;
  choices: string[];
};

export type GoKbaAnswerRequest = {
  answers: Array<{ question_id: string; answer: string }>;
};

export type GoKbaResponse = {
  questions?: GoKbaQuestion[];
  status?: string;
  kyc_approved?: boolean;
};

/** POST /registration/start-idpv */
export type GoIdpvStartResponse = {
  sessionId: string;
  idpvRedirectUrl: string;
};

/** POST /registration/check-idpv-status */
export type GoIdpvStatusResponse = {
  status: string;
  message?: string;
};
