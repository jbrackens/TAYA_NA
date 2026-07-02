import { apiClient } from "./client";

interface TimedCacheEntry<T> {
  data: T;
  ts: number;
}

export interface PlayerBonus {
  bonusId: number;
  campaignName: string;
  bonusType: string;
  status: string;
  unit: string;
  grantedPointsCents: number;
  remainingPointsCents: number;
  playRequiredPointsCents: number;
  playCompletedPointsCents: number;
  playProgressPct: number;
  expiresAt: string;
  grantedAt: string;
}

export interface WalletBreakdown {
  basePointsCents: number;
  bonusPointsCents: number;
  totalPointsCents: number;
  unit: string;
}

export interface PlayContribution {
  betId: string;
  betType: string;
  playAmountPointsCents: number;
  contributionPointsCents: number;
  oddsDecimal: number;
  legCount: number;
  contributedAt: string;
}

export interface BonusProgress {
  bonusId: number;
  unit: string;
  playRequiredPointsCents: number;
  playCompletedPointsCents: number;
  playProgressPct: number;
  recentContributions: PlayContribution[];
}

interface BonusListResponse {
  bonuses: PlayerBonusResponse[];
}

interface PlayerBonusResponse {
  unit?: string;
  bonus_id?: number;
  bonusId?: number;
  campaign_name?: string;
  campaignName?: string;
  bonus_type?: string;
  bonusType?: string;
  status: string;
  granted_amount_cents?: number;
  grantedAmountCents?: number;
  grantedPointsCents?: number;
  remaining_amount_cents?: number;
  remainingAmountCents?: number;
  remainingPointsCents?: number;
  wagering_required_cents?: number;
  wageringRequiredCents?: number;
  playRequiredPointsCents?: number;
  wagering_completed_cents?: number;
  wageringCompletedCents?: number;
  playCompletedPointsCents?: number;
  wagering_progress_pct?: number;
  wageringProgressPct?: number;
  playProgressPct?: number;
  expires_at?: string;
  expiresAt?: string;
  granted_at?: string;
  grantedAt?: string;
}

interface BonusProgressResponse {
  unit?: string;
  bonus_id?: number;
  bonusId?: number;
  wagering_required_cents?: number;
  wageringRequiredCents?: number;
  playRequiredPointsCents?: number;
  wagering_completed_cents?: number;
  wageringCompletedCents?: number;
  playCompletedPointsCents?: number;
  progressPct?: number;
  playProgressPct?: number;
  recentContributions?: LegacyPlayContributionResponse[];
}

interface LegacyPlayContributionResponse {
  betId: string;
  betType: string;
  stakeCents?: number;
  stakePointsCents?: number;
  contributionCents?: number;
  contributionPointsCents?: number;
  oddsDecimal: number;
  legCount: number;
  contributedAt: string;
}

interface BreakdownResponse {
  unit?: string;
  basePointsCents?: number;
  bonusPointsCents?: number;
  totalPointsCents?: number;
  currency?: string;
  activeBonusCount?: number;
}

interface LegacyBreakdownResponse extends BreakdownResponse {
  realMoneyCents?: number;
  bonusFundCents?: number;
  totalCents?: number;
}

const ACTIVE_CACHE_TTL_MS = 15_000;
const BREAKDOWN_CACHE_TTL_MS = 15_000;

let activeBonusesCache: {
  entry: TimedCacheEntry<PlayerBonus[]> | null;
  promise: Promise<PlayerBonus[]> | null;
} = { entry: null, promise: null };

const breakdownCache = new Map<
  string,
  {
    entry: TimedCacheEntry<WalletBreakdown> | null;
    promise: Promise<WalletBreakdown> | null;
  }
>();

function isFresh<T>(
  entry: TimedCacheEntry<T> | null,
  ttlMs: number,
): entry is TimedCacheEntry<T> {
  return entry !== null && Date.now() - entry.ts < ttlMs;
}

export async function getActiveBonuses(): Promise<PlayerBonus[]> {
  if (isFresh(activeBonusesCache.entry, ACTIVE_CACHE_TTL_MS)) {
    return activeBonusesCache.entry.data;
  }
  if (activeBonusesCache.promise) return activeBonusesCache.promise;

  const promise = apiClient
    .get<BonusListResponse>("/api/v1/bonuses/active")
    .then((res) => {
      const data = (res.bonuses || []).map(normalizePlayerBonus);
      activeBonusesCache.entry = { data, ts: Date.now() };
      activeBonusesCache.promise = null;
      return data;
    })
    .catch((err: unknown) => {
      activeBonusesCache.promise = null;
      throw err;
    });

  activeBonusesCache.promise = promise;
  return promise;
}

