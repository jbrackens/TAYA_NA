import { apiClient } from "./client";

interface TimedCacheEntry<T> {
  data: T;
  ts: number;
}

export interface GetTransactionsParams {
  page?: number;
  limit?: number;
  transaction_type?: string;
}

// Response types (Go API uses snake_case)
interface BalanceRaw {
  user_id: string;
  available_balance: number;
  reserved_balance: number;
  total_balance: number;
  currency: string;
}

interface WalletBalanceRaw {
  userId: string;
  unit?: string;
  balancePointsCents: number;
  availablePointsCents?: number;
  reservedPointsCents?: number;
}

interface LegacyWalletBalanceRaw extends Partial<WalletBalanceRaw> {
  balanceCents?: number;
  availableCents?: number;
  reservedCents?: number;
}

interface WalletLedgerEntryRaw {
  entryId: string;
  userId: string;
  type: string;
  unit?: string;
  amountPointsCents: number;
  balancePointsCents: number;
  idempotencyKey: string;
  reason?: string;
  transactionTime: string;
}

interface LegacyWalletLedgerEntryRaw extends Partial<WalletLedgerEntryRaw> {
  amountCents?: number;
  balanceCents?: number;
}

interface WalletLedgerResponseRaw {
  userId: string;
  items: LegacyWalletLedgerEntryRaw[];
  total: number;
}

// Normalized response types (camelCase)
export interface Balance {
  userId: string;
  availableBalance: number;
  reservedBalance: number;
  totalBalance: number;
  unit: string;
}

export interface Transaction {
  transactionId: string;
  userId: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  unit: string;
  idempotencyKey?: string;
  description?: string;
  createdAt: string;
}

export interface GetTransactionsPaginatedResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const POINT_UNIT = "PTS";

function centsToPoints(value?: number): number {
  return typeof value === "number" ? value / 100 : 0;
}

const BALANCE_CACHE_TTL_MS = 15_000;
const balanceCache = new Map<
  string,
  { entry: TimedCacheEntry<Balance> | null; promise: Promise<Balance> | null }
>();

