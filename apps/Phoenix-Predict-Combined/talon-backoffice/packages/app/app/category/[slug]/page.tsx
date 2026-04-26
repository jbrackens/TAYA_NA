"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MarketCard } from "../../components/prediction/MarketCard";
import { logger } from "../../lib/logger";
import type {
  PredictionMarket,
  Category,
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

export default function CategoryPage() {
  const params = useParams() ?? {};
  const slug = (params.slug as string | undefined) ?? "";

  const [category, setCategory] = useState<Category | null>(null);
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const cat = await api.getCategory(slug);
        if (cancelled) return;
        setCategory(cat);
        // Markets are queried directly with a categoryId filter (the gateway
        // joins markets → events → category). This surfaces both real and
        // synthetic-hosted markets in one flat list — synthetic events are
        // hidden from event listings but their markets still belong to the
        // category and should appear here.
        const marketsRes = await api.getMarkets({
          categoryId: cat.id,
          status: "open",
          pageSize: 200,
        });
        if (cancelled) return;
        setMarkets(marketsRes.data || []);
      } catch (err: unknown) {
        logger.error("CategoryPage", "load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div
        style={{
          color: "var(--t3)",
          fontSize: 13,
          padding: 80,
          textAlign: "center",
        }}
      >
        Loading…
      </div>
    );
  }

  return (
    <>
      <style>{`
        .cat-head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .cat-title {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--t1);
          margin: 0;
        }
        .cat-sub {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--t3);
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.04em;
        }
        .cat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }
        .cat-empty {
          padding: 60px 20px;
          text-align: center;
          color: var(--t3);
          font-size: 13px;
          border-radius: var(--r-md);
          background: rgba(0, 0, 0, 0.18);
          border: 1px dashed rgba(255, 255, 255, 0.1);
        }
      `}</style>
      <div>
        <header className="cat-head">
          <h1 className="cat-title">{category?.name || slug}</h1>
          <p className="cat-sub">
            {markets.length} open market{markets.length !== 1 ? "s" : ""}
          </p>
        </header>

        {markets.length === 0 ? (
          <div className="cat-empty">No open markets in this category yet.</div>
        ) : (
          <div className="cat-grid">
            {markets.map((m) => (
              <MarketCard
                key={m.id}
                ticker={m.ticker}
                title={m.title}
                yesPriceCents={m.yesPriceCents}
                noPriceCents={m.noPriceCents}
                volumeCents={m.volumeCents}
                openInterestCents={m.openInterestCents}
                liquidityCents={m.liquidityCents}
                closeAt={m.closeAt}
                status={m.status}
                imagePath={m.imagePath}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
