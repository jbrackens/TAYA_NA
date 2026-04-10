"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart2,
  Bell,
  CreditCard,
  HeartHandshake,
  Medal,
  Lock,
  ReceiptText,
  Settings,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getProfile } from "../lib/api/user-client";
import { getBalance } from "../lib/api/wallet-client";
import {
  getLoyaltyAccount,
  getLoyaltyLedger,
  getLoyaltyTiers,
} from "../lib/api/loyalty-client";
import {
  getLeaderboards,
  getLeaderboardEntries,
} from "../lib/api/leaderboards-client";
import { getBetAnalytics } from "../lib/api/betting-client";
import type { BetAnalytics } from "../lib/api/betting-client";
import BettingHeatmap from "../components/BettingHeatmap";
import type { UserProfile } from "../lib/api/user-client";
import type { Balance } from "../lib/api/wallet-client";
import type {
  LoyaltyAccount,
  LoyaltyLedgerEntry,
  LoyaltyTier,
} from "../lib/api/loyalty-client";
import type {
  LeaderboardDefinition,
  LeaderboardStanding,
} from "../lib/api/leaderboards-client";
import {
  colors,
  font,
  radius,
  shadow,
  spacing,
  surface,
  text,
  transition,
} from "../lib/theme";

export default function AccountPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyAccount | null>(null);
  const [loyaltyLedger, setLoyaltyLedger] = useState<LoyaltyLedgerEntry[]>([]);
  const [loyaltyTiers, setLoyaltyTiers] = useState<LoyaltyTier[]>([]);
  const [leaderboards, setLeaderboards] = useState<LeaderboardDefinition[]>([]);
  const [featuredStandings, setFeaturedStandings] = useState<LeaderboardStanding[]>([]);
  const [featuredTotalCount, setFeaturedTotalCount] = useState(0);
  const [viewerStanding, setViewerStanding] = useState<LeaderboardStanding | null>(null);
  const [analyticsData, setAnalyticsData] = useState<BetAnalytics | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        return;
      }

      const [
        prof,
        bal,
        rewardsAccount,
        rewardsLedger,
        rewardsTiers,
        competitionBoards,
        betAnalytics,
      ] =
        await Promise.all([
          getProfile(user.id).catch(() => null),
          getBalance(user.id).catch(() => null),
          getLoyaltyAccount(user.id).catch(() => null),
          getLoyaltyLedger(user.id, 4).catch(() => []),
          getLoyaltyTiers().catch(() => []),
          getLeaderboards().catch(() => []),
          getBetAnalytics(user.id).catch(() => null),
        ]);

      setProfile(prof);
      setBalance(bal);
      setLoyalty(rewardsAccount);
      setLoyaltyLedger(rewardsLedger);
      setLoyaltyTiers(rewardsTiers);
      setAnalyticsData(betAnalytics);
      const nextBoards = Array.isArray(competitionBoards)
        ? competitionBoards.slice(0, 2)
        : [];
      setLeaderboards(nextBoards);

      if (nextBoards[0]?.leaderboardId) {
        const standings = await getLeaderboardEntries(nextBoards[0].leaderboardId, 3, 0, user.id).catch(
          () => null,
        );
        setFeaturedStandings(Array.isArray(standings?.items) ? standings.items : []);
        setFeaturedTotalCount(standings?.totalCount || 0);
        setViewerStanding(standings?.viewerEntry || null);
      } else {
        setFeaturedStandings([]);
        setFeaturedTotalCount(0);
        setViewerStanding(null);
      }
    };

    void load();
  }, [user?.id]);

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
  const featuredBoardName = leaderboards[0]?.name || "Featured Board";
  const viewerPercentile =
    viewerStanding && featuredTotalCount > 1
      ? Math.round(
          ((featuredTotalCount - viewerStanding.rank) /
            (featuredTotalCount - 1)) *
            100,
        )
      : 100;
  const viewerTopBand =
    viewerStanding && featuredTotalCount > 0
      ? Math.max(1, 100 - viewerPercentile)
      : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: accountPageStyles }} />
      <div className="account-page">
        <div className="account-header">
          <h1>Player Hub</h1>
          <p>Manage your TAYA NA! profile, wallet, rewards, and account controls.</p>
        </div>

        <div className="account-banner">
          <div className="account-banner-left">
            <div className="account-avatar">
              {(profile?.username ?? user?.username ?? "U").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="account-username">
                {profile?.username ?? user?.username ?? "Loading..."}
              </div>
              <div className="account-email">
                {profile?.email ?? user?.email ?? user?.username ?? "Loading..."}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: spacing.lg }}>
            {loyalty ? (
              <a href="#loyalty-panel" className="account-rewards-chip">
                {loyalty.pointsBalance.toLocaleString()} pts
              </a>
            ) : null}
            <div className="account-balance">
              <div className="account-balance-label">Available Balance</div>
              <div className="account-balance-value">
                ${balance?.availableBalance?.toFixed(2) || "—"}
              </div>
            </div>
          </div>
        </div>

        <div id="loyalty-panel" className="loyalty-panel">
          <div className="loyalty-panel-header">
            <div>
              <div className="loyalty-kicker">Rewards</div>
              <h2 className="loyalty-title">TAYA NA! Rewards</h2>
              <p className="loyalty-subtitle">
                Earn points from settled bets and unlock sharper tier benefits over time.
              </p>
            </div>
            <div className="loyalty-tier-badge">{currentTierName}</div>
          </div>

          <div className="loyalty-stats">
            <div className="loyalty-stat-card">
              <div className="loyalty-stat-label">Points Balance</div>
              <div className="loyalty-stat-value">{loyalty?.pointsBalance ?? "—"}</div>
            </div>
            <div className="loyalty-stat-card">
              <div className="loyalty-stat-label">Lifetime Earned</div>
              <div className="loyalty-stat-value">{loyalty?.pointsEarnedLifetime ?? "—"}</div>
            </div>
            <div className="loyalty-stat-card">
              <div className="loyalty-stat-label">Next Tier</div>
              <div className="loyalty-stat-value loyalty-stat-value--small">
                {loyalty?.nextTier
                  ? `${nextTierName || normalizeTierName(loyalty.nextTier)} in ${loyalty.pointsToNextTier}`
                  : "Top tier unlocked"}
              </div>
            </div>
            <div className="loyalty-stat-card">
              <div className="loyalty-stat-label">7 Day</div>
              <div className="loyalty-stat-value">{loyalty?.pointsEarned7D ?? "—"}</div>
            </div>
            <div className="loyalty-stat-card">
              <div className="loyalty-stat-label">This Month</div>
              <div className="loyalty-stat-value">{loyalty?.pointsEarnedCurrentMonth ?? "—"}</div>
            </div>
          </div>

          <div className="loyalty-progress-card">
            <div className="loyalty-progress-head">
              <span>Tier Progress</span>
              <span>
                {loyalty?.nextTier
                  ? `${loyalty.pointsToNextTier} points to ${nextTierName || normalizeTierName(loyalty.nextTier)}`
                  : "You are in the highest rewards tier"}
              </span>
            </div>
            <div className="loyalty-progress-track">
              <div
                className="loyalty-progress-fill"
                style={{ width: `${tierProgressPct}%` }}
              />
            </div>
          </div>

          <div className="loyalty-activity-card">
            <div className="loyalty-activity-head">
              <h3>Recent Rewards Activity</h3>
              <span>{loyaltyLedger.length} recent entries</span>
            </div>
            {loyaltyLedger.length > 0 ? (
              <div className="loyalty-activity-list">
                {loyaltyLedger.map((entry) => (
                  <div key={entry.entryId} className="loyalty-activity-row">
                    <div>
                      <div className="loyalty-activity-title">
                        {formatLedgerLabel(entry)}
                      </div>
                      <div className="loyalty-activity-meta">
                        {new Date(entry.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="loyalty-activity-points">
                      {entry.pointsDelta > 0 ? "+" : ""}
                      {entry.pointsDelta}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="loyalty-empty">
                Settle your first bet to start building your rewards balance.
              </div>
            )}
          </div>

          <BettingHeatmap heatmap={analyticsData?.heatmap || []} />

          <div className="competition-card">
            <div className="competition-card-head">
              <div>
                <div className="loyalty-kicker">Competition Snapshot</div>
                <h3>Leaderboard Watch</h3>
              </div>
              <Link href="/leaderboards" className="competition-link">
                Open Boards
              </Link>
            </div>

            {viewerStanding ? (
              <div className="competition-viewer-card competition-viewer-card--glow">
                <div className="competition-viewer-main">
                  <div>
                    <div className="competition-viewer-kicker">
                      Your Rank &middot; {featuredBoardName}
                    </div>
                    <div className="competition-viewer-title">
                      #{viewerStanding.rank} on this board
                    </div>
                    <div className="competition-viewer-copy">
                      {viewerStanding.eventCount} scoring events,{" "}
                      {viewerStanding.score.toLocaleString()} total.
                    </div>
                    <div className="competition-viewer-percentile">
                      {viewerStanding.rank === 1
                        ? "Leading the board right now."
                        : viewerTopBand
                          ? `Top ${viewerTopBand}% of the field with live room to climb.`
                          : "You are live on the board."}
                    </div>
                  </div>
                  <div className="competition-viewer-score">
                    {viewerStanding.score.toLocaleString()}
                  </div>
                </div>

                <div className="competition-viewer-stats">
                  <div className="competition-viewer-stat">
                    <span className="competition-viewer-stat-label">Field</span>
                    <strong className="competition-viewer-stat-value">
                      {featuredTotalCount || "—"} runners
                    </strong>
                  </div>
                  <div className="competition-viewer-stat">
                    <span className="competition-viewer-stat-label">Position</span>
                    <strong className="competition-viewer-stat-value">
                      {viewerStanding.rank === 1 ? "Out Front" : `Chasing #${Math.max(1, viewerStanding.rank - 1)}`}
                    </strong>
                  </div>
                  <div className="competition-viewer-stat">
                    <span className="competition-viewer-stat-label">Pressure</span>
                    <strong className="competition-viewer-stat-value">
                      {viewerStanding.rank <= 3 ? "Podium Heat" : "Climb Live"}
                    </strong>
                  </div>
                </div>
              </div>
            ) : null}

            {leaderboards.length > 0 ? (
              <div className="competition-board-list">
                {leaderboards.map((board, index) => (
                  <div key={board.leaderboardId} className="competition-board-row">
                    <div>
                      <div className="competition-board-title">{board.name}</div>
                      <div className="competition-board-meta">
                        {board.rankingMode.toUpperCase()} · {board.order.toUpperCase()} · {board.metricKey}
                      </div>
                    </div>
                    {index === 0 && featuredStandings.length > 0 ? (
                      <div className="competition-standing-stack">
                        {featuredStandings.map((standing) => (
                          <div key={standing.playerId} className="competition-standing-row">
                            <span>#{standing.rank} {standing.playerId}</span>
                            <strong>{standing.score.toLocaleString()}</strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="competition-board-note">
                        Jump in to see the latest standings.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="loyalty-empty">
                Competition boards will appear here when live contests are available.
              </div>
            )}
          </div>
        </div>

        <div className="account-grid">
          <Link href="/account/security" className="account-card">
            <div className="account-card-icon">
              <Settings size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Profile</div>
            <div className="account-card-desc">Update your details and account setup</div>
          </Link>

          <Link href="/bets" className="account-card">
            <div className="account-card-icon">
              <ReceiptText size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">My Bets</div>
            <div className="account-card-desc">Track open and settled tickets</div>
          </Link>

          <Link href="/account/transactions" className="account-card">
            <div className="account-card-icon">
              <CreditCard size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Wallet Activity</div>
            <div className="account-card-desc">Review deposits, withdrawals, and ledger movement</div>
          </Link>

          <Link href="/account/security" className="account-card">
            <div className="account-card-icon">
              <Lock size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Account Security</div>
            <div className="account-card-desc">Passwords, verification, and sign-in protection</div>
          </Link>

          <Link href="/account/notifications" className="account-card">
            <div className="account-card-icon">
              <Bell size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Alerts</div>
            <div className="account-card-desc">Control bet, account, and promo notifications</div>
          </Link>

          <Link href="/responsible-gaming" className="account-card">
            <div className="account-card-icon">
              <HeartHandshake size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Play Safely</div>
            <div className="account-card-desc">Limits, cool-offs, and self-exclusion tools</div>
          </Link>

          <Link href="/leaderboards" className="account-card">
            <div className="account-card-icon">
              <Medal size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Leaderboards</div>
            <div className="account-card-desc">Follow live competition boards and rank ladders</div>
          </Link>

          <Link href="/bets/analytics" className="account-card">
            <div className="account-card-icon">
              <BarChart2 size={28} strokeWidth={2} />
            </div>
            <div className="account-card-title">Bet Analytics</div>
            <div className="account-card-desc">ROI charts, win rates, and performance insights</div>
          </Link>
        </div>
      </div>
    </>
  );
}

function normalizeTierName(tier?: string | null): string {
  if (!tier) {
    return "";
  }
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

function formatLedgerLabel(entry: LoyaltyLedgerEntry): string {
  if (entry.sourceType === "bet_settlement") {
    return "Settled bet reward";
  }
  if (entry.sourceType === "admin_manual") {
    return "Manual loyalty adjustment";
  }
  return entry.entrySubtype || entry.entryType;
}

const accountPageStyles = `
  .account-page { max-width: 1000px; margin: 0 auto; padding: ${spacing["2xl"]} ${spacing.lg}; }
  .account-header { margin-bottom: ${spacing["3xl"]}; }
  .account-header h1 { font-size: ${font["5xl"]}; font-weight: ${font.extrabold}; color: ${colors.textDefault}; margin-bottom: ${spacing.sm}; letter-spacing: -0.03em; }
  .account-header p { font-size: ${font.base}; color: ${colors.textSecondary}; }

  .account-banner {
    background: ${surface.panelRaised.background}; border: ${surface.panelRaised.border}; border-radius: ${surface.panelRaised.borderRadius};
    box-shadow: ${surface.panelRaised.boxShadow};
    padding: ${spacing["2xl"]}; margin-bottom: ${spacing["3xl"]}; display: flex; justify-content: space-between;
    align-items: center;
  }
  @media (max-width: 640px) {
    .account-banner { flex-direction: column; gap: ${spacing.lg}; align-items: flex-start; }
  }

  .account-banner-left { display: flex; align-items: center; gap: ${spacing.lg}; }
  .account-avatar {
    width: 56px; height: 56px; border-radius: ${radius["2xl"]}; background: ${colors.gradient};
    display: flex; align-items: center; justify-content: center;
    font-size: ${font["3xl"]}; font-weight: ${font.bold}; color: ${colors.textPrimary};
    box-shadow: ${shadow.glow};
  }

  .account-username { font-size: ${font.lg}; font-weight: ${font.bold}; color: ${colors.textPrimary}; }
  .account-email { font-size: ${font.md}; color: ${colors.textSecondary}; margin-top: ${spacing.xs}; }

  .account-rewards-chip {
    display: inline-flex;
    align-items: center;
    padding: ${spacing.sm} ${spacing.md};
    border-radius: 999px;
    background: rgba(57, 255, 20, 0.1);
    border: 1px solid rgba(57, 255, 20, 0.24);
    color: ${colors.primary};
    font-size: ${font.sm};
    font-weight: ${font.bold};
    text-decoration: none;
    white-space: nowrap;
    transition: ${transition.normal};
  }
  .account-rewards-chip:hover {
    background: rgba(57, 255, 20, 0.18);
  }

  .account-balance { text-align: right; }
  @media (max-width: 640px) { .account-balance { text-align: left; } }
  .account-balance-label {
    color: ${text.eyebrow.color};
    font-size: ${text.eyebrow.fontSize};
    font-weight: ${text.eyebrow.fontWeight};
    letter-spacing: ${text.eyebrow.letterSpacing};
    text-transform: ${text.eyebrow.textTransform};
    margin-bottom: ${spacing.xs};
  }
  .account-balance-value { font-size: ${font["3xl"]}; font-weight: ${font.extrabold}; color: ${colors.primary}; }

  .loyalty-panel {
    background: linear-gradient(180deg, rgba(8, 17, 25, 0.96), rgba(10, 23, 15, 0.94));
    border: 1px solid rgba(57, 255, 20, 0.18);
    border-radius: ${radius["2xl"]};
    box-shadow: ${shadow.glowLg};
    padding: ${spacing["2xl"]};
    margin-bottom: ${spacing["3xl"]};
  }
  .loyalty-panel-header {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.lg};
    align-items: flex-start;
    margin-bottom: ${spacing.xl};
  }
  @media (max-width: 640px) {
    .loyalty-panel-header { flex-direction: column; }
  }
  .loyalty-kicker {
    color: ${text.eyebrow.color};
    font-size: ${text.eyebrow.fontSize};
    font-weight: ${text.eyebrow.fontWeight};
    letter-spacing: ${text.eyebrow.letterSpacing};
    text-transform: ${text.eyebrow.textTransform};
    margin-bottom: ${spacing.xs};
  }
  .loyalty-title {
    margin: 0 0 ${spacing.xs};
    font-size: ${font["3xl"]};
    font-weight: ${font.extrabold};
    color: ${colors.textDefault};
  }
  .loyalty-subtitle {
    margin: 0;
    color: ${colors.textSecondary};
    font-size: ${font.md};
  }
  .loyalty-tier-badge {
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
  .loyalty-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: ${spacing.md};
    margin-bottom: ${spacing.lg};
  }
  .loyalty-stat-card, .loyalty-progress-card, .loyalty-activity-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: ${radius["2xl"]};
    padding: ${spacing.lg};
  }
  .competition-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: ${radius["2xl"]};
    padding: ${spacing.lg};
    margin-top: ${spacing.lg};
  }
  .competition-card-head {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.md};
    align-items: flex-start;
    margin-bottom: ${spacing.md};
  }
  .competition-card-head h3 {
    margin: 0;
    font-size: ${font.lg};
    color: ${colors.textDefault};
  }
  .competition-link {
    color: ${colors.primary};
    font-size: ${font.sm};
    font-weight: ${font.bold};
    text-decoration: none;
  }
  .competition-viewer-card {
    display: flex;
    flex-direction: column;
    gap: ${spacing.lg};
    padding: ${spacing.lg};
    border-radius: ${radius.xl};
    background: rgba(57,255,20,0.08);
    border: 1px solid rgba(57,255,20,0.18);
    margin-bottom: ${spacing.md};
  }
  .competition-viewer-kicker {
    color: ${text.eyebrow.color};
    font-size: 11px;
    font-weight: ${font.bold};
    letter-spacing: ${text.eyebrow.letterSpacing};
    text-transform: ${text.eyebrow.textTransform};
    margin-bottom: ${spacing.xs};
  }
  .competition-viewer-title {
    color: ${colors.textDefault};
    font-size: ${font.lg};
    font-weight: ${font.extrabold};
    margin-bottom: ${spacing.xs};
  }
  .competition-viewer-copy {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
  }
  .competition-viewer-score {
    color: ${colors.primary};
    font-size: ${font["3xl"]};
    font-weight: ${font.extrabold};
  }
  .competition-viewer-main {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.lg};
    align-items: center;
  }
  .competition-viewer-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${spacing.sm};
  }
  .competition-viewer-stat {
    padding: ${spacing.sm} ${spacing.md};
    border-radius: ${radius.xl};
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
  }
  .competition-viewer-stat-label {
    display: block;
    color: ${colors.textSecondary};
    font-size: 11px;
    font-weight: ${font.bold};
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: ${spacing.xs};
  }
  .competition-viewer-stat-value {
    color: ${colors.textDefault};
    font-size: ${font.md};
    font-weight: ${font.extrabold};
  }
  .competition-viewer-percentile {
    color: ${colors.primary};
    font-size: ${font.sm};
    font-weight: ${font.semibold};
    margin-top: ${spacing.sm};
  }
  @keyframes competition-glow-pulse {
    0%, 100% { box-shadow: 0 0 12px rgba(57, 255, 20, 0.15); }
    50% { box-shadow: 0 0 24px rgba(57, 255, 20, 0.35); }
  }
  .competition-viewer-card--glow {
    animation: competition-glow-pulse 2.5s ease-in-out infinite;
  }
  .competition-board-list {
    display: flex;
    flex-direction: column;
    gap: ${spacing.md};
  }
  .competition-board-row {
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
    padding: ${spacing.md};
    border-radius: ${radius.xl};
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .competition-board-title {
    color: ${colors.textDefault};
    font-size: ${font.md};
    font-weight: ${font.bold};
    margin-bottom: ${spacing.xs};
  }
  .competition-board-meta,
  .competition-board-note {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
  }
  .competition-standing-stack {
    display: flex;
    flex-direction: column;
    gap: ${spacing.xs};
  }
  .competition-standing-row {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.md};
    color: ${colors.textDefault};
    font-size: ${font.sm};
  }
  .competition-standing-row strong {
    color: ${colors.primary};
    font-weight: ${font.extrabold};
  }
  .loyalty-stat-label {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
    margin-bottom: ${spacing.sm};
  }
  .loyalty-stat-value {
    color: ${colors.textDefault};
    font-size: ${font["3xl"]};
    font-weight: ${font.extrabold};
  }
  .loyalty-stat-value--small {
    font-size: ${font.lg};
    line-height: 1.35;
  }
  .loyalty-progress-card { margin-bottom: ${spacing.lg}; }
  .loyalty-progress-head {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.md};
    color: ${colors.textSecondary};
    font-size: ${font.sm};
    margin-bottom: ${spacing.md};
  }
  @media (max-width: 640px) {
    .loyalty-progress-head { flex-direction: column; }
    .competition-viewer-main { flex-direction: column; align-items: flex-start; }
    .competition-viewer-stats { grid-template-columns: 1fr; }
  }
  .loyalty-progress-track {
    position: relative;
    height: 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
  }
  .loyalty-progress-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #39ff14, #9cff7a);
    box-shadow: 0 0 16px rgba(57, 255, 20, 0.35);
  }
  .loyalty-activity-head {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.md};
    align-items: center;
    margin-bottom: ${spacing.md};
  }
  .loyalty-activity-head h3 {
    margin: 0;
    font-size: ${font.lg};
    color: ${colors.textDefault};
  }
  .loyalty-activity-head span {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
  }
  .loyalty-activity-list {
    display: flex;
    flex-direction: column;
    gap: ${spacing.sm};
  }
  .loyalty-activity-row {
    display: flex;
    justify-content: space-between;
    gap: ${spacing.md};
    align-items: center;
    padding: ${spacing.md};
    border-radius: ${radius.xl};
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.05);
  }
  .loyalty-activity-title {
    color: ${colors.textDefault};
    font-size: ${font.md};
    font-weight: ${font.semibold};
    margin-bottom: ${spacing.xs};
  }
  .loyalty-activity-meta {
    color: ${colors.textSecondary};
    font-size: ${font.sm};
  }
  .loyalty-activity-points {
    color: ${colors.primary};
    font-size: ${font.lg};
    font-weight: ${font.extrabold};
  }
  .loyalty-empty {
    color: ${colors.textSecondary};
    font-size: ${font.md};
  }

  .account-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: ${spacing.lg};
  }

  .account-card {
    background: ${surface.panelInteractive.background}; border: ${surface.panelInteractive.border}; border-radius: ${surface.panelInteractive.borderRadius};
    box-shadow: ${surface.panelInteractive.boxShadow};
    padding: ${spacing.xl}; text-decoration: none;
    transition: ${transition.normal}; cursor: pointer;
  }

  .account-card:hover {
    border-color: rgba(57, 255, 20, 0.3); background: ${colors.bgHover};
    box-shadow: ${shadow.glowLg};
    transform: translateY(-1px);
  }

  .account-card-icon {
    width: 48px; height: 48px; border-radius: ${radius["2xl"]}; margin-bottom: ${spacing.md};
    display: inline-flex; align-items: center; justify-content: center;
    color: ${colors.primary}; background: ${surface.chip.background};
    border: ${surface.chip.border};
  }
  .account-card-title { font-size: ${font.lg}; font-weight: ${font.bold}; color: ${colors.textDefault}; margin-bottom: ${spacing.xs}; }
  .account-card-desc { font-size: ${font.md}; color: ${colors.textSecondary}; }
`;
