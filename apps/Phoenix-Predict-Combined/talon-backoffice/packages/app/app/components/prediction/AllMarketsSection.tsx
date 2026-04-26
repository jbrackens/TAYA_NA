"use client";

/**
 * AllMarketsSection — paginated grid of open prediction markets, scoped
 * by the topic + date-window filter from the parent page.
 *
 * Pagination is "Load more" rather than infinite scroll: trading users
 * scan price columns, and infinite scroll plays badly with that pattern.
 *
 * When the filter changes, the list resets to page 1 and refetches.
 */

import { useEffect, useState } from "react";
import { MarketGrid } from "./MarketGrid";
import { SectionHead } from "./SectionHead";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";

const api = createPredictionClient();

const PAGE_SIZE = 12;

interface Props {
  categoryId?: string;
  closeBefore?: string;
}

export function AllMarketsSection({ categoryId, closeBefore }: Props) {
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load + refetch when filter changes
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
        closeBefore,
      })
      .then((res) => {
        if (cancelled) return;
        setMarkets(res.data || []);
        setPage(res.meta.page);
        setTotal(res.meta.total);
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
  }, [categoryId, closeBefore]);

  function loadMore() {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    api
      .getMarkets({
        status: "open",
        page: page + 1,
        pageSize: PAGE_SIZE,
        categoryId,
        closeBefore,
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

  if (loading && markets.length === 0) {
    return (
      <>
        <SectionHead title="All markets" />
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
      </>
    );
  }

  if (error && markets.length === 0) {
    return (
      <>
        <SectionHead title="All markets" />
        <div
          className="glass"
          style={{
            padding: 32,
            borderRadius: "var(--r-lg)",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, color: "var(--t2)", fontSize: 13 }}>
            Couldn't load markets. {error}
          </p>
        </div>
      </>
    );
  }

  if (!loading && markets.length === 0) {
    const filtered = !!categoryId || !!closeBefore;
    return (
      <>
        <SectionHead title="All markets" />
        <div
          className="glass"
          style={{
            padding: 56,
            borderRadius: "var(--r-lg)",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: "var(--t1)",
            }}
          >
            {filtered
              ? "No markets match these filters."
              : "No markets are currently open."}
          </h3>
          <p style={{ margin: "8px 0 0", color: "var(--t3)", fontSize: 13 }}>
            {filtered
              ? "Try a wider time window or a different topic."
              : "Check back soon — new markets are posted continuously."}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        .pred-load-more {
          display: flex;
          justify-content: center;
          margin: 24px 0 0;
        }
        .pred-load-more-btn {
          appearance: none;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%),
            rgba(0, 0, 0, 0.18);
          color: var(--t1);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--r-pill);
          padding: 12px 28px;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 150ms ease, background 150ms ease, color 150ms ease;
        }
        .pred-load-more-btn:hover:not(:disabled) {
          border-color: rgba(43, 228, 128, 0.5);
          color: var(--accent);
          background-color: rgba(43, 228, 128, 0.08);
        }
        .pred-load-more-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
      `}</style>
      <SectionHead title="All markets" count={total > 0 ? total : undefined} />
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
  );
}
