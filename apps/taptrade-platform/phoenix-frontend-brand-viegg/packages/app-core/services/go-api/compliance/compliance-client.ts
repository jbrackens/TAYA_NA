import { goApi } from "../client";
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
  GoGeoComplyLicenseResponse,
  GoGeoComplyPacketRequest,
  GoGeoComplyPacketResponse,
} from "./compliance-types";

/** Set deposit limits. */
export async function setDepositLimits(
  request: GoSetLimitRequest,
): Promise<GoSetLimitResponse> {
  const { data } = await goApi.post<GoSetLimitResponse>(
    "/punters/deposit-limits",
    request,
  );
  return data;
}

/** Set stake limits. */
export async function setStakeLimits(
  request: GoSetLimitRequest,
): Promise<GoSetLimitResponse> {
  const { data } = await goApi.post<GoSetLimitResponse>(
    "/punters/stake-limits",
    request,
  );
  return data;
}

/** Set session limits. */
export async function setSessionLimits(
  request: GoSetLimitRequest,
): Promise<GoSetLimitResponse> {
  const { data } = await goApi.post<GoSetLimitResponse>(
    "/punters/session-limits",
    request,
  );
  return data;
}

/** Initiate a cool-off period. */
export async function coolOff(
  request: GoCoolOffRequest,
): Promise<GoCoolOffResponse> {
  const { data } = await goApi.post<GoCoolOffResponse>(
    "/punters/cool-off",
    request,
  );
  return data;
}

/** Self-exclude the current player. */
export async function selfExclude(
  request: GoSelfExcludeRequest,
): Promise<GoSelfExcludeResponse> {
  const { data } = await goApi.post<GoSelfExcludeResponse>(
    "/punters/self-exclude",
    request,
  );
  return data;
}

/** Get limits history (paginated). */
export async function getLimitsHistory(
  page?: number,
  limit?: number,
): Promise<GoLimitHistoryResponse> {
  const { data } = await goApi.get<GoLimitHistoryResponse>(
    "/punters/limits-history",
    { params: { page, limit } },
  );
  return data;
}

/** Get cool-offs history (paginated). */
export async function getCoolOffsHistory(
  page?: number,
  limit?: number,
): Promise<GoCoolOffHistoryResponse> {
  const { data } = await goApi.get<GoCoolOffHistoryResponse>(
    "/punters/cool-offs-history",
    { params: { page, limit } },
  );
  return data;
}

/** Accept a responsibility check. */
export async function acceptResponsibilityCheck(): Promise<GoResponsibilityCheckResponse> {
  const { data } = await goApi.put<GoResponsibilityCheckResponse>(
    "/responsibility-check/accept",
  );
  return data;
}

/** Get the current player session info. */
export async function getCurrentSession(): Promise<GoSessionInfo> {
  const { data } = await goApi.get<GoSessionInfo>(
    "/punters/current-session",
  );
  return data;
}

/** Get the GeoComply license key for the current environment. */
export async function getGeoComplyLicense(): Promise<GoGeoComplyLicenseResponse> {
  const { data } = await goApi.get<GoGeoComplyLicenseResponse>(
    "/geo-comply/license-key",
  );
  return data;
}

/** Evaluate an encrypted GeoComply packet. */
export async function evaluateGeoComplyPacket(
  request: GoGeoComplyPacketRequest,
): Promise<GoGeoComplyPacketResponse> {
  const { data } = await goApi.post<GoGeoComplyPacketResponse>(
    "/geo-comply/geo-packet",
    request,
  );
  return data;
}
