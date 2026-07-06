import { useQuery, useMutation } from "@tanstack/react-query";
import {
  setDepositLimits,
  setStakeLimits,
  setSessionLimits,
  coolOff,
  selfExclude,
  getLimitsHistory,
  getCoolOffsHistory,
  acceptResponsibilityCheck,
  getCurrentSession,
} from "./compliance-client";
import type {
  GoSetLimitRequest,
  GoSetLimitResponse,
  GoCoolOffRequest,
  GoCoolOffResponse,
  GoSelfExcludeRequest,
  GoSelfExcludeResponse,
  GoLimitHistoryResponse,
  GoCoolOffHistoryResponse,
  GoResponsibilityCheckResponse,
  GoSessionInfo,
} from "./compliance-types";
import type { AppError } from "../types";

/** Query keys for compliance domain. */
export const complianceKeys = {
  all: ["compliance"] as const,
  limitsHistory: (page?: number, limit?: number) =>
    ["compliance", "limitsHistory", page, limit] as const,
  coolOffsHistory: (page?: number, limit?: number) =>
    ["compliance", "coolOffsHistory", page, limit] as const,
  currentSession: ["compliance", "currentSession"] as const,
};

/** Set deposit limits. */
export function useSetDepositLimits() {
  return useMutation<GoSetLimitResponse, AppError, GoSetLimitRequest>({
    mutationFn: setDepositLimits,
  });
}

/** Set stake limits. */
export function useSetStakeLimits() {
  return useMutation<GoSetLimitResponse, AppError, GoSetLimitRequest>({
    mutationFn: setStakeLimits,
  });
}

/** Set session limits. */
export function useSetSessionLimits() {
  return useMutation<GoSetLimitResponse, AppError, GoSetLimitRequest>({
    mutationFn: setSessionLimits,
  });
}

/** Initiate a cool-off period. */
export function useCoolOff() {
  return useMutation<GoCoolOffResponse, AppError, GoCoolOffRequest>({
    mutationFn: coolOff,
  });
}

/** Self-exclude the current player. */
export function useSelfExclude() {
  return useMutation<GoSelfExcludeResponse, AppError, GoSelfExcludeRequest>({
    mutationFn: selfExclude,
  });
}

/**
 * Fetch limits history (paginated).
 * Stale time: 30 seconds.
 */
export function useLimitsHistory(page?: number, limit?: number) {
  return useQuery<GoLimitHistoryResponse, AppError>({
    queryKey: complianceKeys.limitsHistory(page, limit),
    queryFn: () => getLimitsHistory(page, limit),
    staleTime: 30 * 1000,
    keepPreviousData: true,
  });
}

/**
 * Fetch cool-offs history (paginated).
 * Stale time: 30 seconds.
 */
export function useCoolOffsHistory(page?: number, limit?: number) {
  return useQuery<GoCoolOffHistoryResponse, AppError>({
    queryKey: complianceKeys.coolOffsHistory(page, limit),
    queryFn: () => getCoolOffsHistory(page, limit),
    staleTime: 30 * 1000,
    keepPreviousData: true,
  });
}

/** Accept a responsibility check. */
export function useAcceptResponsibilityCheck() {
  return useMutation<GoResponsibilityCheckResponse, AppError, void>({
    mutationFn: acceptResponsibilityCheck,
  });
}

/**
 * Fetch current session info.
 * Refetch interval: 30 minutes.
 */
export function useCurrentSession(enabled = true) {
  return useQuery<GoSessionInfo, AppError>({
    queryKey: complianceKeys.currentSession,
    queryFn: getCurrentSession,
    enabled,
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });
}
