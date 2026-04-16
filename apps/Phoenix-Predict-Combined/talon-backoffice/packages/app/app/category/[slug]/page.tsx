"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MarketCard } from "../../components/prediction/MarketCard";
import type {
  PredictionMarket,
  Category,
} from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

export default function CategoryPage() {
  // useParams() returns null during the initial static render.
  const params = useParams() ?? {};
  const slug = (params.slug as string | undefined) ?? "";

  const [category, setCategory] = useState<Category | null>(null);
  const [markets, setMarkets] = useState<PredictionMarket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const cat = await api.getCategory(slug);
        setCategory(cat);
        const res = await api.getMarkets({
          status: "open",
          page: 1,
          pageSize: 50,
        });
        setMarkets(res.data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("Category load failed:", msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-1">
        {category?.name || slug}
      </h1>
      <p className="text-sm text-gray-400 mb-6">
        {markets.length} open market{markets.length !== 1 ? "s" : ""}
      </p>

      {markets.length === 0 ? (
        <div className="text-center text-gray-500 text-sm py-12">
          No open markets in this category yet
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {markets.map((m) => (
            <MarketCard
              key={m.id}
              ticker={m.ticker}
              title={m.title}
              yesPriceCents={m.yesPriceCents}
              noPriceCents={m.noPriceCents}
              volumeCents={m.volumeCents}
              closeAt={m.closeAt}
              status={m.status}
            />
          ))}
        </div>
      )}
    </div>
  );
}
