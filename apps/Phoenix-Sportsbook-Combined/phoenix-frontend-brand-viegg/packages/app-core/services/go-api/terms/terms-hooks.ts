import { useQuery, useMutation } from "@tanstack/react-query";
import { getTerms, getTermsCurrent, acceptTerms } from "./terms-client";
import type {
  GoTermsResponse,
  GoAcceptTermsRequest,
  GoAcceptTermsResponse,
} from "./terms-types";
import type { AppError } from "../types";

/** Query keys for terms domain. */
export const termsKeys = {
  all: ["terms"] as const,
  terms: ["terms", "all"] as const,
  current: ["terms", "current"] as const,
};

/** Fetch all terms versions. */
export function useTerms(enabled = true) {
  return useQuery<GoTermsResponse, AppError>({
    queryKey: termsKeys.terms,
    queryFn: getTerms,
    enabled,
    staleTime: 60 * 1000,
  });
}

/** Fetch the current terms version. */
export function useTermsCurrent(enabled = true) {
  return useQuery<GoTermsResponse, AppError>({
    queryKey: termsKeys.current,
    queryFn: getTermsCurrent,
    enabled,
    staleTime: 60 * 1000,
  });
}

/** Accept terms at a given version. */
export function useAcceptTerms() {
  return useMutation<GoAcceptTermsResponse, AppError, GoAcceptTermsRequest>({
    mutationFn: acceptTerms,
  });
}
