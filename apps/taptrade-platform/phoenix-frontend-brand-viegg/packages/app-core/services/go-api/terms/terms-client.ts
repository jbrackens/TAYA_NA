import { goApi } from "../client";
import type {
  GoTermsResponse,
  GoAcceptTermsRequest,
  GoAcceptTermsResponse,
} from "./terms-types";

export function normalizeTermsResponse(data: GoTermsResponse): GoTermsResponse {
  return {
    ...data,
    content:
      data.content ??
      data.terms_content ??
      data.termsContent ??
      "",
    version:
      data.version ??
      data.current_terms_version ??
      data.currentTermsVersion ??
      "",
  };
}

export function normalizeAcceptTermsResponse(
  data: GoAcceptTermsResponse,
): GoAcceptTermsResponse {
  return {
    ...data,
    success: data.success ?? true,
    has_to_accept_terms:
      data.has_to_accept_terms ?? data.hasToAcceptTerms ?? false,
    hasToAcceptTerms:
      data.hasToAcceptTerms ?? data.has_to_accept_terms ?? false,
    terms: data.terms
      ? {
          ...data.terms,
          accepted_at: data.terms.accepted_at ?? data.terms.acceptedAt,
          acceptedAt: data.terms.acceptedAt ?? data.terms.accepted_at,
          version: data.terms.version ?? "",
        }
      : undefined,
  };
}

/** Get all terms versions. */
export async function getTerms(): Promise<GoTermsResponse> {
  const { data } = await goApi.get<GoTermsResponse>("/terms");
  return normalizeTermsResponse(data);
}

/** Get the current terms version. */
export async function getTermsCurrent(): Promise<GoTermsResponse> {
  const { data } = await goApi.get<GoTermsResponse>("/terms/current");
  return normalizeTermsResponse(data);
}

/** Accept terms at a given version. */
export async function acceptTerms(
  request: GoAcceptTermsRequest,
): Promise<GoAcceptTermsResponse> {
  const { data } = await goApi.put<GoAcceptTermsResponse>(
    "/terms/accept",
    request,
  );
  return normalizeAcceptTermsResponse(data);
}
