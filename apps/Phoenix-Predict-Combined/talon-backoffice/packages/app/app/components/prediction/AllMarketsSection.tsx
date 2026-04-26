"use client";

/**
 * AllMarketsSection — paginated grid of open prediction markets, owning
 * its own filter state. The section header is a single row of pills:
 * category pills (All / Politics / Crypto / ...) on the left, closing-
 * window pills (All / 1D / 1W / 1M) on the right. No title — the layout
 * is self-evident.
 *
 * Both filters scope only this section (NOT the hero, Top Movers, or
 * Featured). They compose: pick "Politics" + "1D" = political markets
 * closing within 24h.
 *
 * Pagination is "Load more" rather than infinite scroll: trading users
 * scan price columns, and infinite scroll plays badly with that pattern.
 */

import { useEffect, useState } from "react";
import { MarketGrid } from "./MarketGrid";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import type {
  Category,
  PredictionMarket,
} from "@phoenix-ui/api-client/src/prediction-types";

const api = createPredictionClient();

const PAGE_SIZE = 12;

type DateWindow = "all" | "24h" | "7d" | "30d";

const TIME_PILLS: { value: DateWindow; label: string }[] = [
  { value: "all", label: "All" },
  { value: "24h", label: "1D" },
  { value: "7d", label: "1W" },
  { value: "30d", label: "1M" },
];

function dateWindowToCloseBefore(w: DateWindow): string | undefined {
  if (w === "all") return undefined;
  const ms = w === "24h" ? 24 : w === "7d" ? 24 * 7 : 24 * 30;
  return new Date(Date.now() + ms * 60 * 60 * 1000).toISOString();
}

interface Props {
  categories: Category[];
}

export function AllMarketsSection({ categories }: Props) {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState<string>("all");
  const [dateWindow, setDateWindow] = useState<DateWindow>("all");

  const categoryId = categories.find((c) => c.slug === categorySlug)?.id;

  // Initial load + refetch when either filter changes.
  // closeBefore is computed inside the effect (NOT outside) because it
  // calls Date.now(); recomputing it on every render would produce a new
  // ISO string each time and trigger an infinite re-fetch loop.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMarkets([]);
    setPage(1);
    api
      .getMarkets({
        status: "open",
        page: 1,
        pageSize: PAGE_SIZE,
        categoryId,
        closeBefore: dateWindowToCloseBefore(dateWindow),
      })
      .then((res) => {
        if (cancelled) return;
        setMarkets(res.data || []);
        setPage(res.meta.page);
        setHasNext(res.meta.hasNext);
        setError(null);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        if (!cancelled) setError(msg);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryId, dateWindow]);

  function loadMore() {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    api
      .getMarkets({
        status: "open",
        page: page + 1,
        pageSize: PAGE_SIZE,
        categoryId,
        closeBefore: dateWindowToCloseBefore(dateWindow),
      })
      .then((res) => {
        setMarkets((prev) => [...prev, ...(res.data || [])]);
        setPage(res.meta.page);
        setHasNext(res.meta.hasNext);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
      })
      .finally(() => {
        setLoadingMore(false);
      });
  }

  const filtered = categorySlug !== "all" || dateWindow !== "all";

  return (
    <>
      <style>{`
        .ams-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin: 32px 0 18px;
          flex-wrap: wrap;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .ams-categories {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          flex: 1;
          min-width: 0;
        }
        .ams-cat-pill {
          appearance: none;
          background: rgba(255, 255, 255, 0.05);
          color: var(--t2);
          border: 0;
          border-radius: var(--r-pill);
          padding: 9px 18px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 120ms ease, color 120ms ease;
        }
        .ams-cat-pill:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--t1);
        }
        .ams-cat-pill:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--accent-soft);
        }
        .ams-cat-pill.is-active {
          background: var(--accent);
          color: #061a10;
          font-weight: 600;
        }

        .ams-time-pills {
          display: inline-flex;
          gap: 4px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-1);
          border-radius: var(--r-pill);
          padding: 3px;
          flex-shrink: 0;
        }
        .ams-time-pill {
          appearance: none;
          background: transparent;
          color: var(--t3);
          border: 0;
          border-radius: var(--r-pill);
          padding: 6px 14px;
          min-width: 44px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: color 120ms ease, background 120ms ease;
        }
        .ams-time-pill:hover { color: var(--t1); }
        .ams-time-pill.is-active {
          background: var(--accent);
          color: #061a10;
        }

        .pred-load-more {
          display: flex;
          justify-content: center;
          margin: 24px 0 0;
        }
        .pred-load-more-btn {
          appearance: none;
          background: var(--surface-1);
          color: var(--t1);
          border: 1px solid var(--border-1);
          border-radius: var(--r-pill);
          padding: 12px 28px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
        }
        .pred-load-more-btn:hover:not(:disabled) {
          background: var(--surface-2);
          border-color: rgba(43, 228, 128, 0.5);
          color: var(--accent);
        }
        .pred-load-more-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .ams-empty {
          background: var(--surface-1);
          border: 1px solid var(--border-1);
          border-radius: var(--r-rh-lg);
          padding: 56px;
          text-align: center;
        }
        .ams-empty h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--t1);
        }
        .ams-empty p {
          margin: 8px 0 0;
          color: var(--t3);
          font-size: 13px;
        }
      `}</style>

      <header className="ams-head">
        <nav
          className="ams-categories"
          role="tablist"
          aria-label="Filter by category"
        >
          <button
            type="button"
            role="tab"
            aria-selected={categorySlug === "all"}
            className={`ams-cat-pill ${categorySlug === "all" ? "is-active" : ""}`}
            onClick={() => setCategorySlug("all")}
          >
            All
          </button>
          {categories.map((c) => {
            const isActive = categorySlug === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`ams-cat-pill ${isActive ? "is-active" : ""}`}
                onClick={() => setCategorySlug(c.slug)}
              >
                {c.name}
              </button>
            );
          })}
        </nav>
        <div
          className="ams-time-pills"
          role="tablist"
          aria-label="Filter by closing window"
        >
          {TIME_PILLS.map((pill) => {
            const isActive = dateWindow === pill.value;
            return (
              <button
                key={pill.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`ams-time-pill ${isActive ? "is-active" : ""}`}
                onClick={() => setDateWindow(pill.value)}
              >
                {pill.label}
              </button>
            );
          })}
        </div>
      </header>

      {loading && markets.length === 0 ? (
        <div
          style={{
            color: "var(--t3)",
            fontSize: 13,
            padding: 56,
            textAlign: "center",
          }}
        >
          Loading markets…
        </div>
      ) : error && markets.length === 0 ? (
        <div className="ams-empty">
          <p style={{ margin: 0, color: "var(--t2)", fontSize: 13 }}>
            Couldn't load markets. {error}
          </p>
        </div>
      ) : !loading && markets.length === 0 ? (
        <div className="ams-empty">
          <h3>
            {filtered
              ? "No markets match these filters."
              : "No markets are currently open."}
          </h3>
          <p>
            {filtered
              ? "Try a different category or a wider time window."
              : "Check back soon — new markets are posted continuously."}
          </p>
        </div>
      ) : (
        <>
          <MarketGrid markets={markets} />
          {hasNext && (
            <div className="pred-load-more">
              <button
                type="button"
                className="pred-load-more-btn"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading…" : "Load more markets"}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
