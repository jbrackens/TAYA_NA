"use client";

/**
 * FeaturedHero — the top of the discovery page.
 *
 * 2:1 split:
 *   Left (2fr): marquee market with atmospheric gradient background, LIVE
 *               pill, title, CTA pair, volume line.
 *   Right (1fr): side column with live activity + trending markets.
 *
 * The "market" input is optional — when null, the hero still renders a
 * loading skeleton so the page doesn't jank while /discovery fetches.
 */

import Link from "next/link";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
import { WhaleActivityCard } from "./WhaleActivityCard";
import { TopMoversCard } from "./TopMoversCard";

interface FeaturedHeroProps {
  market: PredictionMarket | null;
  activityMarkets: PredictionMarket[];
  topMovers: PredictionMarket[];
}

export function FeaturedHero({
  market,
  activityMarkets,
  topMovers,
}: FeaturedHeroProps) {
  return (
    <>
      <style>{`
        .hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(320px, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        @media (max-width: 1024px) {
          .hero-grid { grid-template-columns: 1fr; }
        }
        .hero {
          position: relative;
          overflow: hidden;
          border-radius: var(--r-lg);
          min-height: 280px;
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid var(--b1);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 28px;
        }
        .hero::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at top right, rgba(57,255,20,0.18), transparent 45%),
            radial-gradient(ellipse at bottom left, rgba(239,68,68,0.10), transparent 50%);
          pointer-events: none;
        }
        .hero-glow {
          position: absolute;
          right: -5%;
          top: -10%;
          width: 65%;
          height: 130%;
          background: linear-gradient(135deg, var(--accent), #0b5e0a);
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.18;
        }
        .hero-content { position: relative; z-index: 1; }
        .hero-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          color: var(--t3);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .hero-live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(239,68,68,0.14);
          border: 1px solid rgba(239,68,68,0.4);
          color: var(--live);
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
        .hero-title {
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.1;
          max-width: 640px;
          margin: 0 0 18px;
          color: var(--t1);
        }
        .hero-cta {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        .hero-cta .ph-btn {
          padding: 10px 18px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 13px;
          border: 0;
          cursor: pointer;
          transition: all 0.15s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .hero-cta .accent {
          background: var(--accent);
          color: #06170a;
          box-shadow: var(--accent-glow);
        }
        .hero-cta .accent:hover { background: var(--accent-hi); }
        .hero-cta .ghost {
          background: transparent;
          color: var(--t1);
          border: 1px solid var(--b2);
        }
        .hero-cta .ghost:hover { background: var(--s2); }
        .hero-volume {
          margin-left: auto;
          color: var(--t3);
          font-size: 12px;
        }

        .hero-skel {
          padding: 28px;
          min-height: 280px;
          border-radius: var(--r-lg);
          background: var(--s1);
          border: 1px solid var(--b1);
        }
        .hero-skel-bar {
          background: var(--s2);
          border-radius: 8px;
        }

        .side-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
      `}</style>

      <div className="hero-grid">
        {market ? (
          <Link
            href={`/market/${market.ticker}`}
            className="hero"
            style={{ textDecoration: "none" }}
          >
            <div className="hero-glow" />
            <div className="hero-content">
              <div className="hero-meta">
                <span className="hero-live">
                  <span className="live-dot" />
                  LIVE
                </span>
                <span>Featured · {market.ticker}</span>
              </div>
              <h2 className="hero-title">{market.title}</h2>
              <div className="hero-cta">
                <span className="accent ph-btn">Trade now</span>
                <span className="ghost ph-btn">View details</span>
                <span className="hero-volume mono">
                  Vol ${(market.volumeCents / 100).toLocaleString()} ·{" "}
                  {market.yesPriceCents}¢ YES
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="hero-skel">
            <div
              className="hero-skel-bar"
              style={{ height: 14, width: "40%", marginBottom: 16 }}
            />
            <div
              className="hero-skel-bar"
              style={{ height: 28, width: "80%", marginBottom: 12 }}
            />
            <div
              className="hero-skel-bar"
              style={{ height: 28, width: "60%", marginBottom: 24 }}
            />
            <div
              className="hero-skel-bar"
              style={{ height: 40, width: "30%" }}
            />
          </div>
        )}

        <div className="side-col">
          <WhaleActivityCard markets={activityMarkets} />
          <TopMoversCard markets={topMovers} />
        </div>
      </div>
    </>
  );
}
