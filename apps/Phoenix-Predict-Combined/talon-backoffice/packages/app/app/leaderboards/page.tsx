"use client";

/**
 * LeaderboardsPage — Predict-native "coming soon" stub.
 *
 * The old sportsbook version ranked players by net profit / stake /
 * wins / referrals — metrics that don't exist in the prediction domain.
 * A Predict leaderboard would rank by accuracy %, realized P&L, or
 * streak — features that need both a backend aggregator and a design
 * round before shipping.
 */

import Link from "next/link";
import { Trophy } from "lucide-react";

export default function LeaderboardsPage() {
  return (
    <div className="lb-wrap">
      <Styles />
      <div className="lb-card">
        <div className="lb-icon">
          <Trophy size={28} strokeWidth={1.8} />
        </div>
        <span className="lb-eyebrow">Coming soon</span>
        <h1 className="lb-title">Predict leaderboards</h1>
        <p className="lb-body">
          We're building prediction-native leaderboards: accuracy, realized P&L,
          and longest correct streak. Expect them to highlight traders who
          consistently read markets right, not just those who size big.
        </p>
        <div className="lb-future">
          <span className="lb-future-chip">Accuracy %</span>
          <span className="lb-future-chip">Realized P&L</span>
          <span className="lb-future-chip">Streak</span>
        </div>
        <Link href="/portfolio" className="lb-cta">
          Check your stats
        </Link>
      </div>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .lb-wrap {
        max-width: 1440px;
        margin: 0 auto;
        padding: 60px 24px;
        display: flex;
        justify-content: center;
      }
      .lb-card {
        width: 100%;
        max-width: 520px;
        background: var(--s1);
        border: 1px solid var(--b1);
        border-radius: var(--r-lg);
        padding: 40px 36px 32px;
        text-align: center;
      }
      .lb-icon {
        width: 56px;
        height: 56px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 18px;
      }
      .lb-eyebrow {
        display: inline-block;
        padding: 4px 12px;
        margin-bottom: 14px;
        background: var(--s2);
        border: 1px solid var(--b1);
        color: var(--t3);
        border-radius: 999px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
      }
      .lb-title {
        margin: 0 0 12px;
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--t1);
      }
      .lb-body {
        margin: 0 auto 18px;
        max-width: 420px;
        font-size: 14px;
        line-height: 1.6;
        color: var(--t2);
      }
      .lb-future {
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
        margin-bottom: 20px;
      }
      .lb-future-chip {
        font-family: 'IBM Plex Mono', ui-monospace, monospace;
        font-size: 11px;
        font-weight: 600;
        color: var(--t2);
        padding: 5px 10px;
        border-radius: var(--r-sm);
        background: var(--s2);
        border: 1px solid var(--b1);
      }
      .lb-cta {
        display: inline-block;
        padding: 10px 20px;
        background: var(--accent);
        color: #06222b;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
        box-shadow: var(--accent-glow);
      }
      .lb-cta:hover { background: var(--accent-hi); }
    `}</style>
  );
}
