"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import BrandMark from "./components/BrandMark";
import { LanguageSelector } from "./components/i18n/LanguageSelector";
import { brand } from "./lib/brand";
import { HERO_AMBIENT_VIDEO } from "./lib/features";

const EXAMPLE_MARKETS = [
  {
    categoryKey: "markets.politics.category",
    questionKey: "markets.politics.question",
    consensusKey: "markets.politics.consensus",
    yesPercent: 61,
  },
  {
    categoryKey: "markets.basketball.category",
    questionKey: "markets.basketball.question",
    consensusKey: "markets.basketball.consensus",
    yesPercent: 62,
  },
  {
    categoryKey: "markets.pageants.category",
    questionKey: "markets.pageants.question",
    consensusKey: "markets.pageants.consensus",
    yesPercent: 57,
  },
  {
    categoryKey: "markets.esports.category",
    questionKey: "markets.esports.question",
    consensusKey: "markets.esports.consensus",
    yesPercent: 54,
  },
];

const JOURNEY_STEPS = [
  {
    step: "01",
    titleKey: "journey.choose.title",
    bodyKey: "journey.choose.body",
  },
  {
    step: "02",
    titleKey: "journey.pick.title",
    bodyKey: "journey.pick.body",
  },
  {
    step: "03",
    titleKey: "journey.settle.title",
    bodyKey: "journey.settle.body",
  },
];

const TRUST_CARDS = [
  {
    titleKey: "trust.rules.title",
    bodyKey: "trust.rules.body",
  },
  {
    titleKey: "trust.sources.title",
    bodyKey: "trust.sources.body",
  },
  {
    titleKey: "trust.local.title",
    bodyKey: "trust.local.body",
  },
  {
    titleKey: "trust.simple.title",
    bodyKey: "trust.simple.body",
  },
];

const FOOTER_LINKS = [
  { href: "/terms", labelKey: "footer.terms" },
  { href: "/privacy", labelKey: "footer.privacy" },
  { href: "/terms#market-rules", labelKey: "footer.marketRules" },
  { href: "/terms#fees", labelKey: "footer.fees" },
  { href: "/responsible-gaming", labelKey: "footer.responsibleUse" },
  { href: "/contact-us", labelKey: "footer.support" },
  { href: "/terms#eligibility", labelKey: "footer.eligibility" },
];

type RevealProps = {
  children: ReactNode;
  className?: string;
  delayMs?: number;
};

/**
 * One-shot scroll reveal (opacity + 16px rise, ease-out). Server-rendered
 * VISIBLE so first paint never waits for hydration; on mount, only elements
 * still below the viewport are hidden (before paint) and revealed on
 * scroll. Skipped entirely under prefers-reduced-motion or when
 * IntersectionObserver is unavailable.
 */
