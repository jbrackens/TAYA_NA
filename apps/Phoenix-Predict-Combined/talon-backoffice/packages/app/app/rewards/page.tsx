"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "../hooks/useAuth";
import {
  getLoyaltyStanding,
  getLoyaltyLedger,
  getLoyaltyTiers,
  type LoyaltyStanding,
  type LoyaltyLedgerEntry,
  type LoyaltyTier,
} from "../lib/api/loyalty-client";
import { logger } from "../lib/logger";

// /rewards — Predict-native loyalty center. Layout follows PLAN-loyalty-
// leaderboards.md §5: horizontal tier ladder strip at top, 2fr/1fr grid of
// tier card + ledger table below. No illustrations, no centered hero, no
// tier-circle icons, no "Congrats!" copy. All points displayed divided by
// 100 (storage is cents-equivalent).

const LEDGER_LIMIT = 20;

export default function RewardsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [standing, setStanding] = useState<LoyaltyStanding | null>(null);
  const [ledger, setLedger] = useState<LoyaltyLedgerEntry[]>([]);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.id) {
        setStanding(null);
        setLedger([]);
        setTiers([]);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [standingResult, ledgerResult, tiersResult] = await Promise.all([
          getLoyaltyStanding(),
          getLoyaltyLedger(LEDGER_LIMIT),
          getLoyaltyTiers(),
        ]);
        if (cancelled) return;
        setStanding(standingResult);
        setLedger(ledgerResult);
        setTiers(tiersResult);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load rewards";
        logger.error("Rewards", "loyalty fetch failed", message);
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Visible tier list excludes tier 0 (the "hidden" state before any activity).
  const visibleTiers = useMemo(
    () => tiers.filter((t) => t.tier >= 1).sort((a, b) => a.tier - b.tier),
    [tiers],
  );

  const progressPct = useMemo(() => {
    if (!standing || visibleTiers.length === 0) return 0;
    const curr = visibleTiers.find((t) => t.tier === standing.tier);
    const next = visibleTiers.find((t) => t.tier === standing.nextTier);
    if (!curr || !next) return 100;
    const span = Math.max(1, next.pointsThreshold - curr.pointsThreshold);
    const advanced = Math.max(0, standing.pointsBalance - curr.pointsThreshold);
    return Math.min(100, Math.max(0, (advanced / span) * 100));
  }, [standing, visibleTiers]);

  if (authLoading || loading) {
    return <PageState message="Loading rewards…" />;
  }
  if (!user?.id) {
    return (
      <PageState
        message="Sign in to view your tier, points balance, and recent activity."
        cta={{ href: "/auth/login", label: "Log in" }}
      />
    );
  }
  if (error) {
    return (
      <PageState
        message={error}
        cta={{ href: "/portfolio", label: "Back to portfolio" }}
      />
    );
  }

  // Pre-first-settle: full-page empty state with a CTA. Plan §3.
  if (!standing || standing.tier === 0) {
    return <PreFirstSettleState />;
  }

  return (
    <div className="rw-wrap">
      <Styles />
      <header className="rw-head">
        <div>
          <span className="rw-kicker">Rewards</span>
          <h1 className="rw-title">Loyalty</h1>
        </div>
        <Link href="/leaderboards" className="rw-xlink">
          View leaderboards →
        </Link>
      </header>

      <TierLadder tiers={visibleTiers} current={standing.tier} />

      <div className="rw-grid">
        <section className="rw-tier-card" aria-labelledby="rw-tier-title">
          <header className="rw-tier-card-head">
            <span className={`rw-tier-pill tier-${standing.tier}`}>
              {standing.tierName}
            </span>
            <h2 id="rw-tier-title" className="rw-balance mono">
              {formatPoints(standing.pointsBalance)}
              <span className="rw-balance-unit"> pts</span>
            </h2>
          </header>

          {standing.nextTierName ? (
            <div className="rw-progress">
              <div className="rw-progress-head">
                <span>
                  {formatPoints(standing.pointsToNextTier)} pts to{" "}
                  <strong>{standing.nextTierName}</strong>
                </span>
                <span className="mono rw-progress-pct">
                  {Math.round(progressPct)}%
                </span>
              </div>
              <div className="rw-progress-track">
                <div
                  className="rw-progress-fill"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="rw-topped-out">
              Top tier reached — thanks for trading with us.
            </p>
          )}

          <BenefitsList tiers={visibleTiers} current={standing.tier} />
        </section>

        <section className="rw-ledger" aria-labelledby="rw-ledger-title">
          <header className="rw-ledger-head">
            <h3 id="rw-ledger-title" className="rw-ledger-title">
              Recent activity
            </h3>
            <span className="rw-ledger-meta">{ledger.length} entries</span>
          </header>
          {ledger.length === 0 ? (
            <div className="rw-ledger-empty">
              No activity yet — settle a market to start earning.
            </div>
          ) : (
            <table className="rw-ledger-table">
              <caption className="sr-only">
                Recent loyalty ledger entries for {user.username || user.id}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Event</th>
                  <th scope="col" className="rw-num">
                    Change
                  </th>
                  <th scope="col" className="rw-num">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td className="mono rw-date">
                      {formatDate(entry.createdAt)}
                    </td>
                    <td>
                      <div className="rw-event">{labelForEntry(entry)}</div>
                      {shouldShowReason(entry) && (
                        <div className="rw-reason">{entry.reason}</div>
                      )}
                    </td>
                    <td
                      className={`mono rw-num ${entry.deltaPoints >= 0 ? "rw-pos" : "rw-neg"}`}
                    >
                      {entry.deltaPoints >= 0 ? "+" : ""}
                      {formatPoints(entry.deltaPoints)}
                    </td>
                    <td className="mono rw-num rw-subtle">
                      {formatPoints(entry.balanceAfter)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}

function TierLadder({
  tiers,
  current,
}: {
  tiers: LoyaltyTier[];
  current: number;
}) {
  return (
    <div className="rw-ladder" role="list" aria-label="Tier ladder">
      {tiers.map((t) => {
        const isCurrent = t.tier === current;
        const isPast = t.tier < current;
        return (
          <div
            key={t.tier}
            role="listitem"
            className={`rw-ladder-step tier-${t.tier} ${
              isCurrent ? "is-current" : isPast ? "is-past" : "is-future"
            }`}
            aria-current={isCurrent ? "step" : undefined}
          >
            <span className="rw-ladder-name">{t.name}</span>
            <span className="rw-ladder-threshold mono">
              {formatPoints(t.pointsThreshold)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BenefitsList({
  tiers,
  current,
}: {
  tiers: LoyaltyTier[];
  current: number;
}) {
  // Benefits are cumulative — show every benefit from tier 1 up through the
  // user's current tier. Matches plan §2.Tiers.
  const rows: Array<{ key: string; tier: number; name: string; copy: string }> =
    [];
  for (const t of tiers) {
    if (t.tier > current) continue;
    const benefits = t.benefits ?? [];
    for (let i = 0; i < benefits.length; i++) {
      rows.push({
        key: `${t.tier}-${i}`,
        tier: t.tier,
        name: t.name,
        copy: benefits[i],
      });
    }
  }
  if (rows.length === 0) return null;
  return (
    <div className="rw-benefits">
      <h3 className="rw-benefits-title">Unlocked</h3>
      <ul className="rw-benefits-list">
        {rows.map((row) => (
          <li key={row.key} className="rw-benefit">
            <span
              className={`rw-benefit-dot tier-${row.tier}`}
              aria-hidden="true"
            />
            <span className="rw-benefit-copy">{row.copy}</span>
            <span className="rw-benefit-source">{row.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreFirstSettleState() {
  return (
    <div className="rw-prefirst">
      <Styles />
      <div className="rw-prefirst-card">
        <span className="rw-kicker">Rewards</span>
        <h1 className="rw-prefirst-title">No activity yet</h1>
        <p className="rw-prefirst-body">
          Settle your first trade to start earning points and climb the tier
          ladder.
        </p>
        <Link href="/predict" className="rw-prefirst-cta">
          Browse markets →
        </Link>
      </div>
    </div>
  );
}

function PageState({
  message,
  cta,
}: {
  message: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rw-state">
      <Styles />
      <div className="rw-state-card">
        <p>{message}</p>
        {cta && (
          <Link href={cta.href} className="rw-prefirst-cta">
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}

function labelForEntry(e: LoyaltyLedgerEntry): string {
  switch (e.eventType) {
    case "accrual": {
      // Backend reason is "settled trade (won)" / "settled trade (lost)".
      // Fold the outcome into the label so the reason row doesn't duplicate it.
      const r = e.reason ?? "";
      if (r.includes("(won)")) return "Settled trade · won";
      if (r.includes("(lost)")) return "Settled trade · lost";
      return "Settled trade";
    }
    case "adjustment":
      return "Adjustment";
    case "promotion":
      return "Tier promotion";
    case "migration":
      return "Imported from legacy";
    default:
      return e.eventType;
  }
}

// shouldShowReason decides whether to render the reason line under the event
// label. For accruals we fold the win/loss outcome into the label itself, so
// rendering the reason ("settled trade (won)") would just duplicate. Other
// event types carry free-form operator notes worth surfacing.
function shouldShowReason(e: LoyaltyLedgerEntry): boolean {
  if (!e.reason) return false;
  if (e.eventType === "accrual") return false;
  return true;
}

function formatPoints(raw: number): string {
  // Storage is cents-equivalent; display divides by 100.
  const display = Math.round(raw / 100);
  return new Intl.NumberFormat("en-US").format(display);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Styles() {
  return (
    <style>{`
      .rw-wrap {
        max-width: 1120px;
        margin: 0 auto;
        padding: 0 0 60px;
      }
      .rw-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 22px;
      }
      .rw-kicker {
        display: inline-block;
        margin-bottom: 6px;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 11px;
        font-weight: 700;
      }
      .rw-title {
        margin: 0;
        font-size: 34px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--t1);
      }
      .rw-xlink {
        font-size: 13px;
        color: var(--t2);
        border-bottom: 1px solid var(--border-1);
        padding-bottom: 2px;
      }
      .rw-xlink:hover { color: var(--t1); border-color: var(--accent); }

      /* ── Horizontal tier ladder strip — no centered hero, no big circle ── */
      .rw-ladder {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 8px;
        margin-bottom: 22px;
      }
      .rw-ladder-step {
        position: relative;
        padding: 16px 14px 14px;
        border-radius: var(--r-rh-md);
        border-top: 3px solid var(--tier-step-color, var(--border-2));
        display: flex;
        flex-direction: column;
        gap: 6px;
        background: var(--surface-1);
        border-left: 1px solid var(--border-1);
        border-right: 1px solid var(--border-1);
        border-bottom: 1px solid var(--border-1);
      }
      .rw-ladder-step.tier-1 { --tier-step-color: var(--tier-1); }
      .rw-ladder-step.tier-2 { --tier-step-color: var(--tier-2); }
      .rw-ladder-step.tier-3 { --tier-step-color: var(--tier-3); }
      .rw-ladder-step.tier-4 { --tier-step-color: var(--tier-4); }
      .rw-ladder-step.tier-5 { --tier-step-color: var(--tier-5); }
      .rw-ladder-step.is-future { opacity: 0.45; }
      .rw-ladder-step.is-current {
        background: var(--surface-2);
        border-left-color: var(--tier-step-color);
        border-right-color: var(--tier-step-color);
        border-bottom-color: var(--tier-step-color);
      }
      .rw-ladder-name {
        font-size: 14px;
        font-weight: 700;
        color: var(--t1);
      }
      .rw-ladder-threshold {
        font-size: 12px;
        color: var(--t3);
      }

      /* ── 2fr / 1fr grid: tier card + ledger ──
       * Plan §5 swapped left/right from the original: tier card is meaningful
       * detail, ledger is the wider glanceable table. */
      .rw-grid {
        display: grid;
        grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
        gap: 18px;
      }
      .rw-tier-card,
      .rw-ledger,
      .rw-state-card {
        position: relative;
        padding: 22px;
        border-radius: var(--r-rh-lg);
        background: var(--surface-1);
        border: 1px solid var(--border-1);
      }
      .rw-tier-card-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 18px;
      }
      .rw-balance {
        margin: 0;
        font-size: 34px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--t1);
      }
      .rw-balance-unit {
        font-size: 14px;
        color: var(--t3);
        font-weight: 500;
        margin-left: 4px;
      }

      /* ── Tier pill in the card header, and the shared tier-N colorway ── */
      .rw-tier-pill {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        border-radius: 999px;
        color: var(--t1);
        background: color-mix(in srgb, var(--tier-pill-color) 14%, transparent);
        border: 1px solid color-mix(in srgb, var(--tier-pill-color) 30%, transparent);
      }
      .rw-tier-pill.tier-1 { --tier-pill-color: var(--tier-1); }
      .rw-tier-pill.tier-2 { --tier-pill-color: var(--tier-2); }
      .rw-tier-pill.tier-3 { --tier-pill-color: var(--tier-3); }
      .rw-tier-pill.tier-4 { --tier-pill-color: var(--tier-4); }
      .rw-tier-pill.tier-5 { --tier-pill-color: var(--tier-5); }

      /* ── Progress bar to next tier ── */
      .rw-progress {
        margin-bottom: 20px;
      }
      .rw-progress-head {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        color: var(--t2);
        margin-bottom: 8px;
      }
      .rw-progress-pct { color: var(--t1); font-weight: 700; }
      .rw-progress-track {
        height: 8px;
        border-radius: 999px;
        background: var(--surface-2);
        border: 1px solid var(--border-1);
        overflow: hidden;
      }
      .rw-progress-fill {
        height: 100%;
        border-radius: 999px;
        background: var(--accent);
        transition: width 240ms ease-out;
      }
      .rw-topped-out {
        margin: 0 0 20px;
        color: var(--t2);
        font-size: 14px;
      }

      /* ── Benefits list ── */
      .rw-benefits-title {
        margin: 0 0 10px;
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .rw-benefits-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .rw-benefit {
        display: grid;
        grid-template-columns: 10px 1fr auto;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        color: var(--t1);
      }
      .rw-benefit-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .rw-benefit-dot.tier-1 { background: var(--tier-1); }
      .rw-benefit-dot.tier-2 { background: var(--tier-2); }
      .rw-benefit-dot.tier-3 { background: var(--tier-3); }
      .rw-benefit-dot.tier-4 { background: var(--tier-4); }
      .rw-benefit-dot.tier-5 { background: var(--tier-5); }
      .rw-benefit-source {
        font-size: 11px;
        color: var(--t3);
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      /* ── Ledger table — plain <table>, not cards ── */
      .rw-ledger-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        margin-bottom: 14px;
      }
      .rw-ledger-title {
        margin: 0;
        font-size: 16px;
        font-weight: 700;
        color: var(--t1);
      }
      .rw-ledger-meta {
        font-size: 12px;
        color: var(--t3);
      }
      .rw-ledger-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .rw-ledger-table th,
      .rw-ledger-table td {
        padding: 10px 6px;
        text-align: left;
        border-bottom: 1px solid var(--border-1);
        vertical-align: top;
      }
      .rw-ledger-table th {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .rw-num { text-align: right; }
      .rw-pos { color: var(--accent); }
      .rw-neg { color: var(--no-text); }
      .rw-subtle { color: var(--t3); }
      .rw-date { color: var(--t2); white-space: nowrap; }
      .rw-event { color: var(--t1); }
      .rw-reason {
        margin-top: 2px;
        color: var(--t3);
        font-size: 12px;
      }
      .rw-ledger-empty {
        padding: 40px 0;
        text-align: center;
        color: var(--t3);
        font-size: 13px;
      }

      /* ── Pre-first-settle empty state + generic state card ── */
      .rw-state,
      .rw-prefirst {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        padding: 0 24px;
      }
      .rw-prefirst-card,
      .rw-state-card {
        max-width: 440px;
        width: 100%;
        text-align: center;
      }
      .rw-prefirst-title {
        margin: 0 0 10px;
        font-size: 26px;
        font-weight: 800;
        color: var(--t1);
      }
      .rw-prefirst-body {
        margin: 0 0 20px;
        color: var(--t2);
        font-size: 14px;
        line-height: 1.6;
      }
      .rw-prefirst-cta,
      .rw-state-card a {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 12px 20px;
        color: #04140a;
        border-radius: var(--r-rh-md);
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
        background: var(--accent);
        border: none;
        transition: transform 180ms ease, filter 180ms ease;
      }
      .rw-prefirst-cta:hover,
      .rw-state-card a:hover { transform: translateY(-1px); filter: brightness(1.05); }
      .rw-state-card p {
        margin: 0 0 14px;
        color: var(--t2);
        line-height: 1.6;
      }

      /* ── Responsive ── */
      @media (max-width: 1024px) {
        .rw-grid { grid-template-columns: 1fr; }
      }
      @media (max-width: 768px) {
        .rw-wrap { padding-inline: 16px; }
        .rw-ladder {
          grid-auto-flow: column;
          grid-auto-columns: 140px;
          grid-template-columns: none;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
        }
        .rw-ladder-step { scroll-snap-align: start; }
        .rw-title { font-size: 26px; }
        .rw-balance { font-size: 28px; }
      }
    `}</style>
  );
}
