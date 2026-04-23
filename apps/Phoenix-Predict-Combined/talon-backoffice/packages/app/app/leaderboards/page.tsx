"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";
import {
  getLeaderboards,
  getLeaderboardEntries,
  getUserStanding,
  type LeaderboardDefinition,
  type LeaderboardEntry,
} from "../lib/api/leaderboards-client";
import { logger } from "../lib/logger";

// /leaderboards — Predict-native boards. Layout follows PLAN-loyalty-
// leaderboards.md §5: left sidebar with all boards + the viewer's rank on
// each; right pane shows the active board as a semantic <table>. The viewer
// row is highlighted with --accent-soft and #N You prefix.
//
// Category Champions boards share one slot in the sidebar via a <select>.
// Mobile: standing summary card above active board (responsive logic in CSS).

const ENTRIES_LIMIT = 25;

export default function LeaderboardsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const boardQuery = searchParams?.get("board") ?? "";

  const [boards, setBoards] = useState<LeaderboardDefinition[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [viewerEntry, setViewerEntry] = useState<LeaderboardEntry | null>(null);
  const [userStanding, setUserStanding] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial: board catalog + user's standing across all boards. Parallel fetch.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const [boardsResult, standingResult] = await Promise.all([
          getLeaderboards(),
          user?.id
            ? getUserStanding().catch(() => [] as LeaderboardEntry[])
            : Promise.resolve([] as LeaderboardEntry[]),
        ]);
        if (cancelled) return;
        setBoards(boardsResult);
        setUserStanding(standingResult);

        const initial =
          boardQuery && boardsResult.some((b) => b.id === boardQuery)
            ? boardQuery
            : (standingResult[0]?.boardId ?? boardsResult[0]?.id ?? "");
        setSelectedId(initial);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load leaderboards";
        logger.error("Leaderboards", "board list fetch failed", message);
        setError(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // We intentionally don't re-run when boardQuery changes — selection is
    // state-driven after the first render. Change-via-URL only applies on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Detail fetch: entries for the selected board.
  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!selectedId) {
        setEntries([]);
        setViewerEntry(null);
        return;
      }
      try {
        setDetailLoading(true);
        const result = await getLeaderboardEntries(selectedId, ENTRIES_LIMIT);
        if (cancelled) return;
        setEntries(result.items ?? []);
        setViewerEntry(result.viewerEntry ?? null);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load standings";
        logger.error("Leaderboards", "entries fetch failed", message);
        setError(message);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // Keep the URL in sync with the active board so the tab is shareable.
  const selectBoard = useCallback(
    (id: string) => {
      setSelectedId(id);
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("board", id);
      router.replace(`/leaderboards?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const selectedBoard = useMemo(
    () => boards.find((b) => b.id === selectedId) ?? null,
    [boards, selectedId],
  );

  // Sidebar renders: static boards explicitly, then Category Champions as a
  // single group with a <select>. Matches plan §2 "multi-board but renders
  // as one board with a category dropdown".
  const { staticBoards, categoryBoards } = useMemo(() => {
    const statics: LeaderboardDefinition[] = [];
    const categories: LeaderboardDefinition[] = [];
    for (const b of boards) {
      // Defensive: tolerate a legacy sportsbook response shape that lacks id.
      // The board is unusable either way, so drop it rather than crash.
      if (typeof b?.id !== "string") continue;
      if (b.id.startsWith("category:")) categories.push(b);
      else statics.push(b);
    }
    return { staticBoards: statics, categoryBoards: categories };
  }, [boards]);

  // Map boardId → user's entry for fast sidebar lookup.
  const standingByBoard = useMemo(() => {
    const map = new Map<string, LeaderboardEntry>();
    for (const e of userStanding) map.set(e.boardId, e);
    return map;
  }, [userStanding]);

  if (authLoading || loading) {
    return <PageState message="Loading leaderboards…" />;
  }
  if (error && boards.length === 0) {
    return (
      <PageState
        message={error}
        cta={{ href: "/portfolio", label: "Back to portfolio" }}
      />
    );
  }
  if (boards.length === 0) {
    return (
      <PageState
        message="No leaderboards have been set up yet."
        cta={{ href: "/predict", label: "Browse markets" }}
      />
    );
  }

  return (
    <div className="lb-wrap">
      <Styles />
      <header className="lb-head">
        <div>
          <span className="lb-kicker">Leaderboards</span>
          <h1 className="lb-title">Rankings</h1>
        </div>
        <Link href="/rewards" className="lb-xlink">
          View your tier →
        </Link>
      </header>

      <div className="lb-grid">
        <aside className="lb-sidebar" role="tablist" aria-label="Boards">
          {staticBoards.map((board) => (
            <BoardTab
              key={board.id}
              board={board}
              active={board.id === selectedId}
              userEntry={standingByBoard.get(board.id) ?? null}
              onClick={() => selectBoard(board.id)}
            />
          ))}

          {categoryBoards.length > 0 && (
            <CategoryPicker
              boards={categoryBoards}
              selectedId={selectedId}
              userStanding={standingByBoard}
              onSelect={selectBoard}
            />
          )}
        </aside>

        <section className="lb-detail" aria-labelledby="lb-detail-title">
          {selectedBoard ? (
            <DetailPanel
              board={selectedBoard}
              entries={entries}
              viewerEntry={viewerEntry}
              loading={detailLoading}
              currentUserId={user?.id ?? ""}
            />
          ) : (
            <div className="lb-empty">Pick a board to see rankings.</div>
          )}
        </section>
      </div>
    </div>
  );
}

function BoardTab({
  board,
  active,
  userEntry,
  onClick,
}: {
  board: LeaderboardDefinition;
  active: boolean;
  userEntry: LeaderboardEntry | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`lb-tab ${active ? "is-active" : ""}`}
      onClick={onClick}
    >
      <span className="lb-tab-name">{board.name}</span>
      <span className="lb-tab-sub">{board.metricLabel}</span>
      <span className="lb-tab-rank mono">
        {userEntry ? `#${userEntry.rank}` : "—"}
      </span>
    </button>
  );
}

function CategoryPicker({
  boards,
  selectedId,
  userStanding,
  onSelect,
}: {
  boards: LeaderboardDefinition[];
  selectedId: string;
  userStanding: Map<string, LeaderboardEntry>;
  onSelect: (id: string) => void;
}) {
  const activeInCategory = boards.some((b) => b.id === selectedId);
  const currentValue = activeInCategory ? selectedId : (boards[0]?.id ?? "");
  const userEntry = userStanding.get(currentValue) ?? null;

  return (
    <div
      className={`lb-tab lb-category ${activeInCategory ? "is-active" : ""}`}
      role="tab"
      aria-selected={activeInCategory}
    >
      <span className="lb-tab-name">Category Champions</span>
      <select
        className="lb-category-select"
        value={currentValue}
        onChange={(e) => onSelect(e.target.value)}
        aria-label="Choose a category"
      >
        {boards.map((b) => (
          <option key={b.id} value={b.id}>
            {b.categorySlug
              ? b.categorySlug.charAt(0).toUpperCase() + b.categorySlug.slice(1)
              : b.name}
          </option>
        ))}
      </select>
      <span className="lb-tab-rank mono">
        {userEntry ? `#${userEntry.rank}` : "—"}
      </span>
    </div>
  );
}

function DetailPanel({
  board,
  entries,
  viewerEntry,
  loading,
  currentUserId,
}: {
  board: LeaderboardDefinition;
  entries: LeaderboardEntry[];
  viewerEntry: LeaderboardEntry | null;
  loading: boolean;
  currentUserId: string;
}) {
  return (
    <>
      <header className="lb-detail-head">
        <div>
          <h2 id="lb-detail-title" className="lb-detail-title">
            {board.name}
          </h2>
          <p className="lb-detail-body">{board.description}</p>
        </div>
        <div className="lb-detail-window mono">{windowLabel(board.window)}</div>
      </header>

      {loading ? (
        <div className="lb-empty">Loading rankings…</div>
      ) : entries.length === 0 ? (
        <div className="lb-empty">
          <p>{board.qualificationMsg}</p>
          {viewerEntry === null && (
            <p className="lb-empty-sub">
              Nobody has qualified for this board yet.
            </p>
          )}
        </div>
      ) : (
        <table className="lb-table" aria-label={`${board.name} rankings`}>
          <caption className="sr-only">
            {board.name} rankings — {windowLabel(board.window)}
          </caption>
          <thead>
            <tr>
              <th scope="col" className="lb-num">
                Rank
              </th>
              <th scope="col">Trader</th>
              <th scope="col" className="lb-num">
                {board.metricLabel}
              </th>
              <th scope="col" className="lb-num lb-hide-sm">
                Settled
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const isViewer = e.userId === currentUserId;
              return (
                <tr
                  key={`${e.boardId}:${e.userId}`}
                  className={isViewer ? "is-viewer" : ""}
                  aria-current={isViewer ? "true" : undefined}
                >
                  <td className="lb-num mono">
                    {isViewer ? `#${e.rank} You` : `#${e.rank}`}
                  </td>
                  <td className="lb-trader">{e.displayName}</td>
                  <td className="lb-num mono">
                    {formatMetric(board, e.metricValue)}
                  </td>
                  <td className="lb-num lb-hide-sm mono">
                    <span className="lb-subtle">—</span>
                  </td>
                </tr>
              );
            })}
            {viewerEntry &&
              !entries.some((e) => e.userId === currentUserId) && (
                <tr className="is-viewer" aria-current="true">
                  <td colSpan={4} className="lb-viewer-row">
                    #{viewerEntry.rank} You ·{" "}
                    {formatMetric(board, viewerEntry.metricValue)}
                  </td>
                </tr>
              )}
          </tbody>
        </table>
      )}
    </>
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
          <Link href={cta.href} className="lb-state-cta">
            {cta.label}
          </Link>
        )}
      </div>
    </div>
  );
}