function Reveal({ children, className = "", delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(true);

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    // Above-the-fold content stays visible (it may already be painted);
    // only below-viewport sections get the scroll reveal.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight - 40) {
      return;
    }
    setShown(false);
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-[opacity,transform] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      } ${className}`}
      style={delayMs ? { transitionDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Optional ambient footage behind the hero scrim (flag-gated by
 * HERO_AMBIENT_VIDEO — see docs/hero-ambient-video.md). Renders nothing on
 * the server, under prefers-reduced-motion, when the viewer asked for data
 * saving, below the lg breakpoint (the file is ~1.6MB — mobile connections
 * get the drawn chart only), or when the flag is unset, so the drawn chart
 * composition is always the base hero. Sits at -z-40: below the grid, the
 * chart, and the scrim; ~26% opacity keeps it atmosphere, not message.
 */
function HeroAmbientVideo() {
  const [canPlay, setCanPlay] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const update = () => setCanPlay(desktop.matches);
    update();
    desktop.addEventListener("change", update);
    return () => desktop.removeEventListener("change", update);
  }, []);

  if (!HERO_AMBIENT_VIDEO || !canPlay) return null;

  return (
    <div className="landing-fade absolute inset-0 -z-40" aria-hidden="true">
      <video
        className="h-full w-full object-cover opacity-[0.26]"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
      >
        <source src={HERO_AMBIENT_VIDEO} type="video/mp4" />
      </video>
    </div>
  );
}

type MarketSide = "yes" | "no";

type MarketPreviewCardProps = {
  category: string;
  question: string;
  consensus: string;
  yesLabel: string;
  noLabel: string;
  yesPercent: number;
};

function marketSignalText(
  consensus: string,
  percent: number,
  sideLabel: string,
): string {
  return consensus.replace(/\d+%\s+\S+\s*$/, `${percent}% ${sideLabel}`);
}

function MarketPreviewCard({
  category,
  question,
  consensus,
  yesLabel,
  noLabel,
  yesPercent,
}: MarketPreviewCardProps) {
  const [activeSide, setActiveSide] = useState<MarketSide>("yes");
  const noPercent = 100 - yesPercent;
  const activePercent = activeSide === "yes" ? yesPercent : noPercent;
  const inactivePercent = activeSide === "yes" ? noPercent : yesPercent;
  const activeSideLabel = activeSide === "yes" ? yesLabel : noLabel;
  const inactiveSideLabel = activeSide === "yes" ? noLabel : yesLabel;
  const activeConsensus = marketSignalText(
    consensus,
    activePercent,
    activeSideLabel,
  );
  const barFillClass = activeSide === "yes" ? "justify-start" : "justify-end";

  // Landing 15b / UAT-001: the ONE interactive element on the page. Tapping
  // a side flips the bar, the consensus line and the split — no navigation,
  // no dead end; it teaches the mechanic in one gesture. Lime marks the
  // selected side on BOTH toggles (selection, not a signal) — direction
  // tokens never fill controls, so the near-black card stays one-channel.
  const sideButtonClass = (pressed: boolean) =>
    `inline-flex h-11 min-w-16 cursor-pointer items-center justify-center rounded-[10px] border px-4 text-[13px] font-bold transition-colors duration-150 ${
      pressed
        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--ticket-cta-text)]"
        : "border-white/20 bg-transparent text-white hover:border-white/40"
    }`;

  return (
    <article className="grid gap-3 rounded-[16px] border border-[rgba(17,17,17,0.25)] bg-[var(--ink)] p-[18px] text-white transition-[transform,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(17,17,17,0.35)]">
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
        {category}
      </span>
      <span className="text-[17px] font-semibold leading-[1.3] tracking-[-0.01em] text-white">
        {question}
      </span>
      <div>
        <div
          className={`flex h-[7px] overflow-hidden rounded-[var(--r-pill)] bg-white/16 ${barFillClass}`}
        >
          <div
            className="h-full rounded-[var(--r-pill)] bg-[var(--accent)] transition-[width] duration-300 ease-out"
            style={{ width: `${activePercent}%` }}
          />
        </div>
        <p className="m-0 mt-2 text-[13px] font-semibold text-white/68">
          {activeConsensus}
        </p>
        <p className="m-0 mt-1 font-mono text-[12px] font-medium text-white/60 [font-variant-numeric:tabular-nums]">
          {activeSideLabel} {activePercent}% · {inactiveSideLabel}{" "}
          {inactivePercent}%
        </p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          className={sideButtonClass(activeSide === "yes")}
          onPointerDown={() => setActiveSide("yes")}
          onClick={() => setActiveSide("yes")}
          aria-pressed={activeSide === "yes"}
        >
          {yesLabel}
        </button>
        <button
          type="button"
          className={sideButtonClass(activeSide === "no")}
          onPointerDown={() => setActiveSide("no")}
          onClick={() => setActiveSide("no")}
          aria-pressed={activeSide === "no"}
        >
          {noLabel}
        </button>
      </div>
    </article>
  );
}

type TradeTicketPreviewProps = {
  ariaLabel: string;
  category: string;
  liveLabel: string;
  question: string;
  yesLabel: string;
  noLabel: string;
  signUpLabel: string;
  amountLabel: string;
  sharesLabel: string;
  avgFillLabel: string;
  ifCorrectLabel: string;
  ptsLabel: string;
  maxLabel: string;
  signUpCta: string;
};

/**
 * Miniature of the live trade ticket, REGENERATED from TradeTicket.tsx's
 * current Ink & lime render (Landing 15c, 2026-07-26) — the previous
 * hand-maintained copy had drifted (mint palette, a "Log in to trade" CTA
 * contradicting the signed-out copy). Contracts mirrored from the real
 * ticket: neutral price magnitudes on BOTH side cells (--t1/--t2, never a
 * direction colour), pale direction fills via --yes-soft/--yes-border,
 * lime reserved for the selected quick-amount and the CTA, and the
 * signed-out CTA inviting sign-up. If the real ticket changes shape,
 * regenerate this from it — do not patch colours in place;
 * landing-ink-lime.test.ts pins the contracts that drifted last time.
 * Purely illustrative: role="img", nothing here is interactive.
 */
function TradeTicketPreview({
  ariaLabel,
  category,
  liveLabel,
  question,
  yesLabel,
  noLabel,
  signUpLabel,
  amountLabel,
  sharesLabel,
  avgFillLabel,
  ifCorrectLabel,
  ptsLabel,
  maxLabel,
  signUpCta,
}: TradeTicketPreviewProps) {
  const mono = "font-mono [font-variant-numeric:tabular-nums]";
  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="rounded-[34px] border border-[rgba(17,17,17,0.16)] bg-[#151716] p-2.5 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <div className="overflow-hidden rounded-[26px] bg-white p-[18px] text-left">
          <div className="flex items-center justify-between gap-2.5">
            <span className="text-[15px] font-semibold lowercase leading-none tracking-[-0.025em] text-[var(--ink)]">
              {brand.name}
              <span className="text-[var(--brand-period)]">.</span>
            </span>
            <span className="inline-flex h-[30px] items-center rounded-[var(--r-pill)] bg-[var(--accent)] px-[13px] text-[12px] font-semibold text-[var(--ticket-cta-text)]">
              {signUpLabel}
            </span>
          </div>

          <div className="mt-[18px]">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--t3)]">
              <span
                className="h-[5px] w-[5px] flex-none rounded-full bg-[var(--yes-bar)] animate-[predict-pulse_1.6s_ease-in-out_infinite]"
                aria-hidden="true"
              />
              {category} · {liveLabel}
            </span>
            <p className="m-0 mt-[7px] text-[15px] font-medium leading-[1.3] tracking-[-0.01em] text-[var(--t1)]">
              {question}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-[12px] border border-[var(--yes-border)] bg-[var(--yes-soft)] p-[11px]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--yes-text)]">
                {yesLabel}
              </span>
              <p
                className={`m-0 mt-[5px] text-[22px] font-medium leading-none text-[var(--t1)] ${mono}`}
              >
                62¢
              </p>
            </div>
            <div className="rounded-[12px] border border-[var(--border-1)] bg-white p-[11px]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--no-text)]">
                {noLabel}
              </span>
              <p
                className={`m-0 mt-[5px] text-[22px] font-medium leading-none text-[var(--t2)] ${mono}`}
              >
                38¢
              </p>
            </div>
          </div>

          <div className="mt-4">
            <span className="text-[11px] font-semibold text-[var(--t3)]">
              {amountLabel}
            </span>
            <div className="mt-1.5 flex items-baseline justify-between gap-2.5 rounded-[12px] border border-[var(--border-1)] bg-white px-3.5 py-[11px]">
              <span
                className={`text-[20px] font-medium leading-none text-[var(--t1)] ${mono}`}
              >
                500{" "}
                <span className="text-[12px] font-normal text-[var(--t3)]">
                  {ptsLabel}
                </span>
              </span>
              <span className={`text-[11px] text-[var(--t3)] ${mono}`}>
                8 {sharesLabel}
              </span>
            </div>
            <div className="mt-2 flex gap-1.5">
              {["100", "500", "1000"].map((amount) => (
                <span
                  key={amount}
                  className={`inline-flex h-8 flex-1 items-center justify-center rounded-[var(--r-pill)] text-[12px] font-medium ${mono} ${
                    amount === "500"
                      ? "bg-[var(--accent)] text-[var(--ticket-cta-text)]"
                      : "border border-[var(--border-1)] bg-white text-[var(--t2)]"
                  }`}
                >
                  {amount}
                </span>
              ))}
              <span className="inline-flex h-8 flex-1 items-center justify-center rounded-[var(--r-pill)] border border-[var(--border-1)] bg-white text-[12px] font-semibold tracking-[0.04em] text-[var(--t2)]">
                {maxLabel}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-1.5 border-t border-[var(--border-1)] pt-3">
            <div className="flex items-center justify-between gap-2.5 text-[12px]">
              <span className="text-[var(--t2)]">{avgFillLabel}</span>
              <span className={`font-medium text-[var(--t1)] ${mono}`}>
                62¢
              </span>
            </div>
            <div className="flex items-center justify-between gap-2.5 text-[12px]">
              <span className="text-[var(--t2)]">{ifCorrectLabel}</span>
              <span className={`font-medium text-[var(--yes-text)] ${mono}`}>
                800 {ptsLabel}
              </span>
            </div>
          </div>

          <span className="mt-4 flex min-h-11 items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] text-[14px] font-semibold text-[var(--ticket-cta-text)]">
            {signUpCta}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation("page-home");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="relative min-h-screen bg-[#050706] text-[var(--t1)] font-sans">
      <header className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between bg-[#050706] px-8 text-white max-[720px]:px-5">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-[10px] no-underline"
          aria-label={`${brand.name} home`}
        >
          <BrandMark
            size={30}
            className="text-[var(--brand-on-dark)] [--brand-period:var(--brand-period-dark)]"
          />
          <span className="text-[25px] font-semibold lowercase leading-none tracking-[-0.025em] text-[var(--brand-on-dark)] max-[420px]:text-[22px]">
            {brand.name}
            <span className="text-[var(--brand-period-dark)]">.</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 text-sm font-semibold text-white max-[640px]:gap-2">
          <div className="max-[520px]:hidden [&_.lang-current]:max-w-[92px] [&_.lang-current]:truncate [&_.lang-current]:text-white/90 [&_.lang-select-wrap]:relative [&_.lang-select-wrap]:inline-flex [&_.lang-select-wrap]:h-10 [&_.lang-select-wrap]:items-center [&_.lang-select-wrap]:gap-1.5 [&_.lang-select-wrap]:rounded-[var(--r-pill)] [&_.lang-select-wrap]:border [&_.lang-select-wrap]:border-white/20 [&_.lang-select-wrap]:bg-white/5 [&_.lang-select-wrap]:px-3 [&_.lang-select-wrap]:py-0 [&_.lang-select-wrap]:text-[13px] [&_.lang-select-wrap]:font-semibold [&_.lang-select-wrap]:text-white/90 [&_.lang-select-wrap]:transition-colors hover:[&_.lang-select-wrap]:border-white/36 hover:[&_.lang-select-wrap]:bg-white/10 [&_.lang-select]:absolute [&_.lang-select]:inset-0 [&_.lang-select]:cursor-pointer [&_.lang-select]:opacity-0">
            <LanguageSelector source="header" />
          </div>
          <Link
            href="/auth/login"
            className="inline-flex h-11 items-center justify-center rounded-[var(--r-pill)] border border-[var(--accent)] px-7 text-[15px] font-medium !text-[var(--accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--lime)_12%,transparent)] max-[720px]:hidden"
          >
            {t("nav.login")}
          </Link>
          <Link
            href="/predict"
            className="inline-flex h-11 items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-8 text-[15px] font-semibold !text-[var(--ticket-cta-text)] transition-[transform,filter] duration-150 ease-out hover:-translate-y-px hover:brightness-[1.05] max-[520px]:hidden"
          >
            {t("nav.browseMarkets")}
          </Link>
          <button
            type="button"
            className="hidden h-11 w-11 items-center justify-center text-white max-[720px]:inline-flex"
            aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            aria-expanded={menuOpen}
            aria-controls="home-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span
              className="relative flex h-[12px] w-[22px] flex-col justify-between"
              aria-hidden="true"
            >
              <span
                className={`h-[2px] w-full bg-current transition-transform duration-200 ease-out ${
                  menuOpen ? "translate-y-[5px] rotate-45" : ""
                }`}
              />
              <span
                className={`h-[2px] w-full bg-current transition-opacity duration-200 ease-out ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`h-[2px] w-full bg-current transition-transform duration-200 ease-out ${
                  menuOpen ? "-translate-y-[5px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>
      </header>

      {menuOpen ? (
        <nav
          id="home-menu"
          className="absolute inset-x-0 top-16 z-50 hidden border-b border-white/10 bg-[#070b09] px-5 pb-6 pt-3 animate-[landing-fade_0.2s_ease-out] max-[720px]:block"
          aria-label={t("nav.openMenu")}
        >
          <div className="grid gap-2 text-white">
            <Link
              href="/predict"
              className="inline-flex h-12 items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] text-[15px] font-semibold !text-[var(--ticket-cta-text)]"
              onClick={() => setMenuOpen(false)}
            >
              {t("nav.browseMarkets")}
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex h-12 items-center justify-center rounded-[var(--r-pill)] border border-[var(--accent)] text-[15px] font-medium !text-[var(--accent)]"
              onClick={() => setMenuOpen(false)}
            >
              {t("nav.login")}
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-[var(--r-pill)] border border-white/20 text-[15px] font-medium !text-white"
              onClick={() => setMenuOpen(false)}
            >
              {t("hero.howItWorks")}
            </Link>
            <div className="mt-2 flex justify-center border-t border-white/10 pt-4 [&_.lang-current]:text-white/90 [&_.lang-select-wrap]:relative [&_.lang-select-wrap]:inline-flex [&_.lang-select-wrap]:h-11 [&_.lang-select-wrap]:items-center [&_.lang-select-wrap]:gap-1.5 [&_.lang-select-wrap]:rounded-[var(--r-pill)] [&_.lang-select-wrap]:border [&_.lang-select-wrap]:border-white/20 [&_.lang-select-wrap]:bg-white/5 [&_.lang-select-wrap]:px-4 [&_.lang-select-wrap]:text-[13px] [&_.lang-select-wrap]:font-semibold [&_.lang-select-wrap]:text-white/90 [&_.lang-select]:absolute [&_.lang-select]:inset-0 [&_.lang-select]:cursor-pointer [&_.lang-select]:opacity-0">
              <LanguageSelector source="header" />
            </div>
          </div>
        </nav>
      ) : null}

      <section className="relative isolate min-h-[calc(100svh-64px)] overflow-hidden bg-[#050706]">
        <HeroAmbientVideo />
        {/* Chart-paper grid — the same 32px trading-grid vocabulary the app
         * uses on cream (DESIGN.md §4), inverted for the dark landing. */}
        <div
          className="absolute inset-0 -z-30 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:34px_34px] landing-fade"
          aria-hidden="true"
        />
        {/* Market backdrop: a YES price path climbing while its NO complement
         * decays — drawn, not filmed, the product's thesis as decoration
         * (Landing 15a). Both curves use the muted direction tones
         * (--yes-bar/--no-bar); saturated direction stays reserved for live
         * signals, and no price chips ride the lines — magnitude belongs to
         * the app, not the backdrop. vector-effect keeps strokes crisp while
         * preserveAspectRatio=none lets the composition breathe. */}
        <div
          className="absolute inset-x-0 bottom-0 -z-20 h-[56%] landing-fade max-[720px]:h-[42%]"
          aria-hidden="true"
        >
          <svg
            className="h-full w-full"
            viewBox="0 0 1440 560"
            preserveAspectRatio="none"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              {/* var() is CSS-only — presentation attributes can't resolve
               * it, so the token lands via style. */}
              <linearGradient id="heroYesFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  style={{ stopColor: "var(--yes-bar)" }}
                  stopOpacity="0.16"
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "var(--yes-bar)" }}
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            <path
              d="M0,388 L60,380 L110,396 L170,368 L230,376 L300,336 L360,348 L430,312 L500,326 L560,284 L640,296 L700,256 L770,272 L840,232 L900,244 L980,196 L1050,214 L1120,168 L1200,184 L1270,140 L1340,152 L1408,116 L1408,560 L0,560 Z"
              fill="url(#heroYesFill)"
            />
            <path
              d="M0,388 L60,380 L110,396 L170,368 L230,376 L300,336 L360,348 L430,312 L500,326 L560,284 L640,296 L700,256 L770,272 L840,232 L900,244 L980,196 L1050,214 L1120,168 L1200,184 L1270,140 L1340,152 L1408,116"
              style={{ stroke: "var(--yes-bar)" }}
              strokeOpacity="0.85"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M0,180 L80,196 L150,176 L220,208 L290,196 L360,232 L430,220 L500,258 L570,246 L640,284 L710,272 L780,308 L850,296 L920,332 L990,320 L1060,352 L1130,344 L1200,376 L1270,368 L1340,396 L1408,420"
              style={{ stroke: "var(--no-bar)" }}
              strokeOpacity="0.3"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
        {/* Scrim: anchors the text column left, lets the chart read right. */}
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,7,6,0.88)_0%,rgba(5,7,6,0.5)_52%,rgba(5,7,6,0.12)_100%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-64px)] w-full max-w-[1180px] flex-col justify-center px-8 pb-24 pt-12 max-[720px]:min-h-[600px] max-[720px]:px-5 max-[720px]:pb-16">
          <p className="landing-rise m-0 flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.18em] text-white/64">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_rgba(198,242,78,0.8)] animate-[predict-pulse_1.6s_ease-in-out_infinite]"
              aria-hidden="true"
            />
            {t("hero.eyebrow")}
          </p>
          <h1 className="landing-rise landing-rise-delay-1 m-0 mt-5 max-w-[840px] text-balance text-[clamp(46px,6vw,84px)] font-semibold leading-[1.02] tracking-[-0.03em] text-white font-sans max-[720px]:text-[clamp(40px,10.5vw,56px)]">
            {t("hero.title")}
          </h1>
          <p className="landing-rise landing-rise-delay-2 m-0 mt-6 max-w-[600px] text-[19px] leading-[1.55] text-white/78 max-[720px]:mt-5 max-[720px]:text-[17px]">
            {t("hero.subtitle")}
          </p>
          <div className="landing-rise landing-rise-delay-3 mt-9 flex flex-wrap gap-3 max-[720px]:mt-8">
            <Link
              href="/predict"
              className="inline-flex h-12 min-w-[154px] items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-8 text-[15px] font-semibold !text-[var(--ticket-cta-text)] transition-[transform,filter] duration-150 ease-out hover:-translate-y-px hover:brightness-[1.05]"
            >
              {t("nav.browseMarkets")}
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-12 min-w-[154px] items-center justify-center rounded-[var(--r-pill)] border border-white/25 bg-white/5 px-8 text-[15px] font-semibold !text-white transition-[background-color,border-color] duration-150 ease-out hover:border-white/40 hover:bg-white/10"
            >
              {t("hero.howItWorks")}
            </Link>
          </div>
        </div>
      </section>

      <main>
        {/* Landing 15b: full-bleed lime with near-black cards on it — lime as
         * a SURFACE, the inverse of every other screen. All text sitting
         * directly on the accent is ink-on-lime (white on lime is ~1.3:1). */}
        <section className="bg-[var(--accent)] py-24 text-[var(--ticket-cta-text)] max-[720px]:py-16">
          <div className="mx-auto max-w-[1180px] px-8 max-[720px]:px-5">
            <div className="grid grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] items-start gap-16 max-[900px]:grid-cols-1 max-[900px]:gap-10">
              <Reveal className="pt-2">
                <p className="m-0 text-[12px] font-bold uppercase tracking-[0.18em] text-[var(--ticket-cta-text)]/80">
                  {t("browse.eyebrow")}
                </p>
                <h2 className="m-0 mt-4 max-w-[500px] text-balance text-[clamp(34px,3.8vw,48px)] font-semibold leading-[1.06] tracking-[-0.02em] font-sans max-[720px]:text-[30px]">
                  {t("browse.title")}
                </h2>
                <p className="mt-5 max-w-[480px] text-[17px] leading-[1.55] text-[var(--ticket-cta-text)]/78">
                  {t("browse.body")}
                </p>
                <div className="mt-8">
                  <Link
                    href="/predict"
                    className="inline-flex h-12 items-center justify-center rounded-[var(--r-pill)] bg-[var(--ink)] px-8 text-[15px] font-semibold !text-white transition-transform duration-150 ease-out hover:-translate-y-px"
                  >
                    {t("browse.cta")}
                  </Link>
                </div>
              </Reveal>

              <div className="grid gap-4 max-[720px]:gap-3">
                {EXAMPLE_MARKETS.map((market, index) => (
                  <Reveal key={market.questionKey} delayMs={index * 70}>
                    <MarketPreviewCard
                      category={t(market.categoryKey)}
                      question={t(market.questionKey)}
                      consensus={t(market.consensusKey)}
                      yesLabel={t("marketActions.yes")}
                      noLabel={t("marketActions.no")}
                      yesPercent={market.yesPercent}
                    />
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="bg-[var(--surface-1)] px-8 py-24 text-[var(--t1)] max-[720px]:px-5 max-[720px]:py-16"
        >
          <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,0.95fr)_minmax(300px,0.72fr)] items-center gap-12 max-[900px]:grid-cols-1 max-[900px]:gap-10">
            <Reveal>
              <h2 className="m-0 max-w-[620px] text-balance text-[clamp(34px,3.8vw,48px)] font-semibold leading-[1.06] tracking-[-0.02em] font-sans">
                {t("journey.title")}
              </h2>
              <p className="mt-5 max-w-[560px] text-[18px] leading-[1.55] text-[var(--t2)]">
                {t("journey.subtitle")}
              </p>
              <div className="mt-10 grid gap-0 border-t border-[var(--border-1)]">
                {JOURNEY_STEPS.map((row) => (
                  <div
                    key={row.titleKey}
                    className="grid grid-cols-[64px_minmax(0,1fr)] gap-5 border-b border-[var(--border-1)] py-6 max-[560px]:grid-cols-1 max-[560px]:gap-3"
                  >
                    <span className="pt-[7px] font-mono text-[12px] font-semibold text-[var(--yes-text)]">
                      {row.step}
                    </span>
                    <div>
                      <h3 className="m-0 text-[26px] font-semibold leading-[1.05] text-[var(--t1)]">
                        {t(row.titleKey)}
                      </h3>
                      <p className="m-0 mt-2 max-w-[560px] text-[17px] leading-[1.42] text-[var(--t2)]">
                        {t(row.bodyKey)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-[12px] border border-[var(--border-1)] bg-[color-mix(in_srgb,var(--lime)_32%,transparent)] px-5 py-4">
                <p className="m-0 text-[15px] leading-[1.55] text-[var(--ticket-cta-text)]">
                  {t("journey.note")}
                </p>
              </div>
            </Reveal>

            <Reveal className="mx-auto w-full max-w-[360px]" delayMs={120}>
              <TradeTicketPreview
                ariaLabel={t("mockup.ariaLabel")}
                category={t("markets.basketball.category")}
                liveLabel={t("mockup.live")}
                question={t("markets.basketball.question")}
                yesLabel={t("marketActions.yes")}
                noLabel={t("marketActions.no")}
                signUpLabel={t("mockup.signUp")}
                amountLabel={t("mockup.amountLabel")}
                sharesLabel={t("mockup.shares")}
                avgFillLabel={t("mockup.avgFill")}
                ifCorrectLabel={t("mockup.ifCorrect")}
                ptsLabel={t("mockup.pts")}
                maxLabel={t("mockup.max")}
                signUpCta={t("mockup.signUpCta")}
              />
            </Reveal>
          </div>
        </section>

        <section className="border-t border-[var(--border-1)] bg-[#050706] px-8 py-20 text-white max-[720px]:px-5 max-[720px]:py-14">
          <div className="mx-auto max-w-[1180px]">
            <div className="grid grid-cols-[0.72fr_1.28fr] gap-14 max-[900px]:grid-cols-1">
              <div>
                <h2 className="m-0 text-balance text-[clamp(34px,3.8vw,48px)] font-semibold leading-[1.06] tracking-[-0.02em] font-sans">
                  {t("trust.title")}
                </h2>
                <p className="mt-5 max-w-[360px] text-[18px] leading-[1.55] text-white/72">
                  {t("trust.subtitle")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-10 max-[640px]:grid-cols-1 max-[640px]:gap-y-8">
                {TRUST_CARDS.map((card, index) => (
                  <Reveal
                    key={card.titleKey}
                    delayMs={index * 80}
                    className="border-t border-white/16 pt-5"
                  >
                    <h3 className="m-0 text-[17px] font-semibold leading-tight tracking-[-0.01em]">
                      {t(card.titleKey)}
                    </h3>
                    <p className="m-0 mt-2.5 max-w-[340px] text-[15px] leading-[1.55] text-white/64">
                      {t(card.bodyKey)}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--accent)] px-8 py-24 text-center text-[var(--ticket-cta-text)] max-[720px]:px-5 max-[720px]:py-16">
          <Reveal className="mx-auto max-w-[760px]">
            <h2 className="m-0 text-balance text-[clamp(38px,4.6vw,60px)] font-semibold leading-[1.04] tracking-[-0.03em] font-sans">
              {t("cta.title")}
            </h2>
            <div className="mt-8">
              <Link
                href="/predict"
                className="inline-flex h-12 items-center justify-center rounded-[var(--r-pill)] bg-[var(--ink)] px-8 text-[15px] font-semibold !text-white transition-transform duration-150 ease-out hover:-translate-y-px"
              >
                {t("nav.browseMarkets")}
              </Link>
            </div>
          </Reveal>
        </section>

        <footer className="border-t border-white/10 bg-[#050706] px-8 pb-8 pt-6 text-white/64 max-[720px]:px-5">
          <div className="mx-auto max-w-[1180px]">
            <div className="flex flex-wrap items-center justify-end gap-x-3 max-[760px]:justify-start">
              {FOOTER_LINKS.map((item, index) => (
                <Fragment key={`${item.href}-${item.labelKey}`}>
                  {index > 0 ? (
                    <span className="text-[var(--t3)]" aria-hidden="true">
                      ·
                    </span>
                  ) : null}
                  <Link
                    href={item.href}
                    className="inline-flex min-h-11 items-center text-sm text-white/64 transition-colors duration-150 hover:text-white"
                  >
                    {t(item.labelKey)}
                  </Link>
                </Fragment>
              ))}
            </div>
            <div className="mt-6 border-t border-white/10 pt-8">
              {/* Landing 15c: the giant footer wordmark clamps 168px → 54px —
               * the one place the wordmark is a graphic rather than a label. */}
              <p className="m-0 text-[clamp(54px,13vw,168px)] font-semibold lowercase leading-[0.95] tracking-[-0.025em] text-[var(--brand-on-dark)]">
                {brand.name}
                <span className="text-[var(--brand-period-dark)]">.</span>
              </p>
              <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5 text-[13px] text-white/40">
                <span>{t("footer.tagline")}</span>
                <span>
                  © {new Date().getFullYear()} {brand.legalEntity}
                </span>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
