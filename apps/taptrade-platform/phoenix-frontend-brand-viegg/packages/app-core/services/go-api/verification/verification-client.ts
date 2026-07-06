import { goApi } from "../client";
import type {
  GoVerificationRequestResponse,
  GoVerificationCheckRequest,
  GoVerificationCheckResponse,
  GoLoginWithVerificationRequest,
  GoLoginWithVerificationResponse,
  GoMfaToggleRequest,
  GoMfaToggleResponse,
  GoKbaAnswerRequest,
  GoKbaResponse,
  GoIdpvStartResponse,
  GoIdpvStatusResponse,
} from "./verification-types";

/** Request a verification code (email). */
export async function requestVerification(): Promise<GoVerificationRequestResponse> {
  const { data } = await goApi.post<GoVerificationRequestResponse>(
    "/verification/request",
  );
  return data;
}

/** Request a verification code (phone). */
export async function requestVerificationByPhone(): Promise<GoVerificationRequestResponse> {
  const { data } = await goApi.post<GoVerificationRequestResponse>(
    "/verification/request-by-phone",
  );
  return data;
}

/** Check a verification code. */
export async function checkVerification(
  request: GoVerificationCheckRequest,
): Promise<GoVerificationCheckResponse> {
  const { data } = await goApi.post<GoVerificationCheckResponse>(
    "/verification/check",
    request,
  );
  return data;
}

/** Login with a verification code (MFA flow). */
export async function loginWithVerification(
  request: GoLoginWithVerificationRequest,
): Promise<GoLoginWithVerificationResponse> {
  const { data } = await goApi.post<GoLoginWithVerificationResponse>(
    "/login-with-verification",
    request,
  );
  return data;
}

/** Toggle multi-factor authentication on/off. */
export async function toggleMfa(
  request: GoMfaToggleRequest,
): Promise<GoMfaToggleResponse> {
  const { data } = await goApi.put<GoMfaToggleResponse>(
    "/profile/multi-factor-authentication",
    request,
  );
  return data;
}

/** Answer KBA (Knowledge-Based Authentication) questions. */
export async function answerKbaQuestions(
  request: GoKbaAnswerRequest,
): Promise<GoKbaResponse> {
  const { data } = await goApi.post<GoKbaResponse>(
    "/registration/answer-kba-questions",
    request,
  );
  return data;
}

/** Start an IDPV (Identity Proofing & Verification) session. */
export async function startIdpv(): Promise<GoIdpvStartResponse> {
  const { data } = await goApi.post<GoIdpvStartResponse>(
    "/registration/start-idpv",
  );
  return data;
}

/** Check the status of an IDPV session. */
export async function checkIdpvStatus(): Promise<GoIdpvStatusResponse> {
  const { data } = await goApi.post<GoIdpvStatusResponse>(
    "/registration/check-idpv-status",
  );
  return data;
}
