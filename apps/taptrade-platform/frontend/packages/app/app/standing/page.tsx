"use client";

/**
 * /standing — REDESIGN-S5. One surface for "where do I stand": accuracy
 * and realized results (real portfolio summary), balance, my rank on
 * every leaderboard (getUserStanding joined to board definitions), a
 * featured board with the viewer's entry highlighted, and the latest
 * settled outcomes. Collapses the leaderboards/rewards/activity sprawl
 * into the shell's fourth destination; deep pages remain reachable as
 * transitional depth links.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import type {
  PortfolioSummary,
  SettledPositionResult,
} from "@taptrade-ui/api-client/src/prediction-types";
import {
  getLeaderboardEntries,
  getLeaderboards,
  getUserStanding,
  type LeaderboardDefinition,
  type LeaderboardEntry,
} from "../lib/api/leaderboards-client";
import { useAuth } from "../hooks/useAuth";
import { useAppSelector } from "../lib/store/hooks";
import { selectCurrentBalance } from "../lib/store/pointBalanceSlice";
import { FloorNav } from "../components/floor/FloorNav";
import { FloorTabBar } from "../components/floor/FloorTabBar";

const api = createPredictionClient();

const EYEBROW_CLASS =
  "font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-[var(--t3)]";

function fmtSigned(points: number): string {
  const v = Math.round(points).toLocaleString();
  return points > 0 ? `+${v}` : v;
}

export default function StandingPage() {
  const { t } = useTranslation("prediction");
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const balance = useAppSelector(selectCurrentBalance);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [boards, setBoards] = useState<LeaderboardDefinition[]>([]);
  const [standing, setStanding] = useState<LeaderboardEntry[]>([]);
  const [featured, setFeatured] = useState<LeaderboardEntry[]>([]);
  const [viewerEntry, setViewerEntry] = useState<LeaderboardEntry | null>(null);
  const [settled, setSettled] = useState<SettledPositionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const defs = await getLeaderboards();
      const first = defs[0];
      const [entriesRes, standingRes, sum, hist] = await Promise.all([
        first
          ? getLeaderboardEntries(first.id, 10)
          : Promise.resolve(null),
        isAuthenticated ? getUserStanding().catch(() => []) : Promise.resolve([]),
        isAuthenticated
          ? api.getPortfolioSummary().catch(() => null)
          : Promise.resolve(null),
        isAuthenticated
          ? api.getSettledPositions(1, 3).catch(() => null)
          : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setBoards(defs);
      setFeatured(entriesRes?.items ?? []);
      setViewerEntry(entriesRes?.viewerEntry ?? null);
      setStanding(standingRes);
      setSummary(sum);
      setSettled(hist?.data ?? []);
      setError(null);
    })()
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, reloadNonce]);

  const boardName = useMemo(() => {
    const map = new Map(boards.map((b) => [b.id, b.name]));
    return (id: string) => map.get(id) ?? id;
  }, [boards]);

  const featuredBoard = boards[0] ?? null;

  return (
    <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[150px_minmax(0,1fr)] items-start bg-[var(--bg-deep)] max-[1023px]:grid-cols-1 max-[1023px]:pb-16">
      <FloorNav active="standing" />

      <main className="min-w-0 px-6 py-5 max-[760px]:px-4">
        {loading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className="h-[58px] animate-[shimmer_1.5s_infinite] rounded-[8px] bg-[linear-gradient(90deg,var(--surface-2)_25%,var(--border-1)_50%,var(--surface-2)_75%)] bg-[length:200%_100%]"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : error ? (
          <div
            role="alert"
            className="rounded-[8px] border border-[var(--border-1)] border-l-[3px] border-l-[var(--no)] bg-[var(--surface-1)] px-4 py-3"
          >
            <p className="m-0 text-[13px] font-semibold text-[var(--t1)]">
              {t("COULD_NOT_LOAD_MARKETS")}
            </p>
            <p className="mb-0 mt-1 text-[12px] text-[var(--t2)]">{error}</p>
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              className="mt-2.5 inline-flex min-h-9 cursor-pointer items-center rounded-[6px] border border-[var(--border-2)] bg-[var(--surface-1)] px-3.5 text-[12px] font-semibold text-[var(--t1)]"
            >
              {t("RETRY", "Retry")}
            </button>
          </div>
        ) : (
          <>
            <header className="flex flex-wrap gap-x-6 gap-y-2 rounded-[8px] border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-3">
              {[
                [
                  t("FLOOR_ACCURACY", "Accuracy"),
                  summary
                    ? `${Math.round(summary.accuracyPct)}% (${summary.totalPredictions})`
                    : "—",
                ],
                [
                  t("FLOOR_REALIZED", "Realized"),
                  summary ? `${fmtSigned(summary.realizedPoints)} PTS` : "—",
                ],
                [
                  t("BALANCE_LABEL"),
                  typeof balance === "number"
                    ? `${Math.round(balance).toLocaleString()} PTS`
                    : "—",
                ],
                [
                  t("STANDING_BOARDS", "Boards ranked"),
                  isAuthenticated ? String(standing.length) : "—",
                ],
              ].map(([label, value]) => (
                <span key={label} className="flex flex-col gap-0.5">
                  <span className={EYEBROW_CLASS}>{label}</span>
                  <span className="font-mono text-[14px] font-semibold text-[var(--t1)] tabular-nums">
                    {value}
                  </span>
                </span>
              ))}
            </header>

            {!isAuthenticated && (
              <div className="mt-3 rounded-[8px] border border-dashed border-[var(--border-2)] bg-[var(--surface-1)] px-4 py-3">
                <span className="text-[12.5px] font-semibold text-[var(--t1)]">
                  {t("STANDING_SIGNED_OUT", "Sign in to see your ranks and results")}
                </span>{" "}
                <Link
                  href="/auth/login"
                  className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-text)] no-underline"
                >
                  {t("LOG_IN")} →
                </Link>
              </div>
            )}

            {isAuthenticated && standing.length > 0 && (
              <>
                <span className={`${EYEBROW_CLASS} mt-4 block`}>
                  {t("STANDING_MINE", "My standing — every board I rank on")}
                </span>
                <div className="mt-2 flex flex-col gap-1.5">
                  {standing.map((s) => (
                    <Link
                      key={`${s.boardId}`}
                      href={`/leaderboards/${s.boardId}`}
                      className="flex items-center justify-between gap-4 rounded-[8px] border border-[var(--border-1)] bg-[var(--surface-1)] px-4 py-2.5 no-underline transition-colors hover:border-[var(--border-2)] hover:bg-[var(--surface-2)]"
                    >
                      <span className="text-[13px] font-semibold text-[var(--t1)]">
                        {boardName(s.boardId)}
                      </span>
                      <span className="flex items-baseline gap-4 font-mono text-[12px] font-semibold tabular-nums">
                        <span className="text-[var(--accent-text)]">
                          #{s.rank}
                        </span>
                        <span className="text-[var(--t2)]">
                          {fmtSigned(s.metricValue)}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              </>
            )}

            {featuredBoard && (
              <>
                <span className={`${EYEBROW_CLASS} mt-4 block`}>
                  {featuredBoard.name} — {featuredBoard.rewardSummary}
                </span>
                <div className="mt-2 overflow-hidden rounded-[8px] border border-[var(--border-1)] bg-[var(--surface-1)]">
                  {featured.map((e) => {
                    const mine = user?.id === e.userId;
                    return (
                      <div
                        key={e.rank}
                        className={`flex items-center justify-between gap-4 border-b border-[var(--border-1)] px-4 py-2 last:border-b-0 ${
                          mine ? "bg-[var(--accent-soft)]" : ""
                        }`}
                      >
                        <span className="flex items-baseline gap-3">
                          <span className="w-8 font-mono text-[11px] font-semibold text-[var(--t3)] tabular-nums">
                            #{e.rank}
                          </span>
                          <span className="text-[12.5px] font-semibold text-[var(--t1)]">
                            {e.displayName}
                            {mine
                              ? ` · ${t("STANDING_YOU", "you")}`
                              : ""}
                          </span>
                        </span>
                        <span className="font-mono text-[12px] font-semibold text-[var(--t2)] tabular-nums">
                          {fmtSigned(e.metricValue)}
                        </span>
                      </div>
                    );
                  })}
                  {viewerEntry && !featured.some((e) => e.userId === user?.id) && (
                    <div className="flex items-center justify-between gap-4 bg-[var(--accent-soft)] px-4 py-2">
                      <span className="flex items-baseline gap-3">
                        <span className="w-8 font-mono text-[11px] font-semibold text-[var(--accent-text)] tabular-nums">
                          #{viewerEntry.rank}
                        </span>
                        <span className="text-[12.5px] font-semibold text-[var(--t1)]">
                          {viewerEntry.displayName} ·{" "}
                          {t("STANDING_YOU", "you")}
                        </span>
                      </span>
                      <span className="font-mono text-[12px] font-semibold text-[var(--t2)] tabular-nums">
                        {fmtSigned(viewerEntry.metricValue)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}

            {settled.length > 0 && (
              <>
                <span className={`${EYEBROW_CLASS} mt-4 block`}>
                  {t("STANDING_RECENT", "Latest settled")}
                </span>
                <div className="mt-2 flex flex-col gap-1.5">
                  {settled.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-4 rounded-[8px] border border-dashed border-[var(--border-2)] bg-[var(--surface-2)] px-4 py-2"
                    >
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--t2)]">
                        {s.quantity} {s.side === "yes" ? t("YES") : t("NO")} @{" "}
                        {s.entryPricePoints}¢ ·{" "}
                        {new Date(s.paidAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span
                        className={`font-mono text-[12px] font-semibold tabular-nums ${
                          s.realizedPoints > 0
                            ? "text-[var(--yes-text)]"
                            : s.realizedPoints < 0
                              ? "text-[var(--no-text)]"
                              : "text-[var(--t1)]"
                        }`}
                      >
                        {fmtSigned(s.realizedPoints)} PTS
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-5 flex gap-4">
              <Link
                href="/leaderboards"
                className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)] no-underline hover:text-[var(--t1)]"
              >
                {t("STANDING_ALL_BOARDS", "All boards")} →
              </Link>
              <Link
                href="/rewards"
                className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)] no-underline hover:text-[var(--t1)]"
              >
                {t("NAV_REWARDS")} →
              </Link>
            </div>
          </>
        )}
      </main>
      <FloorTabBar active="standing" />
    </div>
  );
}