export async function claimBonus(
  campaignId: number,
  triggerReference?: string,
): Promise<PlayerBonus> {
  const body: Record<string, unknown> = { campaign_id: campaignId };
  if (triggerReference) body.trigger_reference = triggerReference;

  const result = await apiClient.post<PlayerBonusResponse>(
    "/api/v1/bonuses/claim",
    body,
  );
  // Invalidate cache after claim
  activeBonusesCache.entry = null;
  return normalizePlayerBonus(result);
}

export async function getBonusProgress(
  bonusId: number,
): Promise<BonusProgress> {
  return apiClient
    .get<BonusProgressResponse>(`/api/v1/bonuses/${bonusId}/progress`)
    .then(normalizeBonusProgress);
}

export async function getWalletBreakdown(
  userId: string,
): Promise<WalletBreakdown> {
  const cached = breakdownCache.get(userId);
  if (cached && isFresh(cached.entry, BREAKDOWN_CACHE_TTL_MS)) {
    return cached.entry.data;
  }
  if (cached?.promise) return cached.promise;

  const promise = apiClient
    .get<BreakdownResponse>(`/api/v1/wallet/${userId}/breakdown`)
    .then((res) => {
      const legacyRes = res as LegacyBreakdownResponse;
      const basePointsCents =
        res.basePointsCents ?? legacyRes.realMoneyCents ?? 0;
      const bonusPointsCents =
        res.bonusPointsCents ?? legacyRes.bonusFundCents ?? 0;
      const totalPointsCents =
        res.totalPointsCents ??
        legacyRes.totalCents ??
        basePointsCents + bonusPointsCents;
      const data: WalletBreakdown = {
        basePointsCents,
        bonusPointsCents,
        totalPointsCents,
        unit: res.unit || res.currency || "PTS",
      };
      breakdownCache.set(userId, {
        entry: { data, ts: Date.now() },
        promise: null,
      });
      return data;
    })
    .catch((err: unknown) => {
      breakdownCache.set(userId, { entry: null, promise: null });
      throw err;
    });

  breakdownCache.set(userId, { entry: cached?.entry ?? null, promise });
  return promise;
}

/** Invalidate all bonus caches (call after WebSocket bonus events). */
export function invalidateBonusCaches(): void {
  activeBonusesCache.entry = null;
  breakdownCache.clear();
}

function normalizePlayerBonus(raw: PlayerBonusResponse): PlayerBonus {
  const grantedPointsCents =
    raw.grantedPointsCents ??
    raw.grantedAmountCents ??
    raw.granted_amount_cents ??
    0;
  const remainingPointsCents =
    raw.remainingPointsCents ??
    raw.remainingAmountCents ??
    raw.remaining_amount_cents ??
    0;
  const playRequiredPointsCents =
    raw.playRequiredPointsCents ??
    raw.wageringRequiredCents ??
    raw.wagering_required_cents ??
    0;
  const playCompletedPointsCents =
    raw.playCompletedPointsCents ??
    raw.wageringCompletedCents ??
    raw.wagering_completed_cents ??
    0;
  const playProgressPct =
    raw.playProgressPct ??
    raw.wageringProgressPct ??
    raw.wagering_progress_pct ??
    0;

  return {
    bonusId: raw.bonusId ?? raw.bonus_id ?? 0,
    campaignName: raw.campaignName ?? raw.campaign_name ?? "",
    bonusType: raw.bonusType ?? raw.bonus_type ?? "",
    status: raw.status,
    unit: raw.unit || "PTS",
    grantedPointsCents,
    remainingPointsCents,
    playRequiredPointsCents,
    playCompletedPointsCents,
    playProgressPct,
    expiresAt: raw.expiresAt ?? raw.expires_at ?? "",
    grantedAt: raw.grantedAt ?? raw.granted_at ?? "",
  };
}

function normalizeBonusProgress(raw: BonusProgressResponse): BonusProgress {
  const playRequiredPointsCents =
    raw.playRequiredPointsCents ??
    raw.wageringRequiredCents ??
    raw.wagering_required_cents ??
    0;
  const playCompletedPointsCents =
    raw.playCompletedPointsCents ??
    raw.wageringCompletedCents ??
    raw.wagering_completed_cents ??
    0;
  const playProgressPct = raw.playProgressPct ?? raw.progressPct ?? 0;

  return {
    bonusId: raw.bonusId ?? raw.bonus_id ?? 0,
    unit: raw.unit || "PTS",
    playRequiredPointsCents,
    playCompletedPointsCents,
    playProgressPct,
    recentContributions: (raw.recentContributions || []).map(
      normalizePlayContribution,
    ),
  };
}

function normalizePlayContribution(
  raw: LegacyPlayContributionResponse,
): PlayContribution {
  return {
    betId: raw.betId,
    betType: raw.betType,
    playAmountPointsCents: raw.stakePointsCents ?? raw.stakeCents ?? 0,
    contributionPointsCents:
      raw.contributionPointsCents ?? raw.contributionCents ?? 0,
    oddsDecimal: raw.oddsDecimal,
    legCount: raw.legCount,
    contributedAt: raw.contributedAt,
  };
}