function isFresh<T>(
  entry: TimedCacheEntry<T> | null,
  ttlMs: number,
): entry is TimedCacheEntry<T> {
  return !!entry && Date.now() - entry.ts < ttlMs;
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
 * Get wallet balance for a user
 */
export async function getBalance(userId: string): Promise<Balance> {
  const cached = balanceCache.get(userId);
  if (cached && isFresh(cached.entry, BALANCE_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) {
    return cached.promise;
  }

  const promise = (async () => {
    try {
      const raw = await apiClient.get<WalletBalanceRaw>(
        `/api/v1/wallet/${userId}`,
      );
      const legacyRaw = raw as LegacyWalletBalanceRaw;
      const availablePointsCents =
        raw.availablePointsCents ??
        legacyRaw.availableCents ??
        raw.balancePointsCents;
      const result: Balance = {
        userId: raw.userId,
        availableBalance: centsToPoints(availablePointsCents),
        reservedBalance: centsToPoints(
          raw.reservedPointsCents ?? legacyRaw.reservedCents ?? 0,
        ),
        totalBalance: centsToPoints(
          raw.balancePointsCents ?? legacyRaw.balanceCents,
        ),
        unit: raw.unit || POINT_UNIT,
      };
      balanceCache.set(userId, {
        entry: { data: result, ts: Date.now() },
        promise: null,
      });
      return result;
    } catch {
      const raw = await apiClient.get<BalanceRaw>(`/api/v1/wallets/${userId}`);
      const normalized = normalizeSnakeCase(raw) as {
        userId: string;
        availableBalance: number;
        reservedBalance: number;
        totalBalance: number;
      };
      const result: Balance = {
        userId: normalized.userId,
        availableBalance: normalized.availableBalance,
        reservedBalance: normalized.reservedBalance,
        totalBalance: normalized.totalBalance,
        unit: POINT_UNIT,
      };
      balanceCache.set(userId, {
        entry: { data: result, ts: Date.now() },
        promise: null,
      });
      return result;
    }
  })();

  balanceCache.set(userId, {
    entry: cached?.entry || null,
    promise,
  });

  return promise;
}

/**
 * Get transaction history for a user
 */
export async function getTransactions(
  userId: string,
  params?: GetTransactionsParams,
): Promise<GetTransactionsPaginatedResponse> {
  // Predict gateway exposes the wallet ledger at /api/v1/wallet/{id}/ledger.
  // The sportsbook fallback at /api/v1/wallets/{id}/transactions (plural)
  // doesn't exist here — removing it so we don't generate 404 noise.
  const ledgerParams: Record<string, string> = {};
  if (params?.limit) ledgerParams.limit = String(params.limit);
  const raw = await apiClient.get<WalletLedgerResponseRaw>(
    `/api/v1/wallet/${userId}/ledger`,
    ledgerParams,
  );

  // The gateway's wallet.Service.ledgerFromDB queries ORDER BY id DESC
  // (newest first) but then reverses the slice before returning, so the
  // wire response is oldest-first chronological. Account ledger consumers
  // want newest-first — most recent ledger entry at the top. Reverse here so callers get
  // a consistent newest-first ordering regardless of the gateway's
  // build-then-reverse implementation choice.
  const page = params?.page || 1;
  const limit = params?.limit || raw.items.length || 10;
  const newestFirst = [...raw.items].reverse();
  const filtered = newestFirst.filter((item) =>
    params?.transaction_type ? item.type === params.transaction_type : true,
  );
  const start = (page - 1) * limit;
  const transactions = filtered.slice(start, start + limit).map((item) => {
    const amountPointsCents = item.amountPointsCents ?? item.amountCents ?? 0;
    const balancePointsCents =
      item.balancePointsCents ?? item.balanceCents ?? amountPointsCents;
    return {
      transactionId: item.entryId || "",
      userId: item.userId || userId,
      type: item.type || "ledger",
      amount: centsToPoints(amountPointsCents),
      balanceBefore: centsToPoints(balancePointsCents - amountPointsCents),
      balanceAfter: centsToPoints(balancePointsCents),
      unit: item.unit || POINT_UNIT,
      idempotencyKey: item.idempotencyKey,
      description: item.reason,
      createdAt: item.transactionTime || "",
    };
  });

  return {
    transactions,
    total: filtered.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
  };
}

interface StarterGrantResult {
  enabled: boolean;
  unit?: string;
  grantPointsCents?: number;
  balancePointsCents?: number;
}

interface StarterGrantResultRaw extends StarterGrantResult {
  grantCents?: number;
  balanceCents?: number;
}

export interface DailyClaimResult {
  enabled: boolean;
  unit?: string;
  claimPointsCents?: number;
  balancePointsCents?: number;
  claimedForDate?: string;
  nextClaimAt?: string;
  rewardLimit?: RewardLimitStatus;
}

interface DailyClaimResultRaw extends Omit<DailyClaimResult, "rewardLimit"> {
  claimCents?: number;
  balanceCents?: number;
  rewardLimit?: RewardLimitStatusRaw;
}

export interface PointPack {
  id: string;
  name: string;
  description: string;
  unit?: string;
  amountPointsCents: number;
  enabled: boolean;
  claimableOnce: boolean;
  claimed?: boolean;
}

interface PointPackRaw extends Omit<PointPack, "amountPointsCents"> {
  amountPointsCents?: number;
  amountCents?: number;
}

interface PointPacksResponse {
  items: PointPackRaw[];
  total: number;
}

export interface PointPackClaimResult {
  enabled: boolean;
  pack?: PointPack;
  unit?: string;
  claimPointsCents?: number;
  balancePointsCents?: number;
  rewardLimit?: RewardLimitStatus;
}

interface PointPackClaimResultRaw extends Omit<
  PointPackClaimResult,
  "pack" | "rewardLimit"
> {
  pack?: PointPackRaw;
  claimCents?: number;
  balanceCents?: number;
  rewardLimit?: RewardLimitStatusRaw;
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  unit?: string;
  rewardPointsCents: number;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  enabled: boolean;
}

interface MissionRaw extends Omit<Mission, "rewardPointsCents"> {
  rewardPointsCents?: number;
  rewardCents?: number;
}

interface MissionsResponse {
  items: MissionRaw[];
  total: number;
}

export interface MissionClaimResult {
  enabled: boolean;
  mission?: Mission;
  unit?: string;
  claimPointsCents?: number;
  balancePointsCents?: number;
  rewardLimit?: RewardLimitStatus;
}

interface MissionClaimResultRaw extends Omit<
  MissionClaimResult,
  "mission" | "rewardLimit"
> {
  mission?: MissionRaw;
  claimCents?: number;
  balanceCents?: number;
  rewardLimit?: RewardLimitStatusRaw;
}

export interface Streak {
  id: string;
  name: string;
  description: string;
  unit?: string;
  rewardPointsCents: number;
  currentStreak: number;
  target: number;
  completed: boolean;
  claimed: boolean;
  enabled: boolean;
}

interface StreakRaw extends Omit<Streak, "rewardPointsCents"> {
  rewardPointsCents?: number;
  rewardCents?: number;
}

interface StreaksResponse {
  items: StreakRaw[];
  total: number;
}

export interface StreakClaimResult {
  enabled: boolean;
  streak?: Streak;
  unit?: string;
  claimPointsCents?: number;
  balancePointsCents?: number;
  rewardLimit?: RewardLimitStatus;
}

interface StreakClaimResultRaw extends Omit<
  StreakClaimResult,
  "streak" | "rewardLimit"
> {
  streak?: StreakRaw;
  claimCents?: number;
  balanceCents?: number;
  rewardLimit?: RewardLimitStatusRaw;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  cosmeticId: string;
  earned: boolean;
  source: string;
}

interface BadgesResponse {
  items: Badge[];
  total: number;
}

export interface RewardLimitStatus {
  enabled: boolean;
  unit?: string;
  limitPointsCents: number;
  grantedPointsCents: number;
  remainingPointsCents: number;
  windowDate: string;
  nextResetAt: string;
}

interface RewardLimitStatusRaw extends Omit<
  RewardLimitStatus,
  "limitPointsCents" | "grantedPointsCents" | "remainingPointsCents"
> {
  limitPointsCents?: number;
  grantedPointsCents?: number;
  remainingPointsCents?: number;
  limitCents?: number;
  grantedCents?: number;
  remainingCents?: number;
}

function normalizeRewardLimit(
  status?: RewardLimitStatusRaw,
): RewardLimitStatus | undefined {
  if (!status) return status;
  return {
    enabled: status.enabled,
    unit: status.unit || POINT_UNIT,
    limitPointsCents: status.limitPointsCents ?? status.limitCents ?? 0,
    grantedPointsCents: status.grantedPointsCents ?? status.grantedCents ?? 0,
    remainingPointsCents:
      status.remainingPointsCents ?? status.remainingCents ?? 0,
    windowDate: status.windowDate,
    nextResetAt: status.nextResetAt,
  };
}

function normalizePointPack(pack: PointPackRaw): PointPack {
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description,
    unit: pack.unit || POINT_UNIT,
    amountPointsCents: pack.amountPointsCents ?? pack.amountCents ?? 0,
    enabled: pack.enabled,
    claimableOnce: pack.claimableOnce,
    claimed: pack.claimed,
  };
}

function normalizeMission(mission: MissionRaw): Mission {
  return {
    id: mission.id,
    name: mission.name,
    description: mission.description,
    unit: mission.unit || POINT_UNIT,
    rewardPointsCents: mission.rewardPointsCents ?? mission.rewardCents ?? 0,
    progress: mission.progress,
    target: mission.target,
    completed: mission.completed,
    claimed: mission.claimed,
    enabled: mission.enabled,
  };
}

function normalizeStreak(streak: StreakRaw): Streak {
  return {
    id: streak.id,
    name: streak.name,
    description: streak.description,
    unit: streak.unit || POINT_UNIT,
    rewardPointsCents: streak.rewardPointsCents ?? streak.rewardCents ?? 0,
    currentStreak: streak.currentStreak,
    target: streak.target,
    completed: streak.completed,
    claimed: streak.claimed,
    enabled: streak.enabled,
  };
}

function normalizeRewardClaimBase(result: {
  enabled: boolean;
  unit?: string;
  claimPointsCents?: number;
  balancePointsCents?: number;
  claimCents?: number;
  balanceCents?: number;
  rewardLimit?: RewardLimitStatusRaw;
}) {
  return {
    enabled: result.enabled,
    unit: result.unit || POINT_UNIT,
    claimPointsCents: result.claimPointsCents ?? result.claimCents,
    balancePointsCents: result.balancePointsCents ?? result.balanceCents,
    rewardLimit: normalizeRewardLimit(result.rewardLimit),
  };
}

function normalizeStarterGrant(
  result: StarterGrantResultRaw,
): StarterGrantResult {
  return {
    enabled: result.enabled,
    unit: result.unit || POINT_UNIT,
    grantPointsCents: result.grantPointsCents ?? result.grantCents,
    balancePointsCents: result.balancePointsCents ?? result.balanceCents,
  };
}

/**
 * Claims the one-time gameplay-point starter grant for the session user. The
 * gateway is idempotent (one grant per user) and the endpoint is a no-op when
 * the faucet is disabled (STARTER_GRANT_CENTS=0), so this is safe to call on
 * every login/restore. On a real grant the user's balance cache is cleared so
 * the next balance read reflects it. Best-effort: returns null on failure.
 */
export async function claimStarterGrant(
  userId: string,
): Promise<StarterGrantResult | null> {
  try {
    const res = await apiClient.post<StarterGrantResultRaw>(
      "/api/v1/wallet/starter-grant",
    );
    if (res?.enabled) {
      balanceCache.delete(userId);
    }
    return res ? normalizeStarterGrant(res) : res;
  } catch {
    return null;
  }
}

/**
 * Claims today's non-redeemable gameplay points for the session user. The
 * gateway enforces one claim per UTC day with a per-user idempotency key and
 * writes the point-ledger entry. Best-effort: returns null on failure.
 */
export async function claimDailyPoints(
  userId: string,
): Promise<DailyClaimResult | null> {
  try {
    const res = await apiClient.post<DailyClaimResultRaw>(
      "/api/v1/wallet/daily-claim",
    );
    if (res?.enabled) {
      balanceCache.delete(userId);
    }
    return res
      ? {
          ...normalizeRewardClaimBase(res),
          claimedForDate: res.claimedForDate,
          nextClaimAt: res.nextClaimAt,
        }
      : res;
  } catch {
    return null;
  }
}

export async function getPointPacks(): Promise<PointPack[]> {
  const raw = await apiClient.get<PointPacksResponse>(
    "/api/v1/wallet/point-packs",
  );
  return (raw.items ?? []).map(normalizePointPack);
}

export async function claimPointPack(
  userId: string,
  packId: string,
): Promise<PointPackClaimResult | null> {
  try {
    const res = await apiClient.post<PointPackClaimResultRaw>(
      "/api/v1/wallet/point-packs/claim",
      { packId },
    );
    if (res?.enabled) {
      balanceCache.delete(userId);
    }
    return res
      ? {
          ...normalizeRewardClaimBase(res),
          pack: res.pack ? normalizePointPack(res.pack) : res.pack,
        }
      : res;
  } catch {
    return null;
  }
}

export async function getMissions(): Promise<Mission[]> {
  const raw = await apiClient.get<MissionsResponse>("/api/v1/wallet/missions");
  return (raw.items ?? []).map(normalizeMission);
}

export async function claimMission(
  userId: string,
  missionId: string,
): Promise<MissionClaimResult | null> {
  try {
    const res = await apiClient.post<MissionClaimResultRaw>(
      "/api/v1/wallet/missions/claim",
      { missionId },
    );
    if (res?.enabled) {
      balanceCache.delete(userId);
    }
    return res
      ? {
          ...normalizeRewardClaimBase(res),
          mission: res.mission ? normalizeMission(res.mission) : res.mission,
        }
      : res;
  } catch {
    return null;
  }
}

export async function getStreaks(): Promise<Streak[]> {
  const raw = await apiClient.get<StreaksResponse>("/api/v1/wallet/streaks");
  return (raw.items ?? []).map(normalizeStreak);
}

export async function claimStreak(
  userId: string,
  streakId: string,
): Promise<StreakClaimResult | null> {
  try {
    const res = await apiClient.post<StreakClaimResultRaw>(
      "/api/v1/wallet/streaks/claim",
      { streakId },
    );
    if (res?.enabled) {
      balanceCache.delete(userId);
    }
    return res
      ? {
          ...normalizeRewardClaimBase(res),
          streak: res.streak ? normalizeStreak(res.streak) : res.streak,
        }
      : res;
  } catch {
    return null;
  }
}

export async function getBadges(): Promise<Badge[]> {
  const raw = await apiClient.get<BadgesResponse>("/api/v1/wallet/badges");
  return raw.items ?? [];
}

export async function getRewardLimitStatus(): Promise<RewardLimitStatus> {
  const raw = await apiClient.get<RewardLimitStatusRaw>(
    "/api/v1/wallet/reward-limits",
  );
  return (
    normalizeRewardLimit(raw) ?? {
      enabled: false,
      unit: POINT_UNIT,
      limitPointsCents: 0,
      grantedPointsCents: 0,
      remainingPointsCents: 0,
      windowDate: "",
      nextResetAt: "",
    }
  );
}
