import { apiClient } from "./client";

// Request types
export interface SetPointUseLimitsRequest {
  user_id: string;
  dailyLimitPoints?: number;
  weeklyLimitPoints?: number;
  monthlyLimitPoints?: number;
}

export interface SetPredictionLimitsRequest {
  user_id: string;
  maxOrderPoints?: number;
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
interface PointUseLimitsRaw {
  user_id: string;
  daily_limit?: number;
  weekly_limit?: number;
  monthly_limit?: number;
  unit?: string;
  effective_date: string;
  created_at: string;
}

interface PredictionLimitsRaw {
  user_id: string;
  max_order_points?: number;
  limitPointsCents?: number;
  unit?: string;
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

interface SelfExcludeResponseRaw {
  user_id: string;
  status: string;
  excluded_until: string;
  created_at: string;
}

// Normalized response types (camelCase)
export interface PointUseLimits {
  userId: string;
  dailyLimitPoints?: number;
  weeklyLimitPoints?: number;
  monthlyLimitPoints?: number;
  unit: "PTS";
  effectiveDate: string;
  createdAt: string;
}

export interface PredictionLimits {
  userId: string;
  maxOrderPoints?: number;
  unit: "PTS";
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

const POINT_UNIT = "PTS" as const;

function normalizePointUseLimits(raw: PointUseLimitsRaw): PointUseLimits {
  return {
    userId: raw.user_id,
    dailyLimitPoints: raw.daily_limit,
    weeklyLimitPoints: raw.weekly_limit,
    monthlyLimitPoints: raw.monthly_limit,
    unit: POINT_UNIT,
    effectiveDate: raw.effective_date,
    createdAt: raw.created_at,
  };
}

function normalizePredictionLimits(raw: PredictionLimitsRaw): PredictionLimits {
  return {
    userId: raw.user_id,
    maxOrderPoints:
      typeof raw.max_order_points === "number"
        ? raw.max_order_points
        : typeof raw.limitPointsCents === "number"
          ? raw.limitPointsCents / 100
          : undefined,
    unit: POINT_UNIT,
    effectiveDate: raw.effective_date,
    createdAt: raw.created_at,
  };
}

// Utility function to normalize snake_case to camelCase
function normalizeSnakeCase<T extends object>(obj: T): unknown {
  if (Array.isArray(obj)) {
    return obj.map(normalizeSnakeCase) as unknown as Record<string, unknown>;
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
 * Set point-use limits for a user.
 */
export async function setPointUseLimits(
  request: SetPointUseLimitsRequest,
): Promise<PointUseLimits> {
  const raw = await apiClient.post<PointUseLimitsRaw>(
    "/api/v1/compliance/rg/point-use-limit",
    {
      userId: request.user_id,
      period: request.monthlyLimitPoints
        ? "monthly"
        : request.weeklyLimitPoints
          ? "weekly"
          : "daily",
      amountPointsCents: Math.round(
        ((request.monthlyLimitPoints ||
          request.weeklyLimitPoints ||
          request.dailyLimitPoints ||
          0) as number) * 100,
      ),
    },
  );
  return normalizePointUseLimits(raw);
}

/**
 * Set prediction order-size limits for a user.
 */
export async function setPredictionLimits(
  request: SetPredictionLimitsRequest,
): Promise<PredictionLimits> {
  const raw = await apiClient.post<PredictionLimitsRaw>(
    "/api/v1/compliance/rg/prediction-limit",
    {
      userId: request.user_id,
      period: "daily",
      amountPointsCents: Math.round((request.maxOrderPoints || 0) * 100),
    },
  );
  return normalizePredictionLimits(raw);
}

/**
 * Set session duration limits for a user
 */
export async function setSessionLimits(
  request: SetSessionLimitsRequest,
): Promise<SessionLimits> {
  const raw = await apiClient.post<SessionLimitsRaw>(
    "/api/v1/compliance/rg/session-limit",
    {
      user_id: request.user_id,
      session_duration_minutes: request.session_duration_minutes,
    },
  );
  return normalizeSnakeCase(raw) as SessionLimits;
}

/**
 * Cool off (temporary self-exclusion) for specified days
 */
export async function coolOff(
  request: CoolOffRequest,
): Promise<CoolOffResponse> {
  const raw = await apiClient.post<CoolOffResponseRaw>(
    "/api/v1/compliance/rg/cool-off",
    {
      userId: request.user_id,
      durationHours: Math.max(24, request.duration_days * 24),
    },
  );
  return normalizeSnakeCase(raw) as CoolOffResponse;
}

/**
 * Self-exclude account (permanent/long-term exclusion)
 */
export async function selfExclude(
  request: SelfExcludeRequest,
): Promise<SelfExcludeResponse> {
  const raw = await apiClient.post<SelfExcludeResponseRaw>(
    "/api/v1/compliance/rg/self-exclude",
    {
      userId: request.user_id,
      permanent: request.duration_years === undefined,
    },
  );
  return normalizeSnakeCase(raw) as unknown as SelfExcludeResponse;
}

/**
 * Upload a KYC document (ID, passport, proof of address, etc.)
 */
export async function uploadKycDocument(
  userId: string,
  file: File,
  documentType: string,
): Promise<{ documentId: string; status: string }> {
  // The gateway KYC service records document METADATA as JSON — it does
  // not accept a multipart binary (KYC is a mock; submit-document decodes
  // {userId,type,...} and is session-bound). The previous implementation
  // POSTed multipart snake_case with a raw fetch + Bearer header, which
  // 400'd on the JSON contract and would 403 on the missing CSRF
  // double-submit token. Mirror verifyIdentity: shared apiClient (cookie
  // auth + CSRF + credentials), JSON camelCase. The picked file is a UX
  // affordance only; just its type is submitted.
  void file;
  const raw = await apiClient.post<{
    document?: { id?: string; documentId?: string; status?: string };
  }>("/api/v1/compliance/kyc/submit-document", {
    userId,
    type: documentType,
  });
  const doc = raw.document ?? {};
  return {
    documentId: doc.documentId || doc.id || "",
    status: doc.status ?? "submitted",
  };
}

/**
 * Submit identity documents for KYC verification (LC-22 / D-8). The gateway
 * binds this to the authenticated session, so the userId is the caller's.
 * Returns the resulting KYC result (status: pending | approved | declined).
 */
export async function verifyIdentity(
  userId: string,
  documentType: string = "passport",
): Promise<{ status: string }> {
  // Use the shared apiClient so the CSRF token (double-submit) and
  // credentials are attached exactly like every other compliance mutation.
  // A raw fetch here previously 403'd with "missing CSRF token header".
  const raw = await apiClient.post<{ result?: { status?: string } }>(
    "/api/v1/compliance/kyc/verify",
    {
      userId,
      documents: [{ type: documentType }],
    },
  );
  return { status: raw.result?.status ?? "pending" };
}

/**
 * Get limits history for a user.
 * Composes point-use limits + prediction limits from the two Go compliance endpoints.
 */
export async function getLimitsHistory(
  userId: string,
): Promise<GetLimitsHistoryResponse> {
  try {
    const [pointUseLimits, predictionLimits, restrictionsResponse] =
      await Promise.all([
        apiClient
          .get<
            Record<string, unknown>
          >("/api/v1/compliance/rg/point-use-limits", { userId })
          .catch(() => null),
        apiClient
          .get<
            Record<string, unknown>
          >("/api/v1/compliance/rg/prediction-limits", { userId })
          .catch(() => null),
        apiClient
          .get<
            Record<string, unknown>
          >("/api/v1/compliance/rg/restrictions", { userId })
          .catch(() => null),
      ]);

    const history: LimitHistoryItem[] = [];
    const pointUseItems = Array.isArray(pointUseLimits?.limits)
      ? (pointUseLimits.limits as Array<Record<string, unknown>>)
      : [];
    for (const limit of pointUseItems) {
      const limitPointsCents =
        typeof limit.limitPointsCents === "number"
          ? limit.limitPointsCents
          : typeof limit.limitCents === "number"
            ? limit.limitCents
            : undefined;
      history.push({
        limitType: "point_use_limit",
        newValue:
          typeof limitPointsCents === "number"
            ? limitPointsCents / 100
            : undefined,
        effectiveDate: String(
          limit.resetsAt || limit.createdAt || new Date().toISOString(),
        ),
        createdAt: String(limit.createdAt || new Date().toISOString()),
      });
    }
    const predictionItems = Array.isArray(predictionLimits?.limits)
      ? (predictionLimits.limits as Array<Record<string, unknown>>)
      : [];
    for (const limit of predictionItems) {
      const limitPointsCents =
        typeof limit.limitPointsCents === "number"
          ? limit.limitPointsCents
          : typeof limit.limitCents === "number"
            ? limit.limitCents
            : undefined;
      history.push({
        limitType: "prediction_limit",
        newValue:
          typeof limitPointsCents === "number"
            ? limitPointsCents / 100
            : undefined,
        effectiveDate: String(
          limit.resetsAt || limit.createdAt || new Date().toISOString(),
        ),
        createdAt: String(limit.createdAt || new Date().toISOString()),
      });
    }

    const restrictions =
      restrictionsResponse &&
      typeof restrictionsResponse === "object" &&
      restrictionsResponse.restrictions &&
      typeof restrictionsResponse.restrictions === "object"
        ? (restrictionsResponse.restrictions as Record<string, unknown>)
        : null;

    if (restrictions?.isOnCoolOff) {
      history.push({
        limitType: "cool_off",
        newValue: true,
        effectiveDate: String(
          restrictions.coolOffUntil ||
            restrictions.lastUpdated ||
            new Date().toISOString(),
        ),
        createdAt: String(restrictions.lastUpdated || new Date().toISOString()),
      });
    }

    if (restrictions?.isExcluded) {
      history.push({
        limitType: "self_exclusion",
        newValue: restrictions.exclusionType === "permanent",
        effectiveDate: String(
          restrictions.excludedUntil ||
            restrictions.lastUpdated ||
            new Date().toISOString(),
        ),
        createdAt: String(restrictions.lastUpdated || new Date().toISOString()),
      });
    }

    return { userId, history, total: history.length };
  } catch {
    return { userId, history: [], total: 0 };
  }
}

/**
 * Get cool-off status for a user from the live restrictions endpoint.
 */
export async function getCoolOffStatus(userId: string): Promise<CoolOffStatus> {
  const raw = await apiClient.get<Record<string, unknown>>(
    "/api/v1/compliance/rg/restrictions",
    { userId },
  );
  // Restrictions blob is shaped at runtime by the gateway — cast the
  // normalized result to the camelCase shape we read below.
  const restrictions =
    raw &&
    typeof raw === "object" &&
    raw.restrictions &&
    typeof raw.restrictions === "object"
      ? (normalizeSnakeCase(raw.restrictions) as {
          isOnCoolOff?: boolean;
          coolOffUntil?: string | null;
        })
      : null;

  if (
    restrictions?.isOnCoolOff &&
    typeof restrictions.coolOffUntil === "string"
  ) {
    return { status: "active", coolOffUntil: restrictions.coolOffUntil };
  }

  return { status: "inactive", coolOffUntil: null };
}
