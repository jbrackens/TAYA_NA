"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import BrandMark from "./components/BrandMark";
import { LanguageSelector } from "./components/i18n/LanguageSelector";
import { brand } from "./lib/brand";

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
  const barColorClass =
    activeSide === "yes" ? "bg-[var(--accent)]" : "bg-[var(--no)]";

  return (
    <article className="grid gap-3 rounded-[16px] border border-[#07150d]/25 bg-[#07150d] p-5 text-white transition-[transform,background-color,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#0b1a11] hover:shadow-[0_14px_32px_rgba(4,24,13,0.35)]">
      <span className="text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--accent)]">
        {category}
      </span>
      <span className="text-[19px] font-semibold leading-[1.3] tracking-[-0.01em] text-white max-[520px]:text-[18px]">
        {question}
      </span>
      <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-white max-[520px]:grid-cols-1">
        <div>
          <div
            className={`flex h-[7px] overflow-hidden rounded-[var(--r-pill)] bg-white/16 ${barFillClass}`}
          >
            <div
              className={`h-full rounded-[var(--r-pill)] transition-[width,background-color] duration-300 ease-out ${barColorClass}`}
              style={{ width: `${activePercent}%` }}
            />
          </div>
          <p className="m-0 mt-2 text-[13px] font-semibold text-white/68">
            {activeConsensus}
          </p>
          <p className="m-0 mt-1 text-[12px] font-semibold text-white/60 [font-variant-numeric:tabular-nums]">
            {activeSideLabel} {activePercent}% · {inactiveSideLabel}{" "}
            {inactivePercent}%
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`inline-flex h-11 min-w-16 cursor-pointer items-center justify-center rounded-[10px] border px-4 text-[13px] font-bold transition-colors duration-150 ${
              activeSide === "yes"
                ? "border-[var(--accent)] bg-[var(--accent)] text-[#061a10]"
                : "border-white/20 bg-transparent text-white hover:border-[var(--accent)] hover:text-[var(--accent)]"
            }`}
            onPointerDown={() => setActiveSide("yes")}
            onClick={() => setActiveSide("yes")}
            aria-pressed={activeSide === "yes"}
          >
            {yesLabel}
          </button>
          <button
            type="button"
            className={`inline-flex h-11 min-w-16 cursor-pointer items-center justify-center rounded-[10px] border px-4 text-[13px] font-bold transition-colors duration-150 ${
              activeSide === "no"
                ? "border-[var(--no)] bg-[var(--no)] text-[#2a0f09]"
                : "border-white/20 bg-transparent text-white hover:border-[var(--no)] hover:text-[var(--no-bar)]"
            }`}
            onPointerDown={() => setActiveSide("no")}
            onClick={() => setActiveSide("no")}
            aria-pressed={activeSide === "no"}
          >
            {noLabel}
          </button>
        </div>
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
  loginCta: string;
};

