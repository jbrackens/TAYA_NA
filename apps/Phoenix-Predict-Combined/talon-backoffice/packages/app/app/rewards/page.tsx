"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
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

const WRAP_CLASS =
  "mx-auto max-w-[1120px] pb-[60px] max-[768px]:px-4";
const HEAD_CLASS =
  "mb-[22px] flex items-end justify-between gap-4";
const KICKER_CLASS =
  "mb-1.5 inline-block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--accent)]";
const TITLE_CLASS =
  "m-0 text-[34px] font-extrabold tracking-[-0.02em] text-[var(--t1)] max-[768px]:text-[26px]";
const CROSS_LINK_CLASS =
  "border-b border-[var(--border-1)] pb-0.5 text-[13px] text-[var(--t2)] hover:border-[var(--accent)] hover:text-[var(--t1)]";
const LADDER_CLASS =
  "mb-[22px] grid grid-cols-5 gap-2 max-[768px]:grid-flow-col max-[768px]:auto-cols-[140px] max-[768px]:grid-cols-none max-[768px]:overflow-x-auto max-[768px]:[scroll-snap-type:x_mandatory]";
const LADDER_STEP_BASE_CLASS =
  "relative flex flex-col gap-1.5 rounded-[var(--r-rh-md)] border-x border-b border-x-[var(--border-1)] border-b-[var(--border-1)] border-t-[3px] bg-[var(--surface-1)] px-3.5 pb-3.5 pt-4 max-[768px]:[scroll-snap-align:start]";
const LADDER_NAME_CLASS =
  "text-sm font-bold text-[var(--t1)]";
const LADDER_THRESHOLD_CLASS =
  "text-xs text-[var(--t3)] tabular-nums [font-family:'IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace]";
const GRID_CLASS =
  "grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-[18px] max-[1024px]:grid-cols-1";
const SURFACE_CARD_CLASS =
  "relative rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-[22px]";
const TIER_CARD_HEAD_CLASS =
  "mb-[18px] flex items-baseline justify-between gap-3";
const TIER_PILL_BASE_CLASS =
  "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold tracking-[0.04em] text-[var(--t1)]";
const BALANCE_CLASS =
  "m-0 text-[34px] font-extrabold tracking-[-0.02em] text-[var(--t1)] tabular-nums [font-family:'IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] max-[768px]:text-[28px]";
const BALANCE_UNIT_CLASS =
  "ml-1 text-sm font-medium text-[var(--t3)]";
const PROGRESS_CLASS = "mb-5";
const PROGRESS_HEAD_CLASS =
  "mb-2 flex justify-between text-[13px] text-[var(--t2)]";
const PROGRESS_PCT_CLASS =
  "font-bold text-[var(--t1)] tabular-nums [font-family:'IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace]";
const PROGRESS_TRACK_CLASS =
  "block h-2 w-full overflow-hidden rounded-full border border-[var(--border-1)] bg-[var(--surface-2)] [appearance:none] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[var(--accent)] [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[var(--accent)] [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-[240ms] [&::-webkit-progress-value]:ease-out";
const TOPPED_OUT_CLASS = "m-0 mb-5 text-sm text-[var(--t2)]";
const BENEFITS_TITLE_CLASS =
  "m-0 mb-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-[var(--t3)]";
const BENEFITS_LIST_CLASS =
  "m-0 flex list-none flex-col gap-2.5 p-0";
const BENEFIT_CLASS =
  "grid grid-cols-[10px_1fr_auto] items-center gap-2.5 text-sm text-[var(--t1)]";
const BENEFIT_DOT_BASE_CLASS = "size-2.5 rounded-full";
const BENEFIT_SOURCE_CLASS =
  "text-[11px] uppercase tracking-[0.04em] text-[var(--t3)]";
const LEDGER_HEAD_CLASS =
  "mb-3.5 flex items-baseline justify-between";
const LEDGER_TITLE_CLASS =
  "m-0 text-base font-bold text-[var(--t1)]";
const LEDGER_META_CLASS = "text-xs text-[var(--t3)]";
const LEDGER_EMPTY_CLASS =
  "py-10 text-center text-[13px] text-[var(--t3)]";
const LEDGER_TABLE_CLASS =
  "w-full border-collapse text-[13px] [&_td]:border-b [&_td]:border-[var(--border-1)] [&_td]:px-1.5 [&_td]:py-2.5 [&_td]:align-top [&_th]:border-b [&_th]:border-[var(--border-1)] [&_th]:px-1.5 [&_th]:py-2.5 [&_th]:align-top [&_th]:text-[11px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[0.08em] [&_th]:text-[var(--t3)]";
