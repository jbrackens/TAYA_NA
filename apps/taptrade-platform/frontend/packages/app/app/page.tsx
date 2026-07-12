"use client";

/**
 * HomePage — the FRONT PAGE (P11 "Standing Question", 2026-07-12).
 *
 * The public landing composed as the front of the broadsheet: a heavy
 * ink rule, a rubric line, the serif proposition headline, an italic
 * standfirst, and ink-rectangle actions. Below the fold, "Live markets"
 * is a rubric-headed section of MarketCard briefs in rule-separated
 * columns, and "How it works" is three editorial paragraphs with serif
 * lead-ins — no boxes, no cards, no shadows.
 *
 * P10 honesty content contract carries over unchanged:
 *
 *   - no photography or ambient video;
 *   - no hardcoded example-market teasers — the "Live markets" section
 *     fetches real markets from the public discovery API and renders
 *     them as the same MarketCard the product uses. While loading it
 *     shows a quiet skeleton row (no motion); on error or an empty feed
 *     the section is simply omitted (no fake fallback, no error banner);
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

// P11 section furniture: rubric heads over a heavy ink rule, wire-mono
// side notes — the same header grammar as the movers rail.
const SECTION_RULE_HEAD_CLASS =
  "flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t-[3px] border-[var(--rule-ink)] pt-2";
const SECTION_RUBRIC_CLASS =
  "m-0 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--t1)]";
const SECTION_NOTE_CLASS =
  "font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--t4)]";

// Briefs grid: generous gaps; on wide viewports the gutters carry
// hairline column rules (newspaper columns), so lg trades gap for
// padded, rule-separated cells.
const MARKET_GRID_CLASS =
  "mt-6 grid auto-rows-fr grid-cols-4 items-stretch gap-x-8 gap-y-10 max-lg:grid-cols-2 max-sm:grid-cols-1 max-sm:gap-y-6 lg:gap-x-0";
const MARKET_CELL_CLASS =
  "min-w-0 lg:border-l lg:border-[var(--border-1)] lg:px-7 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0";

/** Quiet placeholder matching the MarketCard brief footprint — no motion. */
function MarketCardSkeleton() {
  return (
    <div
      className="flex h-full min-h-[184px] flex-col border-t border-[var(--border-2)] pt-3"
      aria-hidden="true"
    >
      <div className="h-3 w-16 bg-[var(--surface-2)]" />
      <div className="mt-3 h-4 w-full bg-[var(--surface-2)]" />
      <div className="mt-2 h-4 w-2/3 bg-[var(--surface-2)]" />
      <div className="mt-auto h-3.5 w-3/4 bg-[var(--surface-2)]" />
      <div className="mt-2.5 h-3 w-1/2 bg-[var(--surface-2)]" />
    </div>
  );
}

// How-it-works entries — editorial paragraphs with a press-blue square
// marker and a serif lead-in phrase, separated by hairline rules.
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
      {/* ── Hero: the front-page lead ────────────────────────────── */}
      <section
        aria-labelledby="home-hero-heading"
        className="border-t-[3px] border-[var(--rule-ink)] pb-14 pt-3 max-[720px]:pb-10"
      >
        {/* No hero wordmark: the shell TopBar already carries the
            lockup — repeating it 60px lower read as a template tell. */}
        <p className="m-0 mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--t3)]">
          <span className="text-[var(--t1)]">
            {t("hero.rubric", "The forecast desk")}
          </span>
          <span aria-hidden="true" className="text-[var(--border-2)]">
            |
          </span>
          <span>{t("hero.rubricNote", "Markets on real-world outcomes")}</span>
        </p>
        <h1
          id="home-hero-heading"
          className="type-display m-0 max-w-[22ch] text-balance text-[clamp(36px,5vw,60px)] font-medium leading-[1.06] text-[var(--t1)]"
        >
          {t("hero.title", "Trade what happens next.")}
        </h1>
        <p className="type-standfirst m-0 mt-5 max-w-[58ch] text-[19px] leading-[1.5] text-[var(--t2)] max-[720px]:text-[17px]">
          {t(
            "hero.subtitle",
            "Binary markets on real-world outcomes. Every price is the crowd's live estimate of how likely something is — buy the side you think is right, and see how your read compares.",
          )}
        </p>
        <p className="m-0 mt-4 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--t2)]">
          {t(
            "hero.disclaimer",
            "Play points only — no deposits, no cash value.",
          )}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/predict"
            className="inline-flex h-12 items-center justify-center bg-[var(--action)] px-7 text-[15px] font-semibold !text-(--action-fg) no-underline transition-colors duration-150 hover:bg-[var(--action-hover)]"
          >
            {t("hero.browseMarkets", "Browse markets")}
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex h-12 items-center justify-center border border-[var(--border-2)] bg-transparent px-7 text-[15px] font-semibold !text-[var(--t1)] no-underline transition-colors duration-150 hover:bg-[var(--action-soft)]"
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
          className="py-12 max-[720px]:py-9"
        >
          <div className={SECTION_RULE_HEAD_CLASS}>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2
                id="home-live-markets-heading"
                className={SECTION_RUBRIC_CLASS}
              >
                {t("live.title", "Live markets")}
              </h2>
              <span className={SECTION_NOTE_CLASS}>
                {t("live.deskNote", "from the desk · live prices")}
              </span>
            </div>
            <Link
              href="/predict"
              className="text-[12px] font-semibold text-[var(--accent-text)] no-underline hover:underline"
            >
              {t("live.viewAll", "View all markets")} →
            </Link>
          </div>
          {live.kind === "loading" ? (
            <div className={MARKET_GRID_CLASS}>
              <span className="sr-only">
                {t("live.loading", "Loading live markets")}
              </span>
              {Array.from({ length: LIVE_MARKET_COUNT }, (_, i) => (
                <div key={i} className={MARKET_CELL_CLASS}>
                  <MarketCardSkeleton />
                </div>
              ))}
            </div>
          ) : (
            <div className={MARKET_GRID_CLASS}>
              {live.markets.map((market) => {
                const m = localizedMarket(contentT, market);
                return (
                  <div key={m.id} className={MARKET_CELL_CLASS}>
                    <MarketCard
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
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      {/* ── How it works: three editorial paragraphs, no boxes ───── */}
      <section
        aria-labelledby="home-how-heading"
        className="py-12 max-[720px]:py-9"
      >
        <div className={SECTION_RULE_HEAD_CLASS}>
          <h2 id="home-how-heading" className={SECTION_RUBRIC_CLASS}>
            {t("how.title", "How it works")}
          </h2>
          <span className={SECTION_NOTE_CLASS}>
            {t("how.deskNote", "reader's guide")}
          </span>
        </div>
        <div className="mt-4">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <div
              key={step.key}
              className={`flex gap-4 py-5 ${
                i > 0 ? "border-t border-[var(--border-1)]" : ""
              }`}
            >
              <span
                className="mt-[7px] block h-2 w-2 shrink-0 bg-[var(--brand-dot)]"
                aria-hidden="true"
              />
              <p className="m-0 max-w-[72ch] text-[15px] leading-[1.6] text-[var(--t2)]">
                <span className="type-display text-[18px] font-semibold text-[var(--t1)]">
                  {t(step.titleKey, step.titleFallback)}.
                </span>{" "}
                {t(step.bodyKey, step.bodyFallback)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
