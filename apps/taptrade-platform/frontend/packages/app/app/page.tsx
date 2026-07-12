"use client";

/**
 * HomePage — public landing (P10 "Signal Ink", 2026-07-12).
 *
 * Rewritten from the dark marketing hero of the earlier brand era. The
 * page now joins the light product system: gallery-white backdrop, ink
 * display type (.type-display), ink CTAs, and honest content —
 *
 *   - no photography or ambient video (the flag-gated hero video layer,
 *     scrim, and drawn dark chart backdrop are gone);
 *   - no hardcoded example-market teasers — the "Live markets" section
 *     fetches real markets from the public discovery API and renders
 *     them as the same MarketCard the product uses. While loading it
 *     shows a quiet skeleton row; on error or an empty feed the section
 *     is simply omitted (no fake fallback, no error banner);
 *   - jurisdiction-neutral copy with the play-points disclosure stated
 *     plainly in the hero.
 *
 * The page renders content sections only: AppShell provides the TopBar
 * (brand lockup, nav, auth) and PredictFooter around this route, so the
 * old page-local header/footer lockups were dropped.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { MarketCard } from "./components/prediction/MarketCard";
import {
  categoryLabel,
  localizedMarket,
} from "./components/prediction/market-content";
import { logger } from "./lib/logger";
import { createPredictionClient } from "@taptrade-ui/api-client/src/prediction-client";
import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";

const api = createPredictionClient();

const LIVE_MARKET_COUNT = 4;

type LiveMarketsState =
  | { kind: "loading" }
  | { kind: "ready"; markets: PredictionMarket[] }
  | { kind: "hidden" };

const SECTION_HEADING_CLASS =
  "type-display m-0 text-[26px] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--t1)] max-[720px]:text-[22px]";

const MARKET_GRID_CLASS =
  "mt-6 grid auto-rows-fr grid-cols-4 items-stretch gap-5 max-[1120px]:grid-cols-2 max-[640px]:grid-cols-1 max-[640px]:gap-4";

/** Quiet placeholder card matching MarketCard's footprint — no motion. */
function MarketCardSkeleton() {
  return (
    <div
      className="flex min-h-[248px] flex-col rounded-[var(--r-rh-md)] border border-[var(--border-1)] bg-[var(--surface-1)] p-5"
      aria-hidden="true"
    >
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 flex-none rounded-full bg-[var(--surface-2)]" />
        <div className="min-w-0 flex-auto">
          <div className="h-4 w-full rounded bg-[var(--surface-2)]" />
          <div className="mt-2 h-4 w-2/3 rounded bg-[var(--surface-2)]" />
        </div>
      </div>
      <div className="mt-8 h-4 w-1/2 rounded bg-[var(--surface-2)]" />
      <div className="mt-auto grid grid-cols-2 gap-2.5">
        <div className="h-10 rounded-md bg-[var(--surface-2)]" />
        <div className="h-10 rounded-md bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}

// How-it-works steps. Markers are the tap dot (--brand-dot), not
// numbered color circles — the dot is the brand's kinetic signature.
const HOW_IT_WORKS_STEPS = [
  {
    key: "pick",
    titleKey: "how.pick.title",
    titleFallback: "Pick a question",
    bodyKey: "how.pick.body",
    bodyFallback:
      "Every market is a real-world question with a live price — elections, sport, tech, culture.",
  },
  {
    key: "prices",
    titleKey: "how.prices.title",
    titleFallback: "Prices are probabilities",
    bodyKey: "how.prices.body",
    bodyFallback:
      "A Yes price of 62¢ means the market prices Yes at 62%. Prices move as people trade.",
  },
  {
    key: "settle",
    titleKey: "how.settle.title",
    titleFallback: "Correct predictions settle at 100 points",
    bodyKey: "how.settle.body",
    bodyFallback:
      "When a market resolves, each correct contract settles at 100 points. Incorrect ones settle at zero.",
  },
] as const;

export default function HomePage() {
  const { t } = useTranslation("page-home");
  const { t: contentT } = useTranslation("market-content");
  const [live, setLive] = useState<LiveMarketsState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const discovery = await api.getDiscovery();
        if (cancelled) return;
        const markets = (discovery.trending ?? []).slice(0, LIVE_MARKET_COUNT);
        setLive(
          markets.length > 0 ? { kind: "ready", markets } : { kind: "hidden" },
        );
      } catch (err: unknown) {
        if (cancelled) return;
        // Honest failure mode: the section is omitted entirely.
        logger.error("HomePage", "discovery load failed", err);
        setLive({ kind: "hidden" });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="text-[var(--t1)]">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        aria-labelledby="home-hero-heading"
        className="pb-14 pt-8 max-[720px]:pb-10 max-[720px]:pt-4"
      >
        {/* No hero wordmark: the shell TopBar already carries the
            lockup — repeating it 60px lower read as a template tell. */}
        <h1
          id="home-hero-heading"
          className="type-display m-0 max-w-[780px] text-balance text-[clamp(38px,5.2vw,64px)] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--t1)] max-[720px]:mt-6"
        >
          {t("hero.title", "Trade what happens next.")}
        </h1>
        <p className="m-0 mt-5 max-w-[640px] text-[18px] leading-[1.55] text-[var(--t2)] max-[720px]:text-[16px]">
          {t(
            "hero.subtitle",
            "Binary markets on real-world outcomes. Every price is the crowd's live estimate of how likely something is — buy the side you think is right, and see how your read compares.",
          )}
        </p>
        <p className="m-0 mt-3 text-[15px] font-medium text-[var(--t3)]">
          {t(
            "hero.disclaimer",
            "Play points only — no deposits, no cash value.",
          )}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/predict"
            className="inline-flex h-12 items-center justify-center rounded-[var(--r-pill)] bg-[var(--action)] px-7 text-[15px] font-semibold !text-(--action-fg) no-underline transition-colors duration-150 hover:bg-[var(--action-hover)]"
          >
            {t("hero.browseMarkets", "Browse markets")}
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex h-12 items-center justify-center rounded-[var(--r-pill)] border border-[var(--border-2)] bg-transparent px-7 text-[15px] font-semibold !text-[var(--t1)] no-underline transition-colors duration-150 hover:bg-[var(--action-soft)]"
          >
            {t("hero.createAccount", "Create account")}
          </Link>
        </div>
      </section>

      {/* ── Live markets (real discovery data, or nothing) ───────── */}
      {live.kind !== "hidden" ? (
        <section
          aria-labelledby="home-live-markets-heading"
          aria-busy={live.kind === "loading"}
          className="border-t border-[var(--border-1)] py-12 max-[720px]:py-9"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2
              id="home-live-markets-heading"
              className={SECTION_HEADING_CLASS}
            >
              {t("live.title", "Live markets")}
            </h2>
            <Link
              href="/predict"
              className="text-[14px] font-semibold text-[var(--t2)] no-underline transition-colors duration-150 hover:text-[var(--t1)]"
            >
              {t("live.viewAll", "View all markets")}
            </Link>
          </div>
          {live.kind === "loading" ? (
            <div className={MARKET_GRID_CLASS}>
              <span className="sr-only">
                {t("live.loading", "Loading live markets")}
              </span>
              {Array.from({ length: LIVE_MARKET_COUNT }, (_, i) => (
                <MarketCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className={MARKET_GRID_CLASS}>
              {live.markets.map((market) => {
                const m = localizedMarket(contentT, market);
                return (
                  <MarketCard
                    key={m.id}
                    marketId={m.id}
                    ticker={m.ticker}
                    title={m.title}
                    yesPricePoints={m.yesPricePoints}
                    noPricePoints={m.noPricePoints}
                    volumePoints={m.volumePoints}
                    closeAt={m.closeAt}
                    status={m.status}
                    categoryLabel={
                      m.categorySlug
                        ? categoryLabel(contentT, m.categorySlug)
                        : m.categoryName || undefined
                    }
                    imagePath={m.imagePath}
                    imageUrl={m.imageUrl}
                    image_url={m.image_url}
                  />
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* ── How it works ─────────────────────────────────────────── */}
      <section
        aria-labelledby="home-how-heading"
        className="border-t border-[var(--border-1)] py-12 max-[720px]:py-9"
      >
        <h2 id="home-how-heading" className={SECTION_HEADING_CLASS}>
          {t("how.title", "How it works")}
        </h2>
        <div className="mt-6 grid grid-cols-3 gap-5 max-[900px]:grid-cols-1 max-[900px]:gap-4">
          {HOW_IT_WORKS_STEPS.map((step) => (
            <div
              key={step.key}
              className="rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-6 shadow-[var(--shadow-card)]"
            >
              <span
                className="block h-2.5 w-2.5 rounded-full bg-[var(--brand-dot)]"
                aria-hidden="true"
              />
              <h3 className="m-0 mt-4 text-[17px] font-semibold leading-snug text-[var(--t1)]">
                {t(step.titleKey, step.titleFallback)}
              </h3>
              <p className="m-0 mt-2 text-[15px] leading-[1.55] text-[var(--t2)]">
                {t(step.bodyKey, step.bodyFallback)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
