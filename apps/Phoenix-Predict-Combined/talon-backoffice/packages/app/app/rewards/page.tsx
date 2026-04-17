"use client";

/**
 * RewardsPage — Predict-native "coming soon" stub.
 *
 * The old sportsbook Rewards Center was a tier-ladder loyalty system
 * ("bronze/silver/gold", points-per-settled-bet, referrals). That
 * product doesn't exist on Predict yet — the backend has no loyalty
 * tables, and DESIGN.md doesn't define a Predict loyalty mechanic.
 *
 * Stubbing rather than deleting: the /account card still links here,
 * and this page tells users honestly what's coming instead of 404ing.
 */

import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function RewardsPage() {
  return (
    <div className="rw-wrap">
      <Styles />
      <div className="rw-card">
        <div className="rw-icon">
          <Sparkles size={28} strokeWidth={1.8} />
        </div>
        <span className="rw-eyebrow">Coming soon</span>
        <h1 className="rw-title">Predict rewards</h1>
        <p className="rw-body">
          We're designing a rewards system built for prediction markets, not bet
          settlement. Expect it to reward accuracy, streaks, and market creation
          — not turnover.
        </p>
        <p className="rw-body">
          In the meantime, track your performance on the portfolio page.
        </p>
        <Link href="/portfolio" className="rw-cta">
          Open portfolio
        </Link>
      </div>
    </div>
  );
}

function Styles() {
  return (
    <style>{`
      .rw-wrap {
        max-width: 1440px;
        margin: 0 auto;
        padding: 60px 24px;
        display: flex;
        justify-content: center;
      }
      .rw-card {
        width: 100%;
        max-width: 520px;
        background: var(--s1);
        border: 1px solid var(--b1);
        border-radius: var(--r-lg);
        padding: 40px 36px 32px;
        text-align: center;
      }
      .rw-icon {
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
      .rw-eyebrow {
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
      .rw-title {
        margin: 0 0 12px;
        font-size: 26px;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--t1);
      }
      .rw-body {
        margin: 0 auto 12px;
        max-width: 400px;
        font-size: 14px;
        line-height: 1.6;
        color: var(--t2);
      }
      .rw-cta {
        display: inline-block;
        margin-top: 14px;
        padding: 10px 20px;
        background: var(--accent);
        color: #06222b;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
        text-decoration: none;
        box-shadow: var(--accent-glow);
      }
      .rw-cta:hover { background: var(--accent-hi); }
    `}</style>
  );
}
