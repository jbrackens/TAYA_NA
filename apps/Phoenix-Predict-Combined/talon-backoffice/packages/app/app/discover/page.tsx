"use client";

/**
 * DiscoverPage — secondary discovery surface focused on curated lists
 * the homepage no longer carries: Trending and Closing Soon.
 *
 * The homepage (/predict) now leads with hero + sidebar feed + Featured +
 * full All Markets list. /discover is for users who want to browse the
 * editorially-ranked groupings without scrolling past the hero stack.
 */

import { useEffect, useState } from "react";
import { SectionHead } from "../components/prediction/SectionHead";
import { MarketGrid } from "../components/prediction/MarketGrid";
import type { DiscoveryResponse } from "@phoenix-ui/api-client/src/prediction-types";
import { createPredictionClient } from "@phoenix-ui/api-client/src/prediction-client";

const api = createPredictionClient();

export default function DiscoverPage() {
  const [discovery, setDiscovery] = useState<DiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getDiscovery()
      .then((d) => {
        if (!cancelled) setDiscovery(d);
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
  }, []);

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
        Loading discovery…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="glass"
        style={{
          padding: 56,
          borderRadius: "var(--r-lg)",
          textAlign: "center",
          maxWidth: 560,
          margin: "60px auto",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "var(--t1)",
          }}
        >
          Couldn't load discovery
        </h2>
        <p style={{ margin: "8px 0 0", color: "var(--t3)", fontSize: 13 }}>
          {error}
        </p>
      </div>
    );
  }

  const trending = discovery?.trending ?? [];
  const closingSoon = discovery?.closingSoon ?? [];

  if (trending.length === 0 && closingSoon.length === 0) {
    return (
      <div
        className="glass"
        style={{
          padding: 56,
          borderRadius: "var(--r-lg)",
          textAlign: "center",
          maxWidth: 560,
          margin: "60px auto",
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "var(--t1)",
          }}
        >
          Nothing to show yet
        </h2>
        <p style={{ margin: "8px 0 0", color: "var(--t3)", fontSize: 13 }}>
          Trending and closing-soon lists populate as markets attract activity.
        </p>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        .pred-discover-intro {
          margin: 4px 0 8px;
        }
        .pred-discover-eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--t3);
          margin: 0 0 6px;
        }
        .pred-discover-title {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin: 0 0 8px;
          color: var(--t1);
        }
        .pred-discover-sub {
          color: var(--t2);
          font-size: 14px;
          margin: 0;
          max-width: 640px;
          line-height: 1.5;
        }
      `}</style>
      <header className="pred-discover-intro">
        <p className="pred-discover-eyebrow">Discover</p>
        <h1 className="pred-discover-title">What's moving right now</h1>
        <p className="pred-discover-sub">
          Markets ranked by 24h activity and the contracts closing soonest.
        </p>
      </header>

      {trending.length > 0 && (
        <>
          <SectionHead title="Trending" count={trending.length} />
          <MarketGrid markets={trending} />
        </>
      )}

      {closingSoon.length > 0 && (
        <>
          <SectionHead title="Closing soon" count={closingSoon.length} />
          <MarketGrid markets={closingSoon} />
        </>
      )}
    </div>
  );
}
