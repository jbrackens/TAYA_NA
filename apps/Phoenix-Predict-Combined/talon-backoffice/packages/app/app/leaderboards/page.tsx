"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  getLeaderboardEntries,
  getLeaderboards,
  type LeaderboardDefinition,
  type LeaderboardStanding,
} from "../lib/api/leaderboards-client";
import { logger } from "../lib/logger";

export default function LeaderboardsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [leaderboards, setLeaderboards] = useState<LeaderboardDefinition[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [entries, setEntries] = useState<LeaderboardStanding[]>([]);
  const [viewerEntry, setViewerEntry] = useState<LeaderboardStanding | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboards() {
      if (!user?.id) {
        setLeaderboards([]);
        setSelectedId("");
        setEntries([]);
        setViewerEntry(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const items = await getLeaderboards();
        if (cancelled) return;
        setLeaderboards(items);
        setSelectedId((current) =>
          current && items.some((item) => item.leaderboardId === current)
            ? current
            : (items[0]?.leaderboardId ?? ""),
        );
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load leaderboards";
        logger.error("Leaderboards", "leaderboard list fetch failed", message);
        setError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLeaderboards();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadSelectedLeaderboard() {
      if (!user?.id || !selectedId) {
        setEntries([]);
        setViewerEntry(null);
        return;
      }

      try {
        setDetailLoading(true);
        const result = await getLeaderboardEntries(selectedId, 25, 0, user.id);
        if (cancelled) return;
        setEntries(result.items || []);
        setViewerEntry(result.viewerEntry || null);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load standings";
        logger.error("Leaderboards", "standings fetch failed", message);
        setError(message);
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    void loadSelectedLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [selectedId, user?.id]);

  const selectedBoard = useMemo(
    () =>
      leaderboards.find((board) => board.leaderboardId === selectedId) || null,
    [leaderboards, selectedId],
  );

  if (authLoading || loading) {
    return <PageState message="Loading leaderboards..." />;
  }

  if (!user?.id) {
    return (
      <PageState
        message="Sign in to see the active leaderboards."
        cta={{ href: "/auth/login", label: "Log in" }}
      />
    );
  }

  if (error) {
    return (
      <PageState
        message={error}
        cta={{ href: "/portfolio", label: "Open portfolio" }}
      />
    );
  }

  return (
    <div className="lb-wrap">
      <Styles />
      <header className="lb-head">
        <div>
          <span className="lb-kicker">Competition</span>
          <h1 className="lb-title">Leaderboards</h1>
          <p className="lb-body">
            Live campaign boards backed by the local leaderboard service.
            Rankings update from recorded events, and your row is called out
            when you&apos;re on the board.
          </p>
        </div>
        <Link href="/portfolio" className="lb-cta">
          Check your stats
          <ArrowRight size={14} />
        </Link>
      </header>

      <section className="lb-summary">
        <div className="lb-summary-card">
          <span className="lb-summary-label">Active boards</span>
          <strong className="lb-summary-value mono">
            {leaderboards.length}
          </strong>
        </div>
        <div className="lb-summary-card">
          <span className="lb-summary-label">Selected metric</span>
          <strong className="lb-summary-value">
            {selectedBoard ? metricLabel(selectedBoard.metricKey) : "—"}
          </strong>
        </div>
        <div className="lb-summary-card">
          <span className="lb-summary-label">Your position</span>
          <strong className="lb-summary-value mono">
            {viewerEntry ? `#${viewerEntry.rank}` : "Unranked"}
          </strong>
        </div>
      </section>

      <div className="lb-grid">
        <aside className="lb-list">
          {leaderboards.map((board) => {
            const active = board.leaderboardId === selectedId;
            return (
              <button
                key={board.leaderboardId}
                type="button"
                className={`lb-board ${active ? "lb-board-active" : ""}`}
                onClick={() => setSelectedId(board.leaderboardId)}
              >
                <div className="lb-board-head">
                  <div className="lb-icon">
                    <Trophy size={18} strokeWidth={1.9} />
                  </div>
                  <span className="lb-chip">
                    {metricLabel(board.metricKey)}
                  </span>
                </div>
                <strong className="lb-board-title">{board.name}</strong>
                <p className="lb-board-body">
                  {board.description || "No description"}
                </p>
                <div className="lb-board-meta">
                  <span>{board.prizeSummary || "Campaign rewards"}</span>
                  <span>{formatWindow(board.windowEndsAt)}</span>
                </div>
              </button>
            );
          })}
        </aside>

        <section className="lb-panel">
          {!selectedBoard ? (
            <div className="lb-empty">No leaderboards are available yet.</div>
          ) : (
            <>
              <header className="lb-panel-head">
                <div>
                  <h2 className="lb-panel-title">{selectedBoard.name}</h2>
                  <p className="lb-panel-copy">
                    {selectedBoard.description || "Current campaign standings"}
                  </p>
                </div>
                <div className="lb-panel-meta">
                  <span>
                    {selectedBoard.prizeSummary || "Campaign rewards"}
                  </span>
                  <span>{formatWindow(selectedBoard.windowEndsAt)}</span>
                </div>
              </header>

              {viewerEntry && (
                <div className="lb-viewer">
                  <span className="lb-viewer-label">Your standing</span>
                  <div className="lb-viewer-row">
                    <strong className="mono">#{viewerEntry.rank}</strong>
                    <span>{formatScore(viewerEntry.score, selectedBoard)}</span>
                    <span>{viewerEntry.eventCount} events</span>
                  </div>
                </div>
              )}

              {detailLoading ? (
                <div className="lb-empty">Loading standings...</div>
              ) : entries.length === 0 ? (
                <div className="lb-empty">
                  No standings have been recorded for this board yet.
                </div>
              ) : (
                <div className="lb-table">
                  <div className="lb-table-head">
                    <span>Rank</span>
                    <span>Trader</span>
                    <span>Score</span>
                    <span>Events</span>
                  </div>
                  {entries.map((entry) => {
                    const isViewer = entry.playerId === user.id;
                    return (
                      <div
                        key={`${entry.leaderboardId}:${entry.playerId}`}
                        className={`lb-table-row ${
                          isViewer ? "lb-table-row-viewer" : ""
                        }`}
                      >
                        <span className="mono">#{entry.rank}</span>
                        <span>
                          <strong>
                            {playerLabel(entry.playerId, user.id)}
                          </strong>
                          <small className="lb-player-id mono">
                            {entry.playerId}
                          </small>
                        </span>
                        <span className="mono">
                          {formatScore(entry.score, selectedBoard)}
                        </span>
                        <span>{entry.eventCount}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
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
    <div className="lb-state">
      <Styles />
      <div className="lb-state-card">
        <p>{message}</p>
        {cta && (
          <Link href={cta.href} className="lb-cta">
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}

function metricLabel(metricKey: string) {
  switch (metricKey) {
    case "net_profit_cents":
      return "Net profit";
    case "stake_cents":
      return "Qualified stake";
    case "qualified_referrals":
      return "Qualified referrals";
    default:
      return metricKey.replace(/_/g, " ");
  }
}

function playerLabel(playerId: string, viewerId: string) {
  if (playerId === viewerId) return "You";
  const short = playerId.replace(/^u-/, "#");
  return `Trader ${short}`;
}

function formatScore(score: number, board: LeaderboardDefinition) {
  if (board.metricKey.endsWith("_cents")) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: board.currency || "USD",
      maximumFractionDigits: 0,
    }).format(score / 100);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(score) ? 0 : 2,
  }).format(score);
}

function formatWindow(windowEndsAt?: string) {
  if (!windowEndsAt) return "Open-ended";
  return `Ends ${new Date(windowEndsAt).toLocaleDateString()}`;
}

function Styles() {
  return (
    <style>{`
      .lb-wrap {
        max-width: 1180px;
        margin: 0 auto;
        padding: 32px 24px 60px;
      }

      .lb-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        gap: 20px;
        margin-bottom: 22px;
      }
      .lb-kicker {
        display: inline-block;
        margin-bottom: 8px;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 11px;
        font-weight: 700;
      }
      .lb-title {
        margin: 0 0 10px;
        font-size: 32px;
        font-weight: 800;
        letter-spacing: -0.03em;
        color: var(--t1);
      }
      .lb-body {
        margin: 0;
        max-width: 640px;
        font-size: 14px;
        line-height: 1.65;
        color: var(--t2);
      }

      .lb-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 20px;
      }
      .lb-summary-card,
      .lb-panel,
      .lb-list,
      .lb-state-card {
        background: var(--s1);
        border: 1px solid var(--b1);
        border-radius: var(--r-lg);
      }
      .lb-summary-card {
        padding: 16px 18px;
      }
      .lb-summary-label {
        display: block;
        margin-bottom: 8px;
        font-size: 12px;
        color: var(--t3);
      }
      .lb-summary-value {
        font-size: 22px;
        color: var(--t1);
      }

      .lb-grid {
        display: grid;
        grid-template-columns: 320px minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }
      .lb-list {
        padding: 14px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .lb-board {
        width: 100%;
        padding: 16px;
        border-radius: 16px;
        border: 1px solid var(--b1);
        background: var(--s2);
        text-align: left;
        cursor: pointer;
        transition: border-color 120ms ease, transform 120ms ease, background 120ms ease;
      }
      .lb-board:hover {
        border-color: var(--accent);
        transform: translateY(-1px);
      }
      .lb-board-active {
        background: color-mix(in srgb, var(--accent) 10%, var(--s2));
        border-color: color-mix(in srgb, var(--accent) 48%, var(--b1));
        box-shadow: var(--accent-glow);
      }
      .lb-board-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .lb-icon {
        width: 36px;
        height: 36px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .lb-chip {
        padding: 5px 10px;
        background: var(--s2);
        border: 1px solid var(--b1);
        color: var(--t3);
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
      }
      .lb-board-title {
        display: block;
        margin-bottom: 8px;
        font-size: 16px;
        font-weight: 700;
        color: var(--t1);
      }
      .lb-board-body {
        margin: 0 0 12px;
        font-size: 13px;
        line-height: 1.6;
        color: var(--t2);
      }
      .lb-board-meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 11px;
        color: var(--t3);
      }

      .lb-panel {
        padding: 20px;
        min-height: 420px;
      }
      .lb-panel-head {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--b1);
      }
      .lb-panel-title {
        margin: 0 0 8px;
        font-size: 22px;
        font-weight: 800;
        color: var(--t1);
      }
      .lb-panel-copy {
        margin: 0;
        color: var(--t2);
        font-size: 13px;
      }
      .lb-panel-meta {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
        font-size: 12px;
        color: var(--t3);
        text-align: right;
      }

      .lb-viewer {
        margin-top: 16px;
        padding: 14px 16px;
        border-radius: 16px;
        border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--b1));
        background: color-mix(in srgb, var(--accent) 8%, var(--s2));
      }
      .lb-viewer-label {
        display: block;
        margin-bottom: 8px;
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
        font-weight: 700;
      }
      .lb-viewer-row {
        display: flex;
        gap: 18px;
        flex-wrap: wrap;
        color: var(--t1);
        font-size: 14px;
      }

      .lb-table {
        margin-top: 16px;
        border: 1px solid var(--b1);
        border-radius: 16px;
        overflow: hidden;
      }
      .lb-table-head,
      .lb-table-row {
        display: grid;
        grid-template-columns: 90px minmax(0, 1.3fr) 140px 90px;
        gap: 14px;
        align-items: center;
        padding: 14px 16px;
      }
      .lb-table-head {
        background: var(--s2);
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .lb-table-row {
        border-top: 1px solid var(--b1);
        font-size: 14px;
        color: var(--t1);
      }
      .lb-table-row-viewer {
        background: color-mix(in srgb, var(--accent) 7%, transparent);
      }
      .lb-player-id {
        display: block;
        margin-top: 4px;
        font-size: 11px;
        color: var(--t3);
      }

      .lb-empty,
      .lb-state {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 50vh;
        padding: 24px;
      }
      .lb-empty {
        min-height: 280px;
        color: var(--t3);
        font-size: 13px;
      }
      .lb-state-card {
        max-width: 420px;
        padding: 28px;
        text-align: center;
      }
      .lb-state-card p {
        margin: 0 0 16px;
        color: var(--t2);
        line-height: 1.6;
      }
      .lb-cta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: var(--accent);
        color: #06170a;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
        box-shadow: var(--accent-glow);
      }
      .lb-cta:hover { background: var(--accent-hi); }

      @media (max-width: 960px) {
        .lb-grid {
          grid-template-columns: 1fr;
        }
        .lb-summary {
          grid-template-columns: 1fr;
        }
        .lb-head,
        .lb-panel-head {
          flex-direction: column;
          align-items: flex-start;
        }
        .lb-panel-meta {
          align-items: flex-start;
          text-align: left;
        }
      }

      @media (max-width: 720px) {
        .lb-wrap {
          padding-inline: 16px;
        }
        .lb-title {
          font-size: 28px;
        }
        .lb-table-head,
        .lb-table-row {
          grid-template-columns: 70px minmax(0, 1fr);
        }
        .lb-table-head span:nth-child(3),
        .lb-table-head span:nth-child(4),
        .lb-table-row span:nth-child(3),
        .lb-table-row span:nth-child(4) {
          display: none;
        }
      }
    `}</style>
  );
}