const TEXT_LEFT_CLASS = "text-left";
const NUM_CLASS = "text-right";
const MONO_CLASS =
  "tabular-nums [font-family:'IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace]";
const DATE_CLASS = `${MONO_CLASS} whitespace-nowrap text-[var(--t2)]`;
const EVENT_CLASS = "text-[var(--t1)]";
const REASON_CLASS = "mt-0.5 text-xs text-[var(--t3)]";
const POS_CLASS = "text-[var(--accent)]";
const NEG_CLASS = "text-[var(--no-text)]";
const SUBTLE_CLASS = "text-[var(--t3)]";
const STATE_CLASS =
  "flex min-h-[60vh] items-center justify-center px-6";
const PREFIRST_CARD_CLASS = "w-full max-w-[440px] text-center";
const PREFIRST_TITLE_CLASS =
  "m-0 mb-2.5 text-[26px] font-extrabold text-[var(--t1)]";
const PREFIRST_BODY_CLASS =
  "m-0 mb-5 text-sm leading-[1.6] text-[var(--t2)]";
const CTA_CLASS =
  "inline-flex items-center gap-1.5 rounded-[var(--r-rh-md)] border-0 bg-[var(--accent)] px-5 py-3 text-[13px] font-bold text-[#04140a] no-underline transition-[transform,filter] duration-[180ms] ease-[ease] hover:-translate-y-px hover:brightness-[1.05]";
const STATE_CARD_CLASS = `${SURFACE_CARD_CLASS} w-full max-w-[440px] text-center`;
const STATE_MESSAGE_CLASS = "m-0 mb-3.5 leading-[1.6] text-[var(--t2)]";

function tierColorClass(tier: number, target: "ladder" | "pill" | "dot") {
  switch (tier) {
    case 1:
      if (target === "ladder") return "[border-top-color:var(--tier-1)]";
      if (target === "pill")
        return "border bg-[color-mix(in_srgb,var(--tier-1)_14%,transparent)] [border-color:color-mix(in_srgb,var(--tier-1)_30%,transparent)]";
      return "bg-[var(--tier-1)]";
    case 2:
      if (target === "ladder") return "[border-top-color:var(--tier-2)]";
      if (target === "pill")
        return "border bg-[color-mix(in_srgb,var(--tier-2)_14%,transparent)] [border-color:color-mix(in_srgb,var(--tier-2)_30%,transparent)]";
      return "bg-[var(--tier-2)]";
    case 3:
      if (target === "ladder") return "[border-top-color:var(--tier-3)]";
      if (target === "pill")
        return "border bg-[color-mix(in_srgb,var(--tier-3)_14%,transparent)] [border-color:color-mix(in_srgb,var(--tier-3)_30%,transparent)]";
      return "bg-[var(--tier-3)]";
    case 4:
      if (target === "ladder") return "[border-top-color:var(--tier-4)]";
      if (target === "pill")
        return "border bg-[color-mix(in_srgb,var(--tier-4)_14%,transparent)] [border-color:color-mix(in_srgb,var(--tier-4)_30%,transparent)]";
      return "bg-[var(--tier-4)]";
    case 5:
      if (target === "ladder") return "[border-top-color:var(--tier-5)]";
      if (target === "pill")
        return "border bg-[color-mix(in_srgb,var(--tier-5)_14%,transparent)] [border-color:color-mix(in_srgb,var(--tier-5)_30%,transparent)]";
      return "bg-[var(--tier-5)]";
    default:
      if (target === "ladder") return "[border-top-color:var(--border-2)]";
      if (target === "pill")
        return "border border-[var(--border-1)] bg-[var(--surface-2)]";
      return "bg-[var(--border-2)]";
  }
}

function currentTierBorderClass(tier: number) {
  switch (tier) {
    case 1:
      return "[border-bottom-color:var(--tier-1)] [border-left-color:var(--tier-1)] [border-right-color:var(--tier-1)]";
    case 2:
      return "[border-bottom-color:var(--tier-2)] [border-left-color:var(--tier-2)] [border-right-color:var(--tier-2)]";
    case 3:
      return "[border-bottom-color:var(--tier-3)] [border-left-color:var(--tier-3)] [border-right-color:var(--tier-3)]";
    case 4:
      return "[border-bottom-color:var(--tier-4)] [border-left-color:var(--tier-4)] [border-right-color:var(--tier-4)]";
    case 5:
      return "[border-bottom-color:var(--tier-5)] [border-left-color:var(--tier-5)] [border-right-color:var(--tier-5)]";
    default:
      return "[border-bottom-color:var(--border-1)] [border-left-color:var(--border-1)] [border-right-color:var(--border-1)]";
  }
}

