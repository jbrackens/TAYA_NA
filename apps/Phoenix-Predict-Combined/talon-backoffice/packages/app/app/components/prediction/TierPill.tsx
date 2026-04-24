"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  getLoyaltyStanding,
  resetLoyaltyCaches,
  type LoyaltyStanding,
} from "../../lib/api/loyalty-client";
import { subscribePredictWs } from "../../lib/websocket/predict-ws";
import { useAuth } from "../../hooks/useAuth";
import { logger } from "../../lib/logger";

// TierPill — ambient loyalty surface in TopBar.
//
// Plan §1 + §6 + §7:
// - Hidden when tier === 0 (user hasn't earned any points yet).
// - 36px height with tier-N color swatch on border + pill background.
// - Links to /rewards for the detail view.
// - 400ms --accent-glow bloom the first render after a tier promotion.
//   Respects prefers-reduced-motion: reduce.
// - aria-label: "Tier: <name>, <n> points. <m> points to <next>"
// - Below 480px the label truncates to "<Name> · <k-compact>".

interface TierPillProps {
  // Poll interval is low — 60s is fine; standing tier hardly churns.
  refreshMs?: number;
}

export function TierPill({ refreshMs = 60_000 }: TierPillProps) {
  const { user } = useAuth();
  const [standing, setStanding] = useState<LoyaltyStanding | null>(null);
  const [bloom, setBloom] = useState(false);
  const previousTierRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchStanding() {
      try {
        const result = await getLoyaltyStanding();
        if (cancelled) return;
        // Detect tier-up relative to the last observed state. Ignore the
        // first render (prev === null) — we only bloom on an *increase*.
        const prevTier = previousTierRef.current;
        if (prevTier !== null && result.tier > prevTier) {
          setBloom(true);
          window.setTimeout(() => setBloom(false), 400);
        }
        previousTierRef.current = result.tier;
        setStanding(result);
      } catch (err) {
        // Silent failure per plan §3 — loyalty is ambient, never blocks the UI.
        if (!cancelled) logger.warn("TierPill", "standing fetch failed", err);
      }
    }

    void fetchStanding();
    const interval = window.setInterval(fetchStanding, refreshMs);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [refreshMs]);

  // WebSocket tier-up: plan §8 says post-commit we get a tier_promoted event.
  // Invalidate the standing cache + re-fetch so the pill updates instantly
  // instead of waiting for the next 60s poll. The 60s poll is the fallback
  // when the WS is disconnected (plan's explicit design).
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    const unsubscribe = subscribePredictWs(`loyalty:${userId}`, (eventId) => {
      if (eventId !== "tier_promoted") return;
      resetLoyaltyCaches();
      void (async () => {
        try {
          const result = await getLoyaltyStanding();
          const prevTier = previousTierRef.current;
          if (prevTier !== null && result.tier > prevTier) {
            setBloom(true);
            window.setTimeout(() => setBloom(false), 400);
          }
          previousTierRef.current = result.tier;
          setStanding(result);
        } catch (err) {
          logger.warn("TierPill", "WS-triggered refetch failed", err);
        }
      })();
    });
    return unsubscribe;
  }, [user?.id]);

  if (!standing || standing.tier < 1) return null;

  const points = Math.round(standing.pointsBalance / 100);
  const ariaLabel = standing.nextTierName
    ? `Tier: ${standing.tierName}, ${points} points. ${Math.round(standing.pointsToNextTier / 100)} points to ${standing.nextTierName}.`
    : `Tier: ${standing.tierName}, ${points} points. Top tier.`;

  return (
    <>
      <style>{`
        .tp-link {
          display: inline-flex;
          align-items: center;
          min-width: 44px;
          height: 36px;
          padding: 0 14px;
          border-radius: 999px;
          border: 1px solid color-mix(in srgb, var(--tp-color) 30%, transparent);
          background: color-mix(in srgb, var(--tp-color) 14%, transparent);
          color: var(--t1);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-decoration: none;
          white-space: nowrap;
          transition: background 120ms ease, border-color 120ms ease, box-shadow 400ms ease;
        }
        .tp-link:hover {
          background: color-mix(in srgb, var(--tp-color) 22%, transparent);
          border-color: color-mix(in srgb, var(--tp-color) 48%, transparent);
        }
        .tp-link.is-bloom {
          box-shadow: var(--accent-glow);
        }
        .tp-link:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }
        .tp-sep {
          color: var(--t3);
          margin: 0 6px;
          font-weight: 500;
        }
        .tp-points {
          font-variant-numeric: tabular-nums;
          font-family: "IBM Plex Mono", ui-monospace, monospace;
          font-weight: 600;
        }
        @media (max-width: 480px) {
          .tp-link { padding: 0 10px; min-width: 0; }
          .tp-points-long { display: none; }
        }
        @media (min-width: 481px) {
          .tp-points-short { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .tp-link.is-bloom { box-shadow: none; transition: none; }
        }
      `}</style>
      <Link
        href="/rewards"
        aria-label={ariaLabel}
        className={`tp-link tp-tier-${standing.tier} ${bloom ? "is-bloom" : ""}`}
        style={{ ["--tp-color" as string]: `var(--tier-${standing.tier})` }}
      >
        <span>{standing.tierName}</span>
        <span className="tp-sep" aria-hidden="true">
          ·
        </span>
        <span className="tp-points tp-points-long">
          {formatPoints(points)} pts
        </span>
        <span className="tp-points tp-points-short">
          {formatCompact(points)}
        </span>
      </Link>
    </>
  );
}

function formatPoints(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}
