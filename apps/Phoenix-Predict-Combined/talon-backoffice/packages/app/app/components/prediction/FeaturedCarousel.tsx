"use client";

/**
 * FeaturedCarousel — premium hero carousel for the discovery page.
 *
 * Rotates a curated set of featured markets (top market from
 * All / Esports / Sports / Politics), each rendered as the full DiscoveryHero
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

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";
import { DiscoveryHero } from "./DiscoveryHero";

export interface FeaturedSlide {
  /** Stable identity for the slide (category slug, or "all"). */
  key: string;
  /** Chip label in the control bar ("All" | "Esports" | "Sports" | …). */
  label: string;
  market: PredictionMarket;
  /** Category name for the hero eyebrow (omitted for the "All" slide). */
  categoryName?: string;
}

const AUTO_ADVANCE_MS = 7000;

const CAROUSEL_MESSAGE_CLASS =
  "flex min-h-[200px] items-center justify-center rounded-[var(--r-rh-lg)] border border-[var(--border-1)] bg-[var(--surface-1)] p-9 text-center text-[13px] text-[var(--t3)]";
const CAROUSEL_CLASS =
  "font-['Inter',_-apple-system,_BlinkMacSystemFont,_sans-serif]";
const CAROUSEL_VIEWPORT_CLASS =
  "relative [&_.rh-hero-eyebrow]:pr-[104px] max-[720px]:[&_.rh-hero-eyebrow]:pr-[92px]";
const CAROUSEL_NAV_CLASS =
  "absolute top-[22px] right-6 z-[2] inline-flex items-center gap-1.5 max-[720px]:top-[18px] max-[720px]:right-[18px]";
const CAROUSEL_ARROW_CLASS =
  "inline-flex h-[30px] w-[30px] flex-[0_0_auto] cursor-pointer items-center justify-center rounded-full border border-[var(--border-1)] bg-[var(--surface-2)] text-[var(--t2)] transition-colors duration-[120ms] hover:border-[var(--border-2)] hover:bg-[var(--surface-1)] hover:text-[var(--t1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] max-[720px]:h-7 max-[720px]:w-7 [&_svg]:h-4 [&_svg]:w-4";
const CAROUSEL_COUNT_CLASS =
  "min-w-[46px] text-center text-xs font-medium text-[var(--t3)] [font-variant-numeric:tabular-nums]";

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
    <section aria-label="Featured market" className={CAROUSEL_MESSAGE_CLASS}>
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
  const stageRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (reducedMotion || count === 0) return;
    const el = stageRef.current;
    if (!el) return;
    const start = dir === "next" ? "translateX(16px)" : "translateX(-16px)";
    const animation = el.animate(
      [
        { opacity: 0, transform: start },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 300, easing: "ease", fill: "both" },
    );
    return () => animation.cancel();
  }, [active, count, dir, reducedMotion]);

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
    <section
      className={CAROUSEL_CLASS}
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
      <div className={CAROUSEL_VIEWPORT_CLASS}>
        {/* Only the active slide is mounted (one chart + one price-history
         * fetch at a time); the key restarts the enter animation per change. */}
        <div
          ref={stageRef}
          className="min-w-0"
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
         * agnostic; the eyebrow reserves right-padding so it never runs under
         * the control. */}
        {count > 1 && (
          <div className={CAROUSEL_NAV_CLASS}>
            <button
              type="button"
              className={CAROUSEL_ARROW_CLASS}
              aria-label={t("PREVIOUS_FEATURED_MARKET")}
              onClick={prev}
            >
              <Chevron left />
            </button>
            <span className={CAROUSEL_COUNT_CLASS}>
              {t("CAROUSEL_COUNT", { index: active + 1, count })}
            </span>
            <button
              type="button"
              className={CAROUSEL_ARROW_CLASS}
              aria-label={t("NEXT_FEATURED_MARKET")}
              onClick={next}
            >
              <Chevron />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
