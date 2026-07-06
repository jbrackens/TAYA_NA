import { useMutation } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { useToken } from "@phoenix-ui/utils";
import { logIn } from "../../../lib/slices/authSlice";
import { saveTokens } from "../client";
import {
  requestVerification,
  requestVerificationByPhone,
  checkVerification,
  loginWithVerification,
  toggleMfa,
  answerKbaQuestions,
  startIdpv,
  checkIdpvStatus,
} from "./verification-client";
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
import type { AppError } from "../types";

/** Request a verification code (email). */
export function useRequestVerification() {
  return useMutation<GoVerificationRequestResponse, AppError, void>({
    mutationFn: requestVerification,
  });
}

/** Request a verification code (phone). */
export function useRequestVerificationByPhone() {
  return useMutation<GoVerificationRequestResponse, AppError, void>({
    mutationFn: requestVerificationByPhone,
  });
}

/** Check a verification code. */
export function useCheckVerification() {
  return useMutation<GoVerificationCheckResponse, AppError, GoVerificationCheckRequest>({
    mutationFn: checkVerification,
  });
}

/**
 * Login with verification (MFA flow).
 * On success: saves tokens to localStorage, dispatches Redux `logIn`.
 */
export function useLoginWithVerification() {
  const dispatch = useDispatch();
  const { saveUserId } = useToken();

  return useMutation<
    GoLoginWithVerificationResponse,
    AppError,
    GoLoginWithVerificationRequest
  >({
    mutationFn: loginWithVerification,
    onSuccess: (data) => {
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

/** Toggle multi-factor authentication on/off. */
export function useToggleMfa() {
  return useMutation<GoMfaToggleResponse, AppError, GoMfaToggleRequest>({
    mutationFn: toggleMfa,
  });
}

/** Answer KBA questions. */
export function useAnswerKbaQuestions() {
  return useMutation<GoKbaResponse, AppError, GoKbaAnswerRequest>({
    mutationFn: answerKbaQuestions,
  });
}

/** Start an IDPV session. */
export function useStartIdpv() {
  return useMutation<GoIdpvStartResponse, AppError, void>({
    mutationFn: startIdpv,
  });
}

/** Check the status of an IDPV session. */
export function useCheckIdpvStatus() {
  return useMutation<GoIdpvStatusResponse, AppError, void>({
    mutationFn: checkIdpvStatus,
  });
}
