'use client';

import React, { useEffect, useState } from 'react';
import { MarketCard } from '../components/prediction/MarketCard';
import { CategoryPills } from '../components/prediction/CategoryPills';
import type { Category, DiscoveryResponse } from '@phoenix-ui/api-client/src/prediction-types';
import { createPredictionClient } from '@phoenix-ui/api-client/src/prediction-client';

const api = createPredictionClient();

export default function PredictDiscoveryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cats, disc] = await Promise.all([
          api.getCategories(),
          api.getDiscovery(),
        ]);
        setCategories(cats);
        setDiscovery(disc);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('Discovery load failed:', msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-sm">Loading markets...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Predict</h1>
        <p className="text-sm text-gray-400">Trade on the outcome of real-world events</p>
      </div>

      {/* Category pills */}
      <div className="mb-6">
        <CategoryPills
          categories={categories}
          activeSlug={activeCategory}
          onSelect={setActiveCategory}
        />
      </div>

      {discovery && (
        <>
          {/* Featured */}
          {discovery.featured.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-3">Featured</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {discovery.featured.map(m => (
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
            </section>
          )}

          {/* Trending */}
          {discovery.trending.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-3">Trending</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {discovery.trending.map(m => (
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
            </section>
          )}

          {/* Closing Soon */}
          {discovery.closingSoon.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-3">Closing Soon</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {discovery.closingSoon.map(m => (
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
            </section>
          )}

          {/* Recent */}
          {discovery.recent.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-white mb-3">Recently Added</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {discovery.recent.map(m => (
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
            </section>
          )}
        </>
      )}
    </div>
  );
}