/**
 * Code-native miniature of the live trade ticket (P8 light tokens), replacing
 * the exported screenshot that carried a stale brand tab and demo-data
 * artifacts. Purely illustrative: role="img", nothing here is interactive.
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
  loginCta,
}: TradeTicketPreviewProps) {
  const mono =
    "font-['IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] [font-variant-numeric:tabular-nums]";
  return (
    <div role="img" aria-label={ariaLabel}>
      <div className="rounded-[42px] border border-[rgba(26,26,26,0.16)] bg-[#151716] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.18)]">
        <div className="overflow-hidden rounded-[32px] bg-[#F7F3ED] bg-[linear-gradient(to_right,rgba(26,26,26,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(26,26,26,0.035)_1px,transparent_1px)] bg-[length:32px_32px] p-5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[17px] font-bold leading-none tracking-[-0.03em] text-[#0b4332] [font-family:'Schibsted_Grotesk','Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
              Tiangge<span className="text-[#10c8a0]">.</span>
            </span>
            <span className="inline-flex h-8 items-center rounded-[var(--r-pill)] bg-[var(--accent)] px-3.5 text-[12px] font-semibold text-[#061a10]">
              {signUpLabel}
            </span>
          </div>

          <div className="mt-5">
            <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B8378]">
              <span
                className="h-1 w-1 rounded-full bg-[var(--accent)] animate-[predict-pulse_1.6s_ease-in-out_infinite]"
                aria-hidden="true"
              />
              {category} · {liveLabel}
            </span>
            <p className="m-0 mt-1.5 text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-[#1A1A1A]">
              {question}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-[12px] border border-[var(--accent)] bg-[rgba(43,228,128,0.14)] p-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#1A6849]">
                {yesLabel}
              </span>
              <p
                className={`m-0 mt-1 text-[24px] font-semibold leading-none text-[#1A1A1A] ${mono}`}
              >
                62¢
              </p>
            </div>
            <div className="rounded-[12px] border border-[#E5DFD2] bg-white p-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#A8472D]">
                {noLabel}
              </span>
              <p
                className={`m-0 mt-1 text-[24px] font-semibold leading-none text-[#4A4A4A] ${mono}`}
              >
                38¢
              </p>
            </div>
          </div>

          <div className="mt-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8B8378]">
              {amountLabel}
            </span>
            <div className="mt-1.5 flex items-baseline justify-between rounded-[12px] border border-[#E5DFD2] bg-white px-4 py-3">
              <span
                className={`text-[22px] font-semibold leading-none text-[#1A1A1A] ${mono}`}
              >
                25.00{" "}
                <span className="text-[12px] font-medium text-[#8B8378]">
                  {ptsLabel}
                </span>
              </span>
              <span className={`text-[11px] text-[#8B8378] ${mono}`}>
                40.3 {sharesLabel}
              </span>
            </div>
            <div className="mt-2.5 flex gap-2">
              {["5", "25", "100", maxLabel].map((amount) => (
                <span
                  key={amount}
                  className={`inline-flex h-8 flex-1 items-center justify-center rounded-[var(--r-pill)] text-[12px] font-semibold ${mono} ${
                    amount === "25"
                      ? "bg-[var(--accent)] text-[#061a10]"
                      : "border border-[#E5DFD2] bg-white text-[#4A4A4A]"
                  }`}
                >
                  {amount}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-1.5 border-t border-[#E5DFD2] pt-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[#4A4A4A]">{avgFillLabel}</span>
              <span className={`font-semibold text-[#1A1A1A] ${mono}`}>
                62¢
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[#4A4A4A]">{ifCorrectLabel}</span>
              <span className={`font-semibold text-[#1A6849] ${mono}`}>
                40.32 {ptsLabel}
              </span>
            </div>
          </div>

          <span className="mt-4 flex h-11 items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] text-[14px] font-semibold text-[#061a10]">
            {loginCta}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { t } = useTranslation("page-home");

  return (
    <div className="min-h-screen bg-[#050706] text-[var(--t1)] [font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
      <header className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between bg-[#050706] px-8 text-white max-[720px]:px-5">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-[10px] no-underline"
          aria-label={`${brand.name} home`}
        >
          <BrandMark size={34} />
          <span className="text-[25px] font-bold leading-none tracking-[-0.02em] text-[var(--brand-on-dark)] [font-family:'Schibsted_Grotesk','Inter',-apple-system,BlinkMacSystemFont,sans-serif] max-[420px]:text-[22px]">
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
            className="inline-flex h-11 items-center justify-center rounded-[var(--r-pill)] border border-[var(--accent)] px-7 text-[15px] font-medium !text-[var(--accent)] transition-colors hover:bg-[rgba(43,228,128,0.12)] max-[720px]:hidden"
          >
            {t("nav.login")}
          </Link>
          <Link
            href="/predict"
            className="inline-flex h-11 items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-8 text-[15px] font-semibold !text-[#061a10] transition-transform hover:-translate-y-px hover:brightness-105 max-[420px]:px-5"
          >
            {t("nav.browseMarkets")}
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center text-white"
            aria-label={t("nav.openMenu")}
          >
            <span
              className="flex w-[22px] flex-col gap-[5px]"
              aria-hidden="true"
            >
              <span className="h-[2px] w-full bg-current" />
              <span className="h-[2px] w-full bg-current" />
              <span className="h-[2px] w-full bg-current" />
            </span>
          </button>
        </div>
      </header>

      <section className="relative isolate min-h-[calc(100svh-64px)] overflow-hidden bg-[#050706]">
        {/* Chart-paper grid — the same 32px trading-grid vocabulary the app
         * uses on cream (DESIGN.md §4), inverted for the dark landing. */}
        <div
          className="absolute inset-0 -z-30 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:34px_34px] landing-fade"
          aria-hidden="true"
        />
        {/* Market backdrop: a YES price path climbing while its NO complement
         * decays — drawn, not filmed. vector-effect keeps strokes crisp while
         * preserveAspectRatio=none lets the composition breathe at any width. */}
        <div
          className="absolute inset-x-0 bottom-0 -z-20 h-[56%] landing-fade max-[720px]:h-[42%]"
          aria-hidden="true"
        >
          <svg
            className="h-full w-full"
            viewBox="0 0 1440 560"
            preserveAspectRatio="none"
            fill="none"
          >
            <defs>
              <linearGradient id="heroYesFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#71eeb8" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#71eeb8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,388 L60,380 L110,396 L170,368 L230,376 L300,336 L360,348 L430,312 L500,326 L560,284 L640,296 L700,256 L770,272 L840,232 L900,244 L980,196 L1050,214 L1120,168 L1200,184 L1270,140 L1340,152 L1408,116 L1408,560 L0,560 Z"
              fill="url(#heroYesFill)"
            />
            <path
              d="M0,388 L60,380 L110,396 L170,368 L230,376 L300,336 L360,348 L430,312 L500,326 L560,284 L640,296 L700,256 L770,272 L840,232 L900,244 L980,196 L1050,214 L1120,168 L1200,184 L1270,140 L1340,152 L1408,116"
              stroke="#71eeb8"
              strokeOpacity="0.85"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M0,180 L80,196 L150,176 L220,208 L290,196 L360,232 L430,220 L500,258 L570,246 L640,284 L710,272 L780,308 L850,296 L920,332 L990,320 L1060,352 L1130,344 L1200,376 L1270,368 L1340,396 L1408,420"
              stroke="#ff8b6b"
              strokeOpacity="0.3"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {/* Terminal ticks: live YES/NO quotes at the line endings. */}
          <div
            className="absolute flex -translate-y-1/2 items-center gap-2 max-[900px]:hidden"
            style={{ left: "97.8%", top: "20.7%" }}
          >
            <span className="h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#71eeb8] shadow-[0_0_12px_rgba(113,238,184,0.65)] animate-[predict-pulse_1.6s_ease-in-out_infinite]" />
          </div>
          <div
            className="absolute flex -translate-y-1/2 items-center justify-end gap-2.5 max-[900px]:hidden"
            style={{ right: "3.6%", top: "20.7%" }}
          >
            <span className="rounded-md border border-white/12 bg-[#0a120d]/85 px-2.5 py-1 font-['IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] text-[12px] font-semibold tracking-[0.02em] text-[#71eeb8] [font-variant-numeric:tabular-nums]">
              YES 62¢
            </span>
          </div>
          <div
            className="absolute flex -translate-y-1/2 items-center justify-end gap-2.5 max-[900px]:hidden"
            style={{ right: "3.6%", top: "75%" }}
          >
            <span className="rounded-md border border-white/10 bg-[#0a120d]/85 px-2.5 py-1 font-['IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] text-[12px] font-semibold tracking-[0.02em] text-[#ff8b6b]/80 [font-variant-numeric:tabular-nums]">
              NO 38¢
            </span>
          </div>
        </div>
        {/* Scrim: anchors the text column left, lets the chart read right. */}
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(5,7,6,0.88)_0%,rgba(5,7,6,0.5)_52%,rgba(5,7,6,0.12)_100%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-64px)] w-full max-w-[1180px] flex-col justify-center px-8 pb-24 pt-12 max-[720px]:min-h-[600px] max-[720px]:px-5 max-[720px]:pb-16">
          <p className="landing-rise m-0 flex items-center gap-2.5 text-[12px] font-bold uppercase tracking-[0.18em] text-white/64">
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_10px_rgba(43,228,128,0.8)] animate-[predict-pulse_1.6s_ease-in-out_infinite]"
              aria-hidden="true"
            />
            {t("hero.eyebrow")}
          </p>
          <h1 className="landing-rise landing-rise-delay-1 m-0 mt-5 max-w-[840px] text-balance text-[clamp(46px,6vw,84px)] font-semibold leading-[1.02] tracking-[-0.03em] text-white [font-family:'Inter_Tight','Inter',-apple-system,BlinkMacSystemFont,sans-serif] max-[720px]:text-[clamp(40px,10.5vw,56px)]">
            {t("hero.title")}
          </h1>
          <p className="landing-rise landing-rise-delay-2 m-0 mt-6 max-w-[600px] text-[19px] leading-[1.55] text-white/78 max-[720px]:mt-5 max-[720px]:text-[17px]">
            {t("hero.subtitle")}
          </p>
          <div className="landing-rise landing-rise-delay-3 mt-9 flex flex-wrap gap-3 max-[720px]:mt-8">
            <Link
              href="/predict"
              className="inline-flex h-12 min-w-[154px] items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-8 text-[15px] font-semibold !text-[#061a10] transition-[transform,background-color] duration-150 ease-out hover:-translate-y-px hover:bg-[#54ec9b]"
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
        <section className="bg-[var(--accent)] py-24 text-[#07150d] max-[720px]:py-16">
          <div className="mx-auto max-w-[1180px] px-8 max-[720px]:px-5">
            <div className="grid grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] items-start gap-16 max-[900px]:grid-cols-1 max-[900px]:gap-10">
              <div className="pt-2">
                <p className="m-0 text-[12px] font-bold uppercase tracking-[0.18em] text-[#0b3c25]/80">
                  {t("browse.eyebrow")}
                </p>
                <h2 className="m-0 mt-4 max-w-[500px] text-balance text-[clamp(34px,3.8vw,48px)] font-semibold leading-[1.06] tracking-[-0.02em] [font-family:'Inter_Tight','Inter',-apple-system,BlinkMacSystemFont,sans-serif] max-[720px]:text-[30px]">
                  {t("browse.title")}
                </h2>
                <p className="mt-5 max-w-[480px] text-[17px] leading-[1.55] text-[#07150d]/78">
                  {t("browse.body")}
                </p>
                <div className="mt-8">
                  <Link
                    href="/predict"
                    className="inline-flex h-12 items-center justify-center rounded-[var(--r-pill)] bg-[#07150d] px-8 text-[15px] font-semibold !text-white transition-[transform,background-color] duration-150 ease-out hover:-translate-y-px hover:bg-[#12241a]"
                  >
                    {t("browse.cta")}
                  </Link>
                </div>
              </div>

              <div className="grid gap-4 max-[720px]:gap-3">
                {EXAMPLE_MARKETS.map((market) => (
                  <MarketPreviewCard
                    key={market.questionKey}
                    category={t(market.categoryKey)}
                    question={t(market.questionKey)}
                    consensus={t(market.consensusKey)}
                    yesLabel={t("marketActions.yes")}
                    noLabel={t("marketActions.no")}
                    yesPercent={market.yesPercent}
                  />
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
            <div>
              <h2 className="m-0 max-w-[620px] text-balance text-[clamp(34px,3.8vw,48px)] font-semibold leading-[1.06] tracking-[-0.02em] [font-family:'Inter_Tight','Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
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
                    <span className="pt-[7px] font-['IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] text-[12px] font-semibold text-[var(--yes-text)]">
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
              <div className="mt-6 rounded-[12px] border border-[var(--border-1)] bg-[var(--accent-soft)] px-5 py-4">
                <p className="m-0 text-[15px] leading-[1.55] text-[var(--t2)]">
                  {t("journey.note")}
                </p>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[360px]">
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
                loginCta={t("mockup.loginCta")}
              />
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--border-1)] bg-[#050706] px-8 py-20 text-white max-[720px]:px-5 max-[720px]:py-14">
          <div className="mx-auto max-w-[1180px]">
            <div className="grid grid-cols-[0.72fr_1.28fr] gap-14 max-[900px]:grid-cols-1">
              <div>
                <h2 className="m-0 text-balance text-[clamp(34px,3.8vw,48px)] font-semibold leading-[1.06] tracking-[-0.02em] [font-family:'Inter_Tight','Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
                  {t("trust.title")}
                </h2>
                <p className="mt-5 max-w-[360px] text-[18px] leading-[1.55] text-white/72">
                  {t("trust.subtitle")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-10 max-[640px]:grid-cols-1 max-[640px]:gap-y-8">
                {TRUST_CARDS.map((card) => (
                  <div
                    key={card.titleKey}
                    className="border-t border-white/16 pt-5"
                  >
                    <h3 className="m-0 text-[17px] font-semibold leading-tight tracking-[-0.01em]">
                      {t(card.titleKey)}
                    </h3>
                    <p className="m-0 mt-2.5 max-w-[340px] text-[15px] leading-[1.55] text-white/64">
                      {t(card.bodyKey)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--accent)] px-8 py-20 text-center text-[#07150d] max-[720px]:px-5 max-[720px]:py-14">
          <div className="mx-auto max-w-[760px]">
            <h2 className="m-0 text-balance text-[clamp(38px,4.6vw,60px)] font-semibold leading-[1.04] tracking-[-0.03em] [font-family:'Inter_Tight','Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
              {t("cta.title")}
            </h2>
            <div className="mt-8">
              <Link
                href="/predict"
                className="inline-flex h-[46px] items-center justify-center rounded-[var(--r-pill)] bg-[#07150d] px-8 text-[16px] font-semibold !text-white transition-transform hover:-translate-y-px hover:bg-[#101b14]"
              >
                {t("nav.browseMarkets")}
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 bg-[#050706] px-8 py-10 text-white/64 max-[720px]:px-5">
          <div className="mx-auto max-w-[1180px]">
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm leading-none max-[760px]:justify-start">
              {FOOTER_LINKS.map((item, index) => (
                <Fragment key={`${item.href}-${item.labelKey}`}>
                  {index > 0 ? (
                    <span className="text-[var(--t3)]">·</span>
                  ) : null}
                  <Link
                    href={item.href}
                    className="text-white/64 hover:text-white"
                  >
                    {t(item.labelKey)}
                  </Link>
                </Fragment>
              ))}
            </div>
            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="m-0 text-[clamp(64px,15vw,192px)] font-black leading-[0.9] tracking-normal text-[var(--accent)] [font-family:'Inter_Tight','Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
                {brand.name}
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
