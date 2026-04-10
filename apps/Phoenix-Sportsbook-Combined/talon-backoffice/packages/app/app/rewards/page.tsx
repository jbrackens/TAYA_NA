"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuth";
import {
  getLoyaltyAccount,
  getLoyaltyLedger,
  getLoyaltyTiers,
  getReferrals,
} from "../lib/api/loyalty-client";
import {
  getLeaderboards,
  getLeaderboardEntries,
} from "../lib/api/leaderboards-client";
import { getBetAnalytics } from "../lib/api/betting-client";
import type { BetAnalytics } from "../lib/api/betting-client";
import BettingHeatmap from "../components/BettingHeatmap";
import type {
  LoyaltyAccount,
  LoyaltyLedgerEntry,
  LoyaltyTier,
  ReferralReward,
} from "../lib/api/loyalty-client";
import type {
  LeaderboardDefinition,
  LeaderboardStanding,
} from "../lib/api/leaderboards-client";
import {
  colors,
  font,
  radius,
  spacing,
  text,
  transition,
} from "../lib/theme";
import { logger } from "../lib/logger";

export default function RewardsPage() {
  const { user } = useAuth();
  const { t } = useTranslation("rewards");

  const [loyalty, setLoyalty] = useState<LoyaltyAccount | null>(null);
  const [loyaltyLedger, setLoyaltyLedger] = useState<LoyaltyLedgerEntry[]>([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>([]);
  const [referrals, setReferrals] = useState<ReferralReward[]>([]);
  const [leaderboards, setLeaderboards] = useState<LeaderboardDefinition[]>([]);
  const [featuredStandings, setFeaturedStandings] = useState<LeaderboardStanding[]>([]);
  const [featuredTotalCount, setFeaturedTotalCount] = useState(0);
  const [viewerStanding, setViewerStanding] = useState<LeaderboardStanding | null>(null);
  const [analyticsData, setAnalyticsData] = useState<BetAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [
          rewardsAccount,
          rewardsLedger,
          rewardsTiers,
          referralList,
          competitionBoards,
          betAnalytics,
        ] = await Promise.all([
          getLoyaltyAccount(user.id).catch((err: unknown) => {
            logger.warn("Rewards", "Failed to load loyalty account", err);
            return null;
          }),
          getLoyaltyLedger(user.id, 20).catch((err: unknown) => {
            logger.warn("Rewards", "Failed to load ledger", err);
            return [];
          }),
          getLoyaltyTiers().catch((err: unknown) => {
            logger.warn("Rewards", "Failed to load tiers", err);
            return [];
          }),
          getReferrals(user.id).catch((err: unknown) => {
            logger.warn("Rewards", "Failed to load referrals", err);
            return [];
          }),
          getLeaderboards().catch((err: unknown) => {
            logger.warn("Rewards", "Failed to load leaderboards", err);
            return [];
          }),
          getBetAnalytics(user.id).catch((err: unknown) => {
            logger.warn("Rewards", "Failed to load bet analytics", err);
            return null;
          }),
        ]);

        setLoyalty(rewardsAccount);
        setLoyaltyLedger(rewardsLedger);
        setLoyaltyTiers(rewardsTiers);
        setReferrals(referralList);
        setAnalyticsData(betAnalytics);

        const activeBoards = Array.isArray(competitionBoards)
          ? competitionBoards.filter((b) => b.status === "active").slice(0, 3)
          : [];
        setLeaderboards(activeBoards);

        if (activeBoards[0]?.leaderboardId) {
          const standings = await getLeaderboardEntries(
            activeBoards[0].leaderboardId,
            3,
            0,
            user.id,
          ).catch((err: unknown) => {
            logger.warn("Rewards", "Failed to load leaderboard entries", err);
            return null;
          });
          setFeaturedStandings(Array.isArray(standings?.items) ? standings.items : []);
          setFeaturedTotalCount(standings?.totalCount || 0);
          setViewerStanding(standings?.viewerEntry || null);
        } else {
          setFeaturedStandings([]);
          setFeaturedTotalCount(0);
          setViewerStanding(null);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error("Rewards", "Unexpected error loading rewards data", message);
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [user?.id]);

  if (!user) {
    return (
      <div style={{ padding: spacing["3xl"], textAlign: "center", color: colors.textSecondary }}>
        Please sign in to view your rewards.
      </div>
    );
  }

  const sortedTiers = [...loyaltyTiers].sort((a, b) => a.rank - b.rank);

  const currentTierName =
    loyaltyTiers.find((tier) => tier.tierCode === loyalty?.currentTier)?.displayName ||
    normalizeTierName(loyalty?.currentTier) ||
    "Bronze";
  const nextTierName =
    loyaltyTiers.find((tier) => tier.tierCode === loyalty?.nextTier)?.displayName ||
    normalizeTierName(loyalty?.nextTier);
  const tierProgressTotal =
    loyalty && loyalty.pointsToNextTier >= 0
      ? loyalty.pointsBalance + loyalty.pointsToNextTier
      : 0;
  const tierProgressPct =
    tierProgressTotal > 0 && loyalty
      ? Math.max(0, Math.min(100, (loyalty.pointsBalance / tierProgressTotal) * 100))
      : 100;

  const qualifiedReferrals = referrals.filter(
    (r) => r.qualificationState === "qualified",
  );
  const featuredBoardName = leaderboards[0]?.name || "Featured Board";
  const viewerPercentile =
    viewerStanding && featuredTotalCount > 1
      ? Math.round(
          ((featuredTotalCount - viewerStanding.rank) / (featuredTotalCount - 1)) * 100,
        )
      : 100;
  const viewerTopBand =
    viewerStanding && featuredTotalCount > 0
      ? Math.max(1, 100 - viewerPercentile)
      : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: rewardsPageStyles }} />
      <div className="rewards-page">
        {/* ── 1. Page Header ── */}
        <div className="rewards-header">
          <div className="rewards-header-top">
            <div>
              <div className="rewards-kicker">{t("KICKER")}</div>
              <h1 className="rewards-title">{t("PAGE_TITLE")}</h1>
              <p className="rewards-subtitle">{t("PAGE_SUBTITLE")}</p>
            </div>
            <div className="rewards-header-right">
              <div className="rewards-tier-badge">{currentTierName}</div>
              <Link href="/account" className="rewards-back-link">
                {t("BACK_TO_ACCOUNT")}
              </Link>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rewards-loading">
            <div className="rewards-loading-spinner" />
            <span>Loading your rewards...</span>
          </div>
        ) : error ? (
          <div className="rewards-error">
            Something went wrong loading rewards data. Please try again later.
          </div>
        ) : (
          <>
            {/* ── 2. Stats Dashboard ── */}
            <div className="rewards-stats">
              <div className="rewards-stat-card rewards-stat-card--primary">
                <div className="rewards-stat-label">{t("STAT_BALANCE")}</div>
                <div className="rewards-stat-value rewards-stat-value--large">
                  {loyalty?.pointsBalance?.toLocaleString() ?? "\u2014"}
                </div>
              </div>
              <div className="rewards-stat-card">
                <div className="rewards-stat-label">{t("STAT_LIFETIME")}</div>
                <div className="rewards-stat-value">
                  {loyalty?.pointsEarnedLifetime?.toLocaleString() ?? "\u2014"}
                </div>
              </div>
              <div className="rewards-stat-card">
                <div className="rewards-stat-label">{t("STAT_7D")}</div>
                <div className="rewards-stat-value">
                  {loyalty?.pointsEarned7D?.toLocaleString() ?? "\u2014"}
                </div>
              </div>
              <div className="rewards-stat-card">
                <div className="rewards-stat-label">{t("STAT_30D")}</div>
                <div className="rewards-stat-value">
                  {loyalty?.pointsEarned30D?.toLocaleString() ?? "\u2014"}
                </div>
              </div>
              <div className="rewards-stat-card">
                <div className="rewards-stat-label">{t("STAT_MONTH")}</div>
                <div className="rewards-stat-value">
                  {loyalty?.pointsEarnedCurrentMonth?.toLocaleString() ?? "\u2014"}
                </div>
              </div>
              <div className="rewards-stat-card">
                <div className="rewards-stat-label">{t("STAT_NEXT_TIER")}</div>
                <div className="rewards-stat-value rewards-stat-value--small">
                  {loyalty?.nextTier
                    ? `${loyalty.pointsToNextTier.toLocaleString()} to ${nextTierName || normalizeTierName(loyalty.nextTier)}`
                    : "Top tier unlocked"}
                </div>
              </div>
            </div>

            {/* ── 3. Tier Progress ── */}
            <div className="rewards-section-card">
              <div className="rewards-progress-head">
                <span style={{ fontWeight: font.semibold, color: colors.textDefault }}>
                  {t("TIER_PROGRESS_TITLE")}
                </span>
                <span>
                  {loyalty?.nextTier
                    ? t("TIER_PROGRESS_POINTS_TO", {
                        points: loyalty.pointsToNextTier.toLocaleString(),
                        tier: nextTierName || normalizeTierName(loyalty.nextTier),
                      })
                    : t("TIER_PROGRESS_TOP")}
                </span>
              </div>
              <div className="rewards-progress-track">
                <div
                  className="rewards-progress-fill"
                  style={{ width: `${tierProgressPct}%` }}
                />
              </div>
              <div className="rewards-progress-labels">
                <span>{currentTierName}</span>
                <span>{nextTierName || "Max"}</span>
              </div>
            </div>

            {/* ── 4. Tier Ladder ── */}
            <div className="rewards-section-card">
              <div className="rewards-section-head">
                <div className="rewards-kicker">{t("TIER_LADDER_TITLE")}</div>
                <p className="rewards-section-desc">{t("TIER_LADDER_SUBTITLE")}</p>
              </div>
              <div className="rewards-tier-ladder">
                {sortedTiers.map((tier) => {
                  const isCurrent = tier.tierCode === loyalty?.currentTier;
                  const isNext = tier.tierCode === loyalty?.nextTier;
                  const currentRank =
                    sortedTiers.find((t2) => t2.tierCode === loyalty?.currentTier)?.rank ?? 0;
                  const isFuture = tier.rank > currentRank && !isNext;

                  return (
                    <div
                      key={tier.tierCode}
                      className={`rewards-tier-step${isCurrent ? " rewards-tier-step--current" : ""}${isNext ? " rewards-tier-step--next" : ""}${isFuture ? " rewards-tier-step--locked" : ""}`}
                    >
                      <div className="rewards-tier-step-header">
                        <div className="rewards-tier-step-name">{tier.displayName}</div>
                        {isCurrent && (
                          <span className="rewards-tier-badge-sm rewards-tier-badge-sm--current">
                            {t("TIER_CURRENT")}
                          </span>
                        )}
                        {isNext && (
                          <span className="rewards-tier-badge-sm rewards-tier-badge-sm--next">
                            {t("TIER_NEXT")}
                          </span>
                        )}
                        {isFuture && (
                          <span className="rewards-tier-badge-sm rewards-tier-badge-sm--locked">
                            {t("TIER_LOCKED")}
                          </span>
                        )}
                      </div>
                      <div className="rewards-tier-step-points">
                        {t("TIER_POINTS_REQ", {
                          points: tier.minLifetimePoints.toLocaleString(),
                        })}
                      </div>
                    </div>
                  );
                })}
                {sortedTiers.length === 0 && (
                  <div className="rewards-empty">
                    Tier information is not available at the moment.
                  </div>
                )}
              </div>
            </div>

            {/* ── 5. How You Earn ── */}
            <div className="rewards-section-card">
              <div className="rewards-section-head">
                <div className="rewards-kicker">{t("HOW_TITLE")}</div>
                <p className="rewards-section-desc">{t("HOW_SUBTITLE")}</p>
              </div>
              <div className="rewards-how-grid">
                <div className="rewards-how-card">
                  <div className="rewards-how-icon">
                    <span role="img" aria-label="bet">
                      {"\uD83C\uDFB2"}
                    </span>
                  </div>
                  <div className="rewards-how-title">{t("HOW_BET")}</div>
                  <div className="rewards-how-desc">{t("HOW_BET_DESC")}</div>
                </div>
                <div className="rewards-how-card">
                  <div className="rewards-how-icon">
                    <span role="img" aria-label="referral">
                      {"\uD83E\uDD1D"}
                    </span>
                  </div>
                  <div className="rewards-how-title">{t("HOW_REFERRAL")}</div>
                  <div className="rewards-how-desc">
                    {t("HOW_REFERRAL_DESC", { points: "500" })}
                  </div>
                </div>
                <div className="rewards-how-card">
                  <div className="rewards-how-icon">
                    <span role="img" aria-label="promo">
                      {"\uD83C\uDF89"}
                    </span>
                  </div>
                  <div className="rewards-how-title">{t("HOW_PROMO")}</div>
                  <div className="rewards-how-desc">{t("HOW_PROMO_DESC")}</div>
                </div>
              </div>
            </div>

            {/* ── 6. Rewards History (Ledger) ── */}
            <div className="rewards-section-card">
              <div className="rewards-activity-head">
                <div>
                  <div className="rewards-kicker">{t("LEDGER_TITLE")}</div>
                  <p className="rewards-section-desc">{t("LEDGER_SUBTITLE")}</p>
                </div>
                <span className="rewards-activity-count">
                  {loyaltyLedger.length} entries
                </span>
              </div>
              {loyaltyLedger.length > 0 ? (
                <div className="rewards-ledger-list">
                  {loyaltyLedger.map((entry) => (
                    <div key={entry.entryId} className="rewards-ledger-row">
                      <div className="rewards-ledger-left">
                        <div className="rewards-ledger-type">
                          {formatLedgerLabel(entry, t)}
                        </div>
                        <div className="rewards-ledger-meta">
                          {new Date(entry.createdAt).toLocaleString()}
                          {entry.sourceId ? ` \u00B7 ${entry.sourceId.slice(0, 8)}...` : ""}
                        </div>
                      </div>
                      <div className="rewards-ledger-right">
                        <div
                          className={`rewards-ledger-delta${entry.pointsDelta > 0 ? " rewards-ledger-delta--positive" : " rewards-ledger-delta--negative"}`}
                        >
                          {entry.pointsDelta > 0 ? "+" : ""}
                          {entry.pointsDelta}
                        </div>
                        <div className="rewards-ledger-balance">
                          {t("LEDGER_BALANCE_AFTER", {
                            balance: entry.balanceAfter.toLocaleString(),
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rewards-empty">{t("LEDGER_EMPTY")}</div>
              )}
            </div>

            {/* ── 7. Referral Program ── */}
            <div className="rewards-section-card">
              <div className="rewards-activity-head">
                <div>
                  <div className="rewards-kicker">{t("REFERRAL_TITLE")}</div>
                  <p className="rewards-section-desc">{t("REFERRAL_SUBTITLE")}</p>
                </div>
                {referrals.length > 0 && (
                  <div className="rewards-referral-summary">
                    <span>{t("REFERRAL_TOTAL", { count: referrals.length })}</span>
                    <span className="rewards-referral-qualified-count">
                      {t("REFERRAL_QUALIFIED_COUNT", { count: qualifiedReferrals.length })}
                    </span>
                  </div>
                )}
              </div>
              {referrals.length > 0 ? (
                <div className="rewards-referral-list">
                  {referrals.map((ref) => (
                    <div key={ref.referralId} className="rewards-referral-row">
                      <div className="rewards-referral-left">
                        <div className="rewards-referral-player">
                          {t("REFERRAL_REFERRED")}: {ref.referredPlayerId.slice(0, 12)}...
                        </div>
                        <div className="rewards-referral-date">
                          {new Date(ref.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div
                        className={`rewards-referral-badge${ref.qualificationState === "qualified" ? " rewards-referral-badge--qualified" : " rewards-referral-badge--pending"}`}
                      >
                        {ref.qualificationState === "qualified"
                          ? t("REFERRAL_QUALIFIED")
                          : t("REFERRAL_PENDING")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rewards-empty">{t("REFERRAL_EMPTY")}</div>
              )}
            </div>

            {/* ── 8. Betting Patterns (Heatmap) ── */}
            {analyticsData?.heatmap && analyticsData.heatmap.length > 0 && (
              <div className="rewards-section-card">
                <div className="rewards-section-head">
                  <div className="rewards-kicker">{t("HEATMAP_TITLE")}</div>
                  <p className="rewards-section-desc">{t("HEATMAP_SUBTITLE")}</p>
                </div>
                <BettingHeatmap heatmap={analyticsData.heatmap} />
              </div>
            )}

            {/* ── 9. Active Competitions ── */}
            <div className="rewards-section-card">
              <div className="rewards-activity-head">
                <div>
                  <div className="rewards-kicker">{t("COMPETITION_TITLE")}</div>
                  <p className="rewards-section-desc">{t("COMPETITION_SUBTITLE")}</p>
                </div>
                <Link href="/leaderboards" className="rewards-link">
                  {t("COMPETITION_VIEW_ALL")}
                </Link>
              </div>

              {viewerStanding ? (
                <div className="rewards-competition-viewer">
                  <div className="rewards-competition-viewer-main">
                    <div>
                      <div className="rewards-kicker">
                        {t("COMPETITION_YOUR_RANK")} &middot; {featuredBoardName}
                      </div>
                      <div className="rewards-competition-rank">
                        #{viewerStanding.rank} on this board
                      </div>
                      <div className="rewards-competition-copy">
                        {viewerStanding.eventCount} scoring events,{" "}
                        {viewerStanding.score.toLocaleString()} total.
                      </div>
                      <div className="rewards-competition-percentile">
                        {viewerStanding.rank === 1
                          ? "Leading the board right now."
                          : viewerTopBand
                            ? `Top ${viewerTopBand}% of the field with live room to climb.`
                            : "You are live on the board."}
                      </div>
                    </div>
                    <div className="rewards-competition-score">
                      {viewerStanding.score.toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : null}

              {leaderboards.length > 0 ? (
                <div className="rewards-competition-list">
                  {leaderboards.map((board, index) => (
                    <div key={board.leaderboardId} className="rewards-competition-row">
                      <div>
                        <div className="rewards-competition-board-name">{board.name}</div>
                        <div className="rewards-competition-board-meta">
                          {board.rankingMode.toUpperCase()} &middot;{" "}
                          {board.order.toUpperCase()} &middot; {board.metricKey}
                        </div>
                      </div>
                      {index === 0 && featuredStandings.length > 0 ? (
                        <div className="rewards-standing-stack">
                          {featuredStandings.map((standing) => (
                            <div key={standing.playerId} className="rewards-standing-row">
                              <span>
                                #{standing.rank} {standing.playerId.slice(0, 10)}...
                              </span>
                              <strong>{standing.score.toLocaleString()}</strong>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rewards-competition-note">
                          Jump in to see the latest standings.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rewards-empty">{t("COMPETITION_EMPTY")}</div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ── Helpers ── */

function normalizeTierName(tier?: string | null): string {
  if (!tier) {
    return "";
  }
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

function formatLedgerLabel(
  entry: LoyaltyLedgerEntry,
  t: (key: string) => string,
): string {
  if (entry.sourceType === "bet_settlement") {
    return t("LEDGER_SETTLED_BET");
  }
  if (entry.sourceType === "referral") {
    return t("LEDGER_REFERRAL");
  }
  if (entry.sourceType === "admin_manual") {
    return t("LEDGER_ADMIN");
  }
  return entry.entrySubtype || entry.entryType;
}

/* ── Styles ── */

const rewardsPageStyles = `
  .rewards-page {
    max-width: 1000px;
    margin: 0 auto;
    padding: ${spacing["2xl"]} ${spacing.lg};
  }

  /* Header */
  .rewards-header {
    margin-bottom: ${spacing["3xl"]};
  }
  .rewards-header-top {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.lg};
    align-items: flex-start;
  }
  @media (max-width: 640px) {
    .rewards-header-top { flex-direction: column; }
  }
  .rewards-kicker {
    color: ${text.eyebrow.color};
    font-size: ${text.eyebrow.fontSize};
    font-weight: ${text.eyebrow.fontWeight};
    letter-spacing: ${text.eyebrow.letterSpacing};
    text-transform: ${text.eyebrow.textTransform};
    margin-bottom: ${spacing.xs};
  }
  .rewards-title {
    font-size: ${font["5xl"]};
    font-weight: ${font.extrabold};
    color: ${colors.textDefault};
    margin: 0 0 ${spacing.sm};
    letter-spacing: -0.03em;
  }
  .rewards-subtitle {
    font-size: ${font.base};
    color: ${colors.textSecondary};
    margin: 0;
    max-width: 540px;
  }
  .rewards-header-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: ${spacing.md};
  }
  @media (max-width: 640px) {
    .rewards-header-right { flex-direction: row; align-items: center; }
  }
  .rewards-tier-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 112px;
    padding: ${spacing.sm} ${spacing.md};
    border-radius: 999px;
    background: rgba(57, 255, 20, 0.12);
    border: 1px solid rgba(57, 255, 20, 0.28);
    color: ${colors.primary};
    font-size: ${font.sm};
    font-weight: ${font.bold};
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .rewards-back-link {
    color: ${colors.primary};
    font-size: ${font.sm};
    font-weight: ${font.semibold};
    text-decoration: none;
    transition: ${transition.fast};
  }
  .rewards-back-link:hover {
    text-decoration: underline;
  }

  /* Loading & Error */
  .rewards-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: ${spacing.lg};
    padding: ${spacing["4xl"]} 0;
    color: ${colors.textSecondary};
    font-size: ${font.base};
  }
  .rewards-loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgba(57, 255, 20, 0.15);
    border-top-color: ${colors.primary};
    border-radius: 50%;
    animation: rewards-spin 0.8s linear infinite;
  }
  @keyframes rewards-spin {
    to { transform: rotate(360deg); }
  }
  .rewards-error {
    text-align: center;
    padding: ${spacing["3xl"]};
    color: ${colors.dangerText};
    font-size: ${font.base};
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: ${radius["2xl"]};
  }

  /* Stats Dashboard */
  .rewards-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: ${spacing.md};
    margin-bottom: ${spacing.xl};
  }
  .rewards-stat-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: ${radius["2xl"]};
    padding: ${spacing.lg};
    transition: ${transition.fast};
  }
  .rewards-stat-card:hover {
    border-color: rgba(255,255,255,0.14);
  }
  .rewards-stat-card--primary {
    border-color: rgba(57, 255, 20, 0.2);
    background: rgba(57, 255, 20, 0.05);
  }
  .rewards-stat-label {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
    margin-bottom: ${spacing.sm};
  }
  .rewards-stat-value {
    color: ${colors.textDefault};
    font-size: ${font["3xl"]};
    font-weight: ${font.extrabold};
  }
  .rewards-stat-value--large {
    color: ${colors.primary};
    font-size: ${font["4xl"]};
  }
  .rewards-stat-value--small {
    font-size: ${font.lg};
    line-height: 1.35;
  }

  /* Section Cards (shared wrapper) */
  .rewards-section-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: ${radius["2xl"]};
    padding: ${spacing.xl};
    margin-bottom: ${spacing.xl};
  }
  .rewards-section-head {
    margin-bottom: ${spacing.lg};
  }
  .rewards-section-desc {
    color: ${colors.textSecondary};
    font-size: ${font.md};
    margin: 0;
  }

  /* Progress Bar */
  .rewards-progress-head {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.md};
    color: ${colors.textSecondary};
    font-size: ${font.sm};
    margin-bottom: ${spacing.md};
  }
  @media (max-width: 640px) {
    .rewards-progress-head { flex-direction: column; }
  }
  .rewards-progress-track {
    position: relative;
    height: 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
    margin-bottom: ${spacing.sm};
  }
  .rewards-progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #39ff14, #9cff7a);
    box-shadow: 0 0 16px rgba(57, 255, 20, 0.35);
    transition: width 0.6s ease;
  }
  .rewards-progress-labels {
    display: flex;
    justify-content: space-between;
    color: ${colors.textMuted};
    font-size: ${font.xs};
    font-weight: ${font.semibold};
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* Tier Ladder */
  .rewards-tier-ladder {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: ${spacing.md};
  }
  .rewards-tier-step {
    padding: ${spacing.lg};
    border-radius: ${radius.xl};
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    transition: ${transition.normal};
  }
  .rewards-tier-step--current {
    border-color: rgba(57, 255, 20, 0.35);
    background: rgba(57, 255, 20, 0.06);
    box-shadow: 0 0 16px rgba(57, 255, 20, 0.12);
  }
  .rewards-tier-step--next {
    border-color: rgba(57, 255, 20, 0.15);
    background: rgba(57, 255, 20, 0.03);
  }
  .rewards-tier-step--locked {
    opacity: 0.5;
  }
  .rewards-tier-step-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: ${spacing.sm};
    margin-bottom: ${spacing.sm};
  }
  .rewards-tier-step-name {
    color: ${colors.textDefault};
    font-size: ${font.lg};
    font-weight: ${font.bold};
  }
  .rewards-tier-badge-sm {
    font-size: ${font.xxs};
    font-weight: ${font.bold};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 2px 8px;
    border-radius: 999px;
  }
  .rewards-tier-badge-sm--current {
    color: ${colors.primary};
    background: rgba(57, 255, 20, 0.15);
    border: 1px solid rgba(57, 255, 20, 0.3);
  }
  .rewards-tier-badge-sm--next {
    color: ${colors.primary};
    background: rgba(57, 255, 20, 0.08);
    border: 1px solid rgba(57, 255, 20, 0.16);
  }
  .rewards-tier-badge-sm--locked {
    color: ${colors.textMuted};
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .rewards-tier-step-points {
    color: ${colors.textMuted};
    font-size: ${font.sm};
  }

  /* How You Earn */
  .rewards-how-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: ${spacing.md};
  }
  .rewards-how-card {
    padding: ${spacing.lg};
    border-radius: ${radius.xl};
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.06);
    transition: ${transition.normal};
  }
  .rewards-how-card:hover {
    border-color: rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
  }
  .rewards-how-icon {
    width: 40px;
    height: 40px;
    border-radius: ${radius["2xl"]};
    background: rgba(57,255,20,0.08);
    border: 1px solid rgba(57,255,20,0.14);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    margin-bottom: ${spacing.md};
  }
  .rewards-how-title {
    color: ${colors.textDefault};
    font-size: ${font.md};
    font-weight: ${font.bold};
    margin-bottom: ${spacing.xs};
  }
  .rewards-how-desc {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
    line-height: 1.5;
  }

  /* Ledger (Rewards History) */
  .rewards-activity-head {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.md};
    align-items: flex-start;
    margin-bottom: ${spacing.lg};
  }
  .rewards-activity-count {
    color: ${colors.textMuted};
    font-size: ${font.sm};
    white-space: nowrap;
  }
  .rewards-ledger-list {
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
  }
  .rewards-ledger-row {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.md};
    align-items: center;
    padding: ${spacing.md};
    border-radius: ${radius.xl};
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .rewards-ledger-left {
    flex: 1;
    min-width: 0;
  }
  .rewards-ledger-type {
    color: ${colors.textDefault};
    font-size: ${font.md};
    font-weight: ${font.semibold};
    margin-bottom: ${spacing.xs};
  }
  .rewards-ledger-meta {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .rewards-ledger-right {
    text-align: right;
    flex-shrink: 0;
  }
  .rewards-ledger-delta {
    font-size: ${font.lg};
    font-weight: ${font.extrabold};
    margin-bottom: ${spacing.xs};
  }
  .rewards-ledger-delta--positive {
    color: ${colors.primary};
  }
  .rewards-ledger-delta--negative {
    color: ${colors.dangerText};
  }
  .rewards-ledger-balance {
    color: ${colors.textMuted};
    font-size: ${font.xs};
  }

  /* Referral Program */
  .rewards-referral-summary {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: ${spacing.xs};
    color: ${colors.textSecondary};
    font-size: ${font.sm};
    white-space: nowrap;
  }
  .rewards-referral-qualified-count {
    color: ${colors.primary};
    font-weight: ${font.bold};
  }
  .rewards-referral-list {
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
  }
  .rewards-referral-row {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.md};
    align-items: center;
    padding: ${spacing.md};
    border-radius: ${radius.xl};
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .rewards-referral-left {
    flex: 1;
    min-width: 0;
  }
  .rewards-referral-player {
    color: ${colors.textDefault};
    font-size: ${font.md};
    font-weight: ${font.semibold};
    margin-bottom: ${spacing.xs};
  }
  .rewards-referral-date {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
  }
  .rewards-referral-badge {
    font-size: ${font.xxs};
    font-weight: ${font.bold};
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 3px 10px;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .rewards-referral-badge--qualified {
    color: ${colors.primary};
    background: rgba(57, 255, 20, 0.12);
    border: 1px solid rgba(57, 255, 20, 0.24);
  }
  .rewards-referral-badge--pending {
    color: ${colors.textMuted};
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
  }

  /* Competition Section */
  .rewards-link {
    color: ${colors.primary};
    font-size: ${font.sm};
    font-weight: ${font.bold};
    text-decoration: none;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .rewards-link:hover {
    text-decoration: underline;
  }
  .rewards-competition-viewer {
    padding: ${spacing.lg};
    border-radius: ${radius.xl};
    background: rgba(57,255,20,0.06);
    border: 1px solid rgba(57,255,20,0.16);
    margin-bottom: ${spacing.md};
  }
  .rewards-competition-viewer-main {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.lg};
    align-items: center;
  }
  @media (max-width: 640px) {
    .rewards-competition-viewer-main {
      flex-direction: column;
      align-items: flex-start;
    }
  }
  .rewards-competition-rank {
    color: ${colors.textDefault};
    font-size: ${font.lg};
    font-weight: ${font.extrabold};
    margin-bottom: ${spacing.xs};
  }
  .rewards-competition-copy {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
  }
  .rewards-competition-percentile {
    color: ${colors.primary};
    font-size: ${font.sm};
    font-weight: ${font.semibold};
    margin-top: ${spacing.sm};
  }
  .rewards-competition-score {
    color: ${colors.primary};
    font-size: ${font["3xl"]};
    font-weight: ${font.extrabold};
    flex-shrink: 0;
  }
  .rewards-competition-list {
    display: flex;
    flex-direction: column;
    gap: ${spacing.md};
  }
  .rewards-competition-row {
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
    padding: ${spacing.md};
    border-radius: ${radius.xl};
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .rewards-competition-board-name {
    color: ${colors.textDefault};
    font-size: ${font.md};
    font-weight: ${font.bold};
    margin-bottom: ${spacing.xs};
  }
  .rewards-competition-board-meta,
  .rewards-competition-note {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
  }
  .rewards-standing-stack {
    display: flex;
    flex-direction: column;
    gap: ${spacing.xs};
  }
  .rewards-standing-row {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.md};
    color: ${colors.textDefault};
    font-size: ${font.sm};
  }
  .rewards-standing-row strong {
    color: ${colors.primary};
    font-weight: ${font.extrabold};
  }

  /* Empty state */
  .rewards-empty {
    color: ${colors.textSecondary};
    font-size: ${font.md};
    padding: ${spacing.lg} 0;
  }
`;
