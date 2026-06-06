import { Fragment } from "react";
import Link from "next/link";
import BrandMark from "./components/BrandMark";

const EXAMPLE_MARKETS = [
  {
    category: "Politics",
    question: "Will this Senate candidate enter the top 12?",
    consensus: "Market says 61% Yes",
    yesPercent: 61,
  },
  {
    category: "Basketball",
    question: "Will Ginebra win its next game?",
    consensus: "Market says 62% Yes",
    yesPercent: 62,
  },
  {
    category: "Pageants",
    question: "Will the Philippines place in the Miss Universe top 5?",
    consensus: "Market says 57% Yes",
    yesPercent: 57,
  },
  {
    category: "Crypto",
    question: "Will Bitcoin close above the target price this week?",
    consensus: "Market says 54% Yes",
    yesPercent: 54,
  },
];

const JOURNEY_STEPS = [
  {
    step: "01",
    title: "Choose a market",
    body: "Find a question tied to politics, basketball, pageants, crypto, MLBB, or Filipino culture.",
  },
  {
    step: "02",
    title: "Pick Yes or No",
    body: "Trade the side you think is more likely.",
  },
  {
    step: "03",
    title: "Settle by the rules",
    body: "Results follow the market's published rules and settlement source.",
  },
];

const TRUST_CARDS = [
  {
    title: "Rules upfront",
    body: "See the question, closing time, fees, and payout logic before joining.",
  },
  {
    title: "Listed sources",
    body: "Outcomes are settled using the sources shown on each market.",
  },
  {
    title: "Made for local moments",
    body: "Markets focus on the politics, basketball, pageants, crypto, games, and trends Filipinos follow.",
  },
  {
    title: "Simple by design",
    body: "Pick Yes or No. Follow the market. See the result.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#050706] text-[var(--t1)] [font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
      <header className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between bg-[#050706] px-8 text-white max-[720px]:px-5">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-[10px] no-underline"
          aria-label="Tiangge home"
        >
          <BrandMark size={34} />
          <span className="text-[25px] font-bold leading-none tracking-[-0.02em] text-[var(--brand-on-dark)] [font-family:'Schibsted_Grotesk','Inter',-apple-system,BlinkMacSystemFont,sans-serif] max-[420px]:text-[22px]">
            Tiangge<span className="text-[var(--brand-period-dark)]">.</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 text-sm font-semibold text-white max-[640px]:gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center px-2 text-[15px] font-medium text-white/85 transition-colors hover:text-white max-[520px]:hidden"
            aria-label="Selected language English"
          >
            EN
          </button>
          <Link
            href="/auth/login"
            className="inline-flex h-11 items-center justify-center rounded-[var(--r-pill)] border border-[var(--accent)] px-7 text-[15px] font-medium !text-[var(--accent)] transition-colors hover:bg-[rgba(43,228,128,0.12)] max-[720px]:hidden"
          >
            Log in
          </Link>
          <Link
            href="/predict"
            className="inline-flex h-11 items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-8 text-[15px] font-semibold !text-[#061a10] transition-transform hover:-translate-y-px hover:brightness-105 max-[420px]:px-5"
          >
            Browse markets
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center text-white"
            aria-label="Open menu"
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
          <source src="/brand/landing-tarot-board.mp4" type="video/mp4" />
        </video>
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.58)_0%,rgba(0,0,0,0.44)_45%,rgba(0,0,0,0.78)_100%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-64px)] max-w-[1440px] flex-col items-center justify-end px-8 pb-[76px] pt-10 text-center max-[720px]:min-h-[620px] max-[720px]:px-5 max-[720px]:pb-16">
          <h1 className="m-0 max-w-[1180px] text-balance text-[clamp(48px,6.4vw,86px)] font-normal leading-[1] tracking-normal text-white [font-family:Georgia,'Times_New_Roman',serif] max-[720px]:text-[clamp(46px,13vw,64px)]">
            Where local moments become markets.
          </h1>
          <p className="mx-auto mt-6 max-w-[980px] text-balance text-[23px] font-medium leading-[1.26] text-white/90 max-[720px]:mt-5 max-[720px]:text-[18px]">
            Trade Yes or No on politics, basketball, pageants, crypto, gaming,
            and the moments Filipinos are watching.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 max-[720px]:mt-7">
            <Link
              href="/predict"
              className="inline-flex h-[46px] min-w-[154px] items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-8 text-[16px] font-semibold !text-[#061a10] transition-transform hover:-translate-y-px hover:brightness-105"
            >
              Browse markets
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-[46px] min-w-[154px] items-center justify-center rounded-[var(--r-pill)] border border-white/50 bg-transparent px-8 text-[16px] font-semibold !text-white transition-colors hover:bg-white/12"
            >
              How it works
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
                  <Link
                    key={market.question}
                    href="/predict"
                    className="grid gap-3 border border-[#07150d]/20 bg-[#07150d] p-5 !text-white transition-colors hover:bg-[#101b14]"
                  >
                    <span className="text-[13px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
                      {market.category}
                    </span>
                    <span className="text-[19px] font-semibold leading-[1.25] text-white max-[520px]:text-[18px]">
                      {market.question}
                    </span>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 text-white max-[520px]:grid-cols-1">
                      <div>
                        <div className="h-[7px] overflow-hidden rounded-[var(--r-pill)] bg-white/16">
                          <div
                            className="h-full rounded-[var(--r-pill)] bg-[var(--accent)]"
                            style={{ width: `${market.yesPercent}%` }}
                          />
                        </div>
                        <p className="m-0 mt-2 text-[13px] font-semibold text-white/68">
                          {market.consensus}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className="inline-flex h-9 min-w-14 items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-4 text-[13px] font-bold text-[#061a10]">
                          Yes
                        </span>
                        <span className="inline-flex h-9 min-w-14 items-center justify-center rounded-[var(--r-pill)] border border-white/20 px-4 text-[13px] font-bold text-white">
                          No
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div>
                <p className="m-0 text-[30px] font-medium leading-none text-[#0b3c25]/55 max-[720px]:text-[24px]">
                  Browse
                </p>
                <h2 className="m-0 mt-3 max-w-[520px] text-[40px] font-medium leading-[1.04] tracking-normal max-[720px]:text-[32px]">
                  Markets Filipinos are watching
                </h2>
                <p className="mt-5 max-w-[520px] text-[19px] leading-[1.38] text-[#07150d]/78">
                  From elections and basketball to pageants, crypto, and MLBB,
                  Tiangge turns live conversations into simple Yes-or-No
                  markets.
                </p>
                <div className="mt-8">
                  <Link
                    href="/predict"
                    className="inline-flex h-[46px] items-center justify-center rounded-[var(--r-pill)] bg-[#07150d] px-8 text-[16px] font-semibold !text-white transition-transform hover:-translate-y-px hover:bg-[#101b14]"
                  >
                    Browse live markets
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
              <h2 className="m-0 max-w-[700px] text-[clamp(44px,6vw,80px)] font-normal leading-[0.98] tracking-normal [font-family:Georgia,'Times_New_Roman',serif]">
                Pick a side. Follow the result.
              </h2>
              <p className="mt-5 max-w-[620px] text-[20px] font-medium leading-[1.36] text-[var(--t2)]">
                Choose a market, pick Yes or No, and track how the crowd is
                pricing the outcome.
              </p>
              <div className="mt-10 grid gap-0 border-t border-[var(--border-1)]">
                {JOURNEY_STEPS.map((row) => (
                  <div
                    key={row.title}
                    className="grid grid-cols-[64px_minmax(0,1fr)] gap-5 border-b border-[var(--border-1)] py-6 max-[560px]:grid-cols-1 max-[560px]:gap-3"
                  >
                    <span className="font-['IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] text-[12px] font-semibold text-[var(--accent-lo)]">
                      {row.step}
                    </span>
                    <div>
                      <h3 className="m-0 text-[26px] font-semibold leading-[1.05] text-[var(--t1)]">
                        {row.title}
                      </h3>
                      <p className="m-0 mt-2 max-w-[560px] text-[17px] leading-[1.42] text-[var(--t2)]">
                        {row.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] px-5 py-4">
                <p className="m-0 text-[16px] leading-[1.45] text-[var(--t2)]">
                  Every market shows its rules, fees, closing time, and
                  settlement source before you participate.
                </p>
              </div>
            </div>

            <div
              className="mx-auto w-full max-w-[360px]"
              aria-label="Tiangge player app mobile mockup"
            >
              <div className="rounded-[42px] border border-[rgba(26,26,26,0.16)] bg-[#151716] p-3 shadow-[0_28px_80px_rgba(0,0,0,0.18)]">
                <div className="overflow-hidden rounded-[32px] bg-[var(--bg-deep)]">
                  <img
                    src="/brand/player-market-trade-mockup.png"
                    alt="Tiangge player app market page with a trade ticket open"
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
                <h2 className="m-0 text-[clamp(42px,5.5vw,78px)] font-normal leading-[0.98] tracking-normal [font-family:Georgia,'Times_New_Roman',serif]">
                  Clear before every trade.
                </h2>
                <p className="mt-5 text-[20px] font-medium leading-[1.36] text-white/72">
                  Markets should be easy to understand before you enter.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
                {TRUST_CARDS.map((card) => (
                  <div
                    key={card.title}
                    className="border border-white/16 bg-white/[0.04] p-6"
                  >
                    <h3 className="m-0 text-[18px] font-semibold leading-tight">
                      {card.title}
                    </h3>
                    <p className="m-0 mt-3 text-[15px] leading-[1.45] text-white/68">
                      {card.body}
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
              See today's markets.
            </h2>
            <div className="mt-8">
              <Link
                href="/predict"
                className="inline-flex h-[46px] items-center justify-center rounded-[var(--r-pill)] bg-[#07150d] px-8 text-[16px] font-semibold !text-white transition-transform hover:-translate-y-px hover:bg-[#101b14]"
              >
                Browse markets
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/10 bg-[#050706] px-8 py-10 text-white/64 max-[720px]:px-5">
          <div className="mx-auto max-w-[1180px]">
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm leading-none max-[760px]:justify-start">
              {[
                { href: "/terms", label: "Terms" },
                { href: "/privacy", label: "Privacy" },
                { href: "/terms#market-rules", label: "Market Rules" },
                { href: "/terms#fees", label: "Fees" },
                { href: "/responsible-gaming", label: "Responsible Use" },
                { href: "/contact-us", label: "Support" },
                { href: "/terms#eligibility", label: "Eligibility" },
              ].map((item, index) => (
                <Fragment key={`${item.href}-${item.label}`}>
                  {index > 0 ? (
                    <span className="text-[var(--t3)]">·</span>
                  ) : null}
                  <Link
                    href={item.href}
                    className="text-white/64 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </Fragment>
              ))}
            </div>
            <div className="mt-8 border-t border-white/10 pt-6">
              <p className="m-0 text-[clamp(64px,15vw,192px)] font-black leading-[0.9] tracking-normal text-[var(--accent)] [font-family:'Inter_Tight','Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
                Tiangge
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
