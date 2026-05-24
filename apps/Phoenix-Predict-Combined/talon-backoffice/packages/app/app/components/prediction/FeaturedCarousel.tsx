"use client";

/**
 * FeaturedCarousel — premium hero carousel for the discovery page.
 *
 * Rotates a curated set of featured markets (top market from
 * All / Sports / Crypto / Politics), each rendered as the full DiscoveryHero
 * so the carousel inherits the hero's design language with zero visual
 * divergence (DESIGN.md §7 "Hero owns the page"). The active slide is the
 * emphasized big hero; the carousel control is overlaid in the card's
 * top-right (Kalshi-style): a neutral "N of M" counter flanked by prev/next
 * arrows. Each slide's eyebrow carries the category, so the control stays
 * category-agnostic.
 *
 * Behavior: gentle auto-advance (paused on hover/focus, disabled under
 * prefers-reduced-motion or with a single slide) and keyboard nav (← / →).
 *
 * Presentation only — the page owns data + loading/error and passes the
 * resolved slides in. Reuses hero metadata + routing via DiscoveryHero; no
 * external carousel dependency.
 */

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";
import { DiscoveryHero } from "./DiscoveryHero";

export interface FeaturedSlide {
  /** Stable identity for the slide (category slug, or "all"). */
  key: string;
  /** Chip label in the control bar ("All" | "Sports" | "Crypto" | …). */
  label: string;
  market: PredictionMarket;
  /** Category name for the hero eyebrow (omitted for the "All" slide). */
  categoryName?: string;
}

const AUTO_ADVANCE_MS = 7000;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function CarouselMessage({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Featured market"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-1)",
        borderRadius: "var(--r-rh-lg)",
        padding: 36,
        minHeight: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "var(--t3)",
        fontSize: 13,
      }}
    >
      {children}
    </section>
  );
}

function Chevron({ left }: { left?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d={left ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FeaturedCarousel({
  slides,
  loading = false,
  error = false,
}: {
  slides: FeaturedSlide[];
  loading?: boolean;
  error?: boolean;
}) {
  const { t } = useTranslation("prediction");
  const [active, setActive] = useState(0);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const count = slides.length;

  // Keep the active index valid if the slide set changes size.
  useEffect(() => {
    setActive((a) => (count === 0 ? 0 : Math.min(a, count - 1)));
  }, [count]);

  // Gentle auto-advance — disabled when paused (hover/focus), when the user
  // prefers reduced motion, or when there is nothing to rotate.
  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    const timer = setInterval(() => {
      setDir("next");
      setActive((a) => (a + 1) % count);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused, reducedMotion, count]);

  function goTo(index: number) {
    if (count === 0) return;
    const target = ((index % count) + count) % count;
    setDir(target >= active ? "next" : "prev");
    setActive(target);
  }
  const next = () => goTo(active + 1);
  const prev = () => goTo(active - 1);

  if (loading) return <DiscoveryHero market={null} />;
  if (count === 0) {
    return (
      <CarouselMessage>
        {error
          ? t("COULD_NOT_LOAD_FEATURED_MARKETS")
          : t("NO_FEATURED_MARKETS")}
      </CarouselMessage>
    );
  }

  const slide = slides[Math.min(active, count - 1)];

  return (
    <>
      <FeaturedCarouselStyles />
      <section
        className="fc"
        role="region"
        aria-roledescription="carousel"
        aria-label={t("FEATURED_MARKETS")}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onKeyDown={(e) => {
          if (count < 2) return;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            next();
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            prev();
          }
        }}
      >
        <div className="fc-viewport">
          {/* Only the active slide is mounted (one chart + one price-history
           * fetch at a time); the key restarts the enter animation per change. */}
          <div
            className={`fc-stage fc-in-${dir}`}
            key={slide.key}
            aria-roledescription="slide"
            aria-label={t("FEATURED_MARKET_SLIDE_LABEL", {
              label: slide.label,
              index: active + 1,
              count,
            })}
          >
            <DiscoveryHero
              market={slide.market}
              categoryName={slide.categoryName}
            />
          </div>

          {/* Kalshi-style control: overlaid in the card's top-right as a
           * neutral "N of M" counter flanked by prev/next arrows. The slide's
           * eyebrow carries the category, so the control stays category-
           * agnostic; the eyebrow reserves right-padding (scoped CSS) so it
           * never runs under the control. */}
          {count > 1 && (
            <div className="fc-nav">
              <button
                type="button"
                className="fc-arrow"
                aria-label={t("PREVIOUS_FEATURED_MARKET")}
                onClick={prev}
              >
                <Chevron left />
              </button>
              <span className="fc-nav-count">
                {t("CAROUSEL_COUNT", { index: active + 1, count })}
              </span>
              <button
                type="button"
                className="fc-arrow"
                aria-label={t("NEXT_FEATURED_MARKET")}
                onClick={next}
              >
                <Chevron />
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function FeaturedCarouselStyles() {
  return (
    <style>{`
      .fc { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
      .fc-stage { min-width: 0; }
      @keyframes fc-slide-next {
        from { opacity: 0; transform: translateX(16px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes fc-slide-prev {
        from { opacity: 0; transform: translateX(-16px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      .fc-in-next { animation: fc-slide-next 300ms ease both; }
      .fc-in-prev { animation: fc-slide-prev 300ms ease both; }

      .fc-viewport { position: relative; }
      /* Reserve room at the eyebrow's right edge so the overlaid control never
       * overlaps the LIVE · CATEGORY · TICKER line (scoped to the carousel). */
      .fc-viewport .rh-hero-eyebrow { padding-right: 104px; }

      .fc-nav {
        position: absolute; top: 22px; right: 24px; z-index: 2;
        display: inline-flex; align-items: center; gap: 6px;
      }
      .fc-nav-count {
        min-width: 46px; text-align: center;
        font-size: 12px; font-weight: 500; color: var(--t3);
        font-variant-numeric: tabular-nums;
      }
      .fc-arrow {
        flex: 0 0 auto;
        width: 30px; height: 30px; border-radius: 50%;
        display: inline-flex; align-items: center; justify-content: center;
        background: var(--surface-2); color: var(--t2);
        border: 1px solid var(--border-1); cursor: pointer;
        transition: color 120ms ease, background 120ms ease, border-color 120ms ease;
      }
      .fc-arrow:hover {
        color: var(--t1); background: var(--surface-1); border-color: var(--border-2);
      }
      .fc-arrow:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
      .fc-arrow svg { width: 16px; height: 16px; }

      @media (max-width: 720px) {
        .fc-viewport .rh-hero-eyebrow { padding-right: 92px; }
        .fc-nav { top: 18px; right: 18px; }
        .fc-arrow { width: 28px; height: 28px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .fc-in-next, .fc-in-prev { animation: none; }
      }
    `}</style>
  );
}