export default function RewardsPage() {
  const { t } = useTranslation("rewards");
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
          err instanceof Error
            ? err.message
            : t("errors.loadRewards", "Failed to load rewards");
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
    return <PageState message={t("state.loading", "Loading rewards…")} />;
  }
  if (!user?.id) {
    return (
      <PageState
        message={t(
          "state.signIn",
          "Sign in to view your tier, points balance, and recent activity.",
        )}
        cta={{ href: "/auth/login", label: t("state.login", "Log in") }}
      />
    );
  }
  if (error) {
    return (
      <PageState
        message={error}
        cta={{
          href: "/portfolio",
          label: t("state.backToPortfolio", "Back to portfolio"),
        }}
      />
    );
  }

  // Pre-first-settle: full-page empty state with a CTA. Plan §3.
  if (!standing || standing.tier === 0) {
    return <PreFirstSettleState />;
  }

  return (
    <div className={WRAP_CLASS}>
      <header className={HEAD_CLASS}>
        <div>
          <span className={KICKER_CLASS}>{t("kickerShort", "Rewards")}</span>
          <h1 className={TITLE_CLASS}>{t("loyaltyTitle", "Loyalty")}</h1>
        </div>
        <Link href="/leaderboards" className={CROSS_LINK_CLASS}>
          {t("viewLeaderboards", "View leaderboards")} →
        </Link>
      </header>

      <TierLadder tiers={visibleTiers} current={standing.tier} />

      <div className={GRID_CLASS}>
        <section className={SURFACE_CARD_CLASS} aria-labelledby="rw-tier-title">
          <header className={TIER_CARD_HEAD_CLASS}>
            <span
              className={`${TIER_PILL_BASE_CLASS} ${tierColorClass(
                standing.tier,
                "pill",
              )}`}
            >
              {standing.tierName}
            </span>
            <h2 id="rw-tier-title" className={BALANCE_CLASS}>
              {formatPoints(standing.pointsBalance)}
              <span className={BALANCE_UNIT_CLASS}>
                {" "}
                {t("pointsShort", "pts")}
              </span>
            </h2>
          </header>

          {standing.nextTierName ? (
            <div className={PROGRESS_CLASS}>
              <div className={PROGRESS_HEAD_CLASS}>
                <span>
                  {t("progress.pointsTo", "{{points}} pts to", {
                    points: formatPoints(standing.pointsToNextTier),
                  })}{" "}
                  <strong>{standing.nextTierName}</strong>
                </span>
                <span className={PROGRESS_PCT_CLASS}>
                  {Math.round(progressPct)}%
                </span>
              </div>
              <progress
                className={PROGRESS_TRACK_CLASS}
                value={progressPct}
                max={100}
                aria-label={t("progress.label", "Tier progress")}
              />
            </div>
          ) : (
            <p className={TOPPED_OUT_CLASS}>
              {t("progress.topTier", "Top tier reached — thanks for trading with us.")}
            </p>
          )}

          <BenefitsList tiers={visibleTiers} current={standing.tier} />
        </section>

        <section className={SURFACE_CARD_CLASS} aria-labelledby="rw-ledger-title">
          <header className={LEDGER_HEAD_CLASS}>
            <h3 id="rw-ledger-title" className={LEDGER_TITLE_CLASS}>
              {t("ledger.title", "Recent activity")}
            </h3>
            <span className={LEDGER_META_CLASS}>
              {t("ledger.entries", "{{count}} entries", {
                count: ledger.length,
              })}
            </span>
          </header>
          {ledger.length === 0 ? (
            <div className={LEDGER_EMPTY_CLASS}>
              {t("ledger.empty", "No activity yet — settle a market to start earning.")}
            </div>
          ) : (
            <table className={LEDGER_TABLE_CLASS}>
              <caption className="sr-only">
                {t(
                  "ledger.caption",
                  "Recent loyalty ledger entries for {{name}}",
                  { name: user.username || user.id },
                )}
              </caption>
              <thead>
                <tr>
                  <th scope="col" className={TEXT_LEFT_CLASS}>
                    {t("ledger.date", "Date")}
                  </th>
                  <th scope="col" className={TEXT_LEFT_CLASS}>
                    {t("ledger.event", "Event")}
                  </th>
                  <th scope="col" className={NUM_CLASS}>
                    {t("ledger.change", "Change")}
                  </th>
                  <th scope="col" className={NUM_CLASS}>
                    {t("ledger.balance", "Balance")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id}>
                    <td className={DATE_CLASS}>
                      {formatDate(entry.createdAt)}
                    </td>
                    <td>
                      <div className={EVENT_CLASS}>{labelForEntry(entry, t)}</div>
                      {shouldShowReason(entry) && (
                        <div className={REASON_CLASS}>{entry.reason}</div>
                      )}
                    </td>
                    <td
                      className={`${MONO_CLASS} ${NUM_CLASS} ${
                        entry.deltaPoints >= 0 ? POS_CLASS : NEG_CLASS
                      }`}
                    >
                      {entry.deltaPoints >= 0 ? "+" : ""}
                      {formatPoints(entry.deltaPoints)}
                    </td>
                    <td className={`${MONO_CLASS} ${NUM_CLASS} ${SUBTLE_CLASS}`}>
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
  const { t } = useTranslation("rewards");
  return (
    <div className={LADDER_CLASS} role="list" aria-label={t("ladder.aria", "Tier ladder")}>
      {tiers.map((t) => {
        const isCurrent = t.tier === current;
        const isPast = t.tier < current;
        return (
          <div
            key={t.tier}
            role="listitem"
            className={`${LADDER_STEP_BASE_CLASS} ${tierColorClass(
              t.tier,
              "ladder",
            )} ${
              isCurrent
                ? `bg-[var(--surface-2)] ${currentTierBorderClass(t.tier)}`
                : isPast
                  ? ""
                : "opacity-[0.45]"
            }`}
            aria-current={isCurrent ? "step" : undefined}
          >
            <span className={LADDER_NAME_CLASS}>{t.name}</span>
            <span className={LADDER_THRESHOLD_CLASS}>
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
  const { t } = useTranslation("rewards");
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
    <div>
      <h3 className={BENEFITS_TITLE_CLASS}>{t("benefits.unlocked", "Unlocked")}</h3>
      <ul className={BENEFITS_LIST_CLASS}>
        {rows.map((row) => (
          <li key={row.key} className={BENEFIT_CLASS}>
            <span
              className={`${BENEFIT_DOT_BASE_CLASS} ${tierColorClass(
                row.tier,
                "dot",
              )}`}
              aria-hidden="true"
            />
            <span>{row.copy}</span>
            <span className={BENEFIT_SOURCE_CLASS}>{row.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreFirstSettleState() {
  const { t } = useTranslation("rewards");
  return (
    <div className={STATE_CLASS}>
      <div className={PREFIRST_CARD_CLASS}>
        <span className={KICKER_CLASS}>{t("kickerShort", "Rewards")}</span>
        <h1 className={PREFIRST_TITLE_CLASS}>{t("prefirst.title", "No activity yet")}</h1>
        <p className={PREFIRST_BODY_CLASS}>
          {t(
            "prefirst.body",
            "Settle your first trade to start earning points and climb the tier ladder.",
          )}
        </p>
        <Link href="/predict" className={CTA_CLASS}>
          {t("prefirst.browse", "Browse markets")} →
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
    <div className={STATE_CLASS}>
      <div className={STATE_CARD_CLASS}>
        <p className={STATE_MESSAGE_CLASS}>{message}</p>
        {cta && (
          <Link href={cta.href} className={CTA_CLASS}>
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}

function labelForEntry(
  e: LoyaltyLedgerEntry,
  t: ReturnType<typeof useTranslation>["t"],
): string {
  switch (e.eventType) {
    case "accrual": {
      // Backend reason is "settled trade (won)" / "settled trade (lost)".
      // Fold the outcome into the label so the reason row doesn't duplicate it.
      const r = e.reason ?? "";
      if (r.includes("(won)")) return t("ledger.settledWon", "Settled trade · won");
      if (r.includes("(lost)")) return t("ledger.settledLost", "Settled trade · lost");
      return t("ledger.settledTrade", "Settled trade");
    }
    case "adjustment":
      return t("ledger.adjustment", "Adjustment");
    case "promotion":
      return t("ledger.promotion", "Tier promotion");
    case "migration":
      return t("ledger.migration", "Imported from legacy");
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
