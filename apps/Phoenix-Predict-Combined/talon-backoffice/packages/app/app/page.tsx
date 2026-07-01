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
    <article className="grid gap-3 border border-[#07150d]/20 bg-[#07150d] p-5 text-white transition-colors hover:bg-[#101b14]">
      <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
        {category}
      </span>
      <span className="text-[19px] font-semibold leading-[1.25] text-white max-[520px]:text-[18px]">
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
          <p className="m-0 mt-1 text-[12px] font-semibold text-white/52">
            {activeSideLabel} {activePercent}% · {inactiveSideLabel}{" "}
            {inactivePercent}%
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className={`inline-flex h-9 min-w-14 cursor-pointer items-center justify-center rounded-md border px-4 text-[13px] font-bold transition-colors ${
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
            className={`inline-flex h-9 min-w-14 cursor-pointer items-center justify-center rounded-md border px-4 text-[13px] font-bold transition-colors ${
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
        <video
          className="absolute inset-0 -z-20 h-full w-full bg-[#050706] object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden="true"
        >
          <source
            src="/brand/tiangge-homepage-bg-clean-24s.mp4"
            type="video/mp4"
          />
        </video>
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.66)_45%,rgba(0,0,0,0.84)_100%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-64px)] max-w-[1440px] flex-col items-center justify-center px-8 pb-8 pt-8 text-center max-[720px]:min-h-[620px] max-[720px]:px-5">
          <h1 className="m-0 max-w-[min(1320px,calc(100vw-32px))] text-balance text-[clamp(52px,5.45vw,82px)] font-normal leading-[1] tracking-normal text-white [font-family:Georgia,'Times_New_Roman',serif] max-[720px]:max-w-[620px] max-[720px]:text-[clamp(42px,12vw,58px)]">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-[1080px] text-balance text-[22px] font-medium leading-[1.24] text-white/90 max-[1100px]:max-w-[920px] max-[1100px]:text-[21px] max-[720px]:mt-5 max-[720px]:max-w-[560px] max-[720px]:text-[18px] max-[720px]:leading-[1.32]">
            {t("hero.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 max-[720px]:mt-7">
            <Link
              href="/predict"
              className="inline-flex h-[46px] min-w-[154px] items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-8 text-[16px] font-semibold !text-[#061a10] transition-transform hover:-translate-y-px hover:brightness-105"
            >
              {t("nav.browseMarkets")}
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-[46px] min-w-[154px] items-center justify-center rounded-[var(--r-pill)] border border-white/50 bg-transparent px-8 text-[16px] font-semibold !text-white transition-colors hover:bg-white/12"
            >
              {t("hero.howItWorks")}
            </Link>
          </div>
        </div>
      </section>

      <main>
        <section className="bg-[var(--accent)] py-24 text-[#07150d] max-[720px]:py-16">
          <div className="mx-auto max-w-[1180px] px-8 max-[720px]:px-5">
            <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(330px,0.85fr)] items-center gap-16 max-[900px]:grid-cols-1 max-[900px]:gap-10">
              <div className="grid gap-3">
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

              <div>
                <p className="m-0 text-[30px] font-medium leading-none text-[#0b3c25]/55 max-[720px]:text-[24px]">
                  {t("browse.eyebrow")}
                </p>
                <h2 className="m-0 mt-3 max-w-[500px] text-[34px] font-medium leading-[1.1] tracking-normal max-[720px]:text-[29px]">
                  {t("browse.title")}
                </h2>
                <p className="mt-5 max-w-[520px] text-[19px] leading-[1.38] text-[#07150d]/78">
                  {t("browse.body")}
                </p>
                <div className="mt-8">
                  <Link
                    href="/predict"
                    className="inline-flex h-[46px] items-center justify-center rounded-[var(--r-pill)] bg-[#07150d] px-8 text-[16px] font-semibold !text-white transition-transform hover:-translate-y-px hover:bg-[#101b14]"
                  >
                    {t("browse.cta")}
                  </Link>
                </div>
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
              <h2 className="m-0 max-w-[620px] text-[clamp(38px,4.8vw,58px)] font-normal leading-[1.04] tracking-normal [font-family:Georgia,'Times_New_Roman',serif]">
                {t("journey.title")}
              </h2>
              <p className="mt-5 max-w-[620px] text-[20px] font-medium leading-[1.36] text-[var(--t2)]">
                {t("journey.subtitle")}
              </p>
              <div className="mt-10 grid gap-0 border-t border-[var(--border-1)]">
                {JOURNEY_STEPS.map((row) => (
                  <div
                    key={row.titleKey}
                    className="grid grid-cols-[64px_minmax(0,1fr)] gap-5 border-b border-[var(--border-1)] py-6 max-[560px]:grid-cols-1 max-[560px]:gap-3"
                  >
                    <span className="font-['IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] text-[12px] font-semibold text-[var(--accent-lo)]">
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
              <div className="mt-6 border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] px-5 py-4">
                <p className="m-0 text-[16px] leading-[1.45] text-[var(--t2)]">
                  {t("journey.note")}
                </p>
              </div>
            </div>

            <div
              className="mx-auto w-full max-w-[360px]"
              aria-label={t("mockup.ariaLabel")}
            >
              <div className="rounded-[42px] border border-[rgba(26,26,26,0.16)] bg-[#151716] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.18)]">
                <div className="overflow-hidden rounded-[32px] bg-[var(--bg-deep)]">
                  <img
                    src="/brand/player-market-trade-mockup.png"
                    alt={t("mockup.alt")}
                    className="block h-auto w-full"
                    width={390}
                    height={844}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--border-1)] bg-[#050706] px-8 py-20 text-white max-[720px]:px-5 max-[720px]:py-14">
          <div className="mx-auto max-w-[1180px]">
            <div className="grid grid-cols-[0.72fr_1.28fr] gap-14 max-[900px]:grid-cols-1">
              <div>
                <h2 className="m-0 text-[clamp(36px,4.4vw,54px)] font-normal leading-[1.05] tracking-normal [font-family:Georgia,'Times_New_Roman',serif]">
                  {t("trust.title")}
                </h2>
                <p className="mt-5 text-[20px] font-medium leading-[1.36] text-white/72">
                  {t("trust.subtitle")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
                {TRUST_CARDS.map((card) => (
                  <div
                    key={card.titleKey}
                    className="border border-white/16 bg-white/[0.04] p-6"
                  >
                    <h3 className="m-0 text-[18px] font-semibold leading-tight">
                      {t(card.titleKey)}
                    </h3>
                    <p className="m-0 mt-3 text-[15px] leading-[1.45] text-white/68">
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
            <h2 className="m-0 text-[clamp(46px,6vw,82px)] font-normal leading-[0.98] tracking-normal [font-family:Georgia,'Times_New_Roman',serif]">
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