function windowLabel(window: string): string {
  if (window === "weekly") return "This week";
  if (window === "rolling_30d") return "Last 30 days";
  return window;
}

function formatMetric(board: LeaderboardDefinition, value: number): string {
  switch (board.id) {
    case "accuracy":
      return `${value.toFixed(1)}%`;
    case "pnl_weekly":
      return formatCents(value);
    case "sharpness":
      return `${(value * 100).toFixed(2)}%`;
    default:
      if (board.id.startsWith("category:")) return formatCents(value);
      return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 2,
      }).format(value);
  }
}

function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const dollars = Math.abs(cents) / 100;
  return `${sign}$${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(dollars)}`;
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
        align-items: flex-end;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 22px;
      }
      .lb-kicker {
        display: inline-block;
        margin-bottom: 6px;
        color: var(--accent);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 11px;
        font-weight: 700;
      }
      .lb-title {
        margin: 0;
        font-size: 34px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--t1);
      }
      .lb-xlink {
        font-size: 13px;
        color: var(--t2);
        border-bottom: 1px solid var(--b1);
        padding-bottom: 2px;
      }
      .lb-xlink:hover { color: var(--t1); border-color: var(--accent); }

      .lb-grid {
        display: grid;
        grid-template-columns: 280px minmax(0, 1fr);
        gap: 18px;
        align-items: start;
      }

      /* ── Sidebar ── */
      .lb-sidebar,
      .lb-detail,
      .lb-state-card {
        background: var(--s1);
        border: 1px solid var(--b1);
        border-radius: var(--r-lg);
      }
      .lb-sidebar {
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .lb-tab {
        display: grid;
        grid-template-columns: 1fr auto;
        grid-template-rows: auto auto;
        gap: 2px 12px;
        align-items: center;
        padding: 12px 14px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: var(--r-md);
        color: var(--t2);
        text-align: left;
        cursor: pointer;
        font-family: inherit;
        transition: background 120ms ease, border-color 120ms ease;
      }
      .lb-tab:hover { background: var(--s2); }
      .lb-tab.is-active {
        background: var(--accent-soft);
        border-color: color-mix(in srgb, var(--accent) 30%, transparent);
      }
      .lb-tab-name {
        grid-column: 1;
        grid-row: 1;
        font-size: 14px;
        font-weight: 700;
        color: var(--t1);
      }
      .lb-tab-sub {
        grid-column: 1;
        grid-row: 2;
        font-size: 11px;
        color: var(--t3);
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .lb-tab-rank {
        grid-column: 2;
        grid-row: 1 / 3;
        font-size: 16px;
        font-weight: 700;
        color: var(--t1);
        align-self: center;
      }
      .lb-tab.is-active .lb-tab-rank { color: var(--accent); }

      .lb-category {
        cursor: default;
      }
      .lb-category-select {
        grid-column: 1;
        grid-row: 2;
        margin-top: 4px;
        appearance: none;
        background: var(--s2);
        border: 1px solid var(--b1);
        color: var(--t1);
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-family: inherit;
        cursor: pointer;
      }
      .lb-category-select:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }

      /* ── Detail pane ── */
      .lb-detail {
        padding: 22px;
        min-height: 420px;
      }
      .lb-detail-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 18px;
      }
      .lb-detail-title {
        margin: 0 0 6px;
        font-size: 22px;
        font-weight: 800;
        color: var(--t1);
      }
      .lb-detail-body {
        margin: 0;
        color: var(--t2);
        font-size: 13px;
        line-height: 1.6;
        max-width: 540px;
      }
      .lb-detail-window {
        font-size: 11px;
        color: var(--t3);
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      /* ── Table ── */
      .lb-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }
      .lb-table th,
      .lb-table td {
        padding: 10px 6px;
        border-bottom: 1px solid var(--b1);
        vertical-align: middle;
      }
      .lb-table th {
        text-align: left;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t3);
      }
      .lb-num { text-align: right; }
      .lb-trader { color: var(--t1); font-weight: 500; }
      .lb-subtle { color: var(--t3); }
      .lb-table tbody tr.is-viewer {
        background: var(--accent-soft);
      }
      .lb-table tbody tr.is-viewer td {
        color: var(--t1);
        font-weight: 600;
      }
      .lb-viewer-row {
        text-align: center;
        color: var(--t1);
        padding: 12px;
      }

      .lb-empty {
        padding: 60px 0;
        text-align: center;
        color: var(--t2);
        font-size: 14px;
      }
      .lb-empty-sub {
        margin-top: 6px;
        font-size: 12px;
        color: var(--t3);
      }

      /* ── State shell ── */
      .lb-state {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        padding: 0 24px;
      }
      .lb-state-card {
        max-width: 440px;
        padding: 28px;
        text-align: center;
      }
      .lb-state-card p { margin: 0 0 14px; color: var(--t2); line-height: 1.6; }
      .lb-state-cta {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 10px 18px;
        background: var(--accent);
        color: #06170a;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        box-shadow: var(--accent-glow);
      }
      .lb-state-cta:hover { background: var(--accent-hi); }

      /* ── Responsive ── */
      @media (max-width: 1024px) {
        .lb-grid { grid-template-columns: 1fr; }
        .lb-sidebar {
          flex-direction: row;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
        }
        .lb-sidebar > * {
          flex: 0 0 220px;
          scroll-snap-align: start;
        }
      }
      @media (max-width: 720px) {
        .lb-wrap { padding-inline: 16px; }
        .lb-title { font-size: 26px; }
        .lb-hide-sm { display: none; }
        .lb-detail-head { flex-direction: column; gap: 8px; }
      }
    `}</style>
  );
}
