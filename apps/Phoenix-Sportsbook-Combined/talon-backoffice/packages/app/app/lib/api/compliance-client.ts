import { apiClient } from "./client";
import { logger } from "../logger";

// Request types
export interface SetDepositLimitsRequest {
  user_id: string;
  daily_limit?: number;
  weekly_limit?: number;
  monthly_limit?: number;
}

export interface SetStakeLimitsRequest {
  user_id: string;
  max_stake?: number;
  currency?: string;
}

export interface SetSessionLimitsRequest {
  user_id: string;
  session_duration_minutes?: number;
}

export interface CoolOffRequest {
  user_id: string;
  duration_days: number;
}

export interface SelfExcludeRequest {
  user_id: string;
  reason?: string;
  duration_years?: number;
}

// Response types (Go API uses snake_case)
interface DepositLimitsRaw {
  user_id: string;
  daily_limit?: number;
  weekly_limit?: number;
  monthly_limit?: number;
  currency: string;
  effective_date: string;
  created_at: string;
}

interface StakeLimitsRaw {
  user_id: string;
  max_stake?: number;
  currency: string;
  effective_date: string;
  created_at: string;
}

interface SessionLimitsRaw {
  user_id: string;
  session_duration_minutes?: number;
  effective_date: string;
  created_at: string;
}

interface CoolOffResponseRaw {
  user_id: string;
  status: string;
  cool_off_until: string;
  created_at: string;
}

interface CoolOffStatusRaw {
  status: string;
  cool_off_until: string | null;
}

interface SelfExcludeResponseRaw {
  user_id: string;
  status: string;
  excluded_until: string;
  created_at: string;
}

interface LimitHistoryItemRaw {
  limit_type: string;
  old_value?: number | boolean;
  new_value?: number | boolean;
  effective_date: string;
  created_at: string;
}

interface GetLimitsHistoryResponseRaw {
  user_id: string;
  history: LimitHistoryItemRaw[];
  total: number;
}

// Normalized response types (camelCase)
export interface DepositLimits {
  userId: string;
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;
  currency: string;
  effectiveDate: string;
  createdAt: string;
}

export interface StakeLimits {
  userId: string;
  maxStake?: number;
  currency: string;
  effectiveDate: string;
  createdAt: string;
}

export interface SessionLimits {
  userId: string;
  sessionDurationMinutes?: number;
  effectiveDate: string;
  createdAt: string;
}

export interface CoolOffResponse {
  userId: string;
  status: string;
  coolOffUntil: string;
  createdAt: string;
}

export interface CoolOffStatus {
  status: string;
  coolOffUntil: string | null;
}

export interface SelfExcludeResponse {
  userId: string;
  status: string;
  excludedUntil: string;
  createdAt: string;
}

export interface LimitHistoryItem {
  limitType: string;
  oldValue?: number | boolean;
  newValue?: number | boolean;
  effectiveDate: string;
  createdAt: string;
}

export interface GetLimitsHistoryResponse {
  userId: string;
  history: LimitHistoryItem[];
  total: number;
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
 * Set deposit limits for a user
 */
export async function setDepositLimits(
  request: SetDepositLimitsRequest,
): Promise<DepositLimits> {
  const raw = await apiClient.post<DepositLimitsRaw>(
    "/api/v1/punters/deposit-limits",
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Set stake limits for a user
 */
export async function setStakeLimits(
  request: SetStakeLimitsRequest,
): Promise<StakeLimits> {
  const raw = await apiClient.post<StakeLimitsRaw>(
    "/api/v1/punters/stake-limits",
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Set session duration limits for a user
 */
export async function setSessionLimits(
  request: SetSessionLimitsRequest,
): Promise<SessionLimits> {
  const raw = await apiClient.post<SessionLimitsRaw>(
    "/api/v1/punters/session-limits",
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Cool off (temporary self-exclusion) for specified days
 */
export async function coolOff(
  request: CoolOffRequest,
): Promise<CoolOffResponse> {
  const raw = await apiClient.post<CoolOffResponseRaw>(
    "/api/v1/punters/cool-off",
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Self-exclude account (permanent/long-term exclusion)
 */
export async function selfExclude(
  request: SelfExcludeRequest,
): Promise<SelfExcludeResponse> {
  const raw = await apiClient.post<SelfExcludeResponseRaw>(
    "/api/v1/punters/self-exclude",
    request,
  );
  return normalizeSnakeCase(raw);
}

/**
 * Upload a KYC document (ID, passport, proof of address, etc.)
 */
export async function uploadKycDocument(
  userId: string,
  file: File,
  documentType: string,
): Promise<{ documentId: string; status: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080";
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("phoenix_access_token")
      : null;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("user_id", userId);
  formData.append("document_type", documentType);

  const res = await fetch(`${apiUrl}/api/v1/compliance/documents/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "Upload failed");
    throw new Error(errorBody || "Failed to upload KYC document");
  }

  return res.json();
}

/**
 * Get current month's cumulative deposit total for threshold checking.
 * Uses wallet transactions to sum deposits in the current calendar month.
 */
export async function getMonthlyDepositTotal(userId: string): Promise<number> {
  try {
    const { getTransactions } = await import("./wallet-client");
    const result = await getTransactions(userId, {
      limit: 200,
      transaction_type: "deposit",
    });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return (result.transactions || [])
      .filter((tx) => new Date(tx.createdAt) >= monthStart)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);
  } catch {
    return 0;
  }
}

/**
 * Get limits history for a user
 */
export async function getLimitsHistory(
  userId: string,
): Promise<GetLimitsHistoryResponse> {
  const raw = await apiClient.get<GetLimitsHistoryResponseRaw>(
    "/api/v1/punters/limits-history",
    {
      user_id: userId,
    },
  );
  return normalizeSnakeCase(raw);
}

/**
 * Get cool-off status for a user.
 * Fails open (returns inactive) if the backend is unreachable so login
 * still works during local development.
 */
export async function getCoolOffStatus(userId: string): Promise<CoolOffStatus> {
  try {
    const raw = await apiClient.get<CoolOffStatusRaw>(
      "/api/v1/punters/cool-off-status",
      { user_id: userId },
    );
    return normalizeSnakeCase(raw) as CoolOffStatus;
  } catch (err) {
    logger.warn(
      "Compliance",
      "Failed to fetch cool-off status, failing open",
      err instanceof Error ? err.message : String(err),
    );
    return { status: "inactive", coolOffUntil: null };
  }
}
