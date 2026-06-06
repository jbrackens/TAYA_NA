import { Fragment } from "react";
import Link from "next/link";
import BrandMark from "./components/BrandMark";

const EXAMPLE_MARKETS = [
  {
    category: "Sports",
    question: "Will Ginebra win its next game?",
    consensus: "Market says 62% Yes",
    yesPercent: 62,
    status: "Closes before tipoff",
    source: "Settles by official result",
  },
  {
    category: "Entertainment",
    question: "Will this local entertainment event trend this weekend?",
    consensus: "Yes is currently favored",
    yesPercent: 64,
    status: "Weekend market",
    source: "Uses public trend data",
  },
  {
    category: "Gaming",
    question: "Will this MLBB team win the finals?",
    consensus: "Market says 58% Yes",
    yesPercent: 58,
    status: "Finals market",
    source: "Settles by official match record",
  },
  {
    category: "Crypto",
    question: "Will Bitcoin close above the target price this week?",
    consensus: "Market says 54% Yes",
    yesPercent: 54,
    status: "Weekly close",
    source: "Uses public market data",
  },
];

const JOURNEY_STEPS = [
  {
    step: "01",
    title: "Choose a market",
    body: "Pick a clear Yes-or-No question based on a real-world event, from games and creators to crypto, culture, and entertainment.",
  },
  {
    step: "02",
    title: "Back Yes or No",
    body: "The percentage shows what the market currently thinks. Back the side you believe in and review the details before you confirm.",
  },
  {
    step: "03",
    title: "Settle by the rules",
    body: "When the official result is confirmed, the winning side settles according to the published market rules and settlement source.",
  },
];

const TRUST_CARDS = [
  {
    title: "Local by design",
    body: "Built around Filipino attention: sports, creators, esports, crypto, entertainment, and culture.",
  },
  {
    title: "Clear before you enter",
    body: "See the question, closing time, rules, fees, and potential payout before you confirm.",
  },
  {
    title: "Public settlement sources",
    body: "Markets show the source used to determine the outcome, such as official results, public data, or published event records.",
  },
  {
    title: "Responsible participation",
    body: "Prediction markets involve risk. Only participate with money you can afford to lose.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--t1)] [font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
      <header className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-8 max-[720px]:px-5">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-[10px] no-underline"
          aria-label="Tiangge home"
        >
          <BrandMark size={34} />
          <span className="text-[26px] font-bold leading-none tracking-[-0.03em] [color:var(--brand-ink)] [font-family:'Schibsted_Grotesk','Inter',-apple-system,BlinkMacSystemFont,sans-serif] max-[420px]:text-[23px]">
            Tiangge<span className="[color:var(--brand-period)]">.</span>
          </span>
        </Link>

        <div className="flex items-center gap-6 text-sm font-semibold text-[var(--t1)] max-[640px]:gap-3">
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center text-sm font-semibold text-[var(--t2)] transition-colors hover:text-[var(--t1)] max-[520px]:hidden"
            aria-label="Selected language English"
          >
            EN
          </button>
          <Link
            href="/auth/login"
            className="inline-flex h-10 items-center justify-center text-sm font-semibold text-[var(--t2)] transition-colors hover:text-[var(--t1)] max-[520px]:hidden"
          >
            Log in
          </Link>
          <Link
            href="/predict"
            className="inline-flex h-11 items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-7 text-sm font-semibold !text-[#061a10] transition-transform hover:-translate-y-px hover:brightness-105 max-[420px]:px-5"
          >
            Browse
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center text-[var(--t1)]"
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

      <section className="relative isolate min-h-[calc(100svh-64px)] overflow-hidden bg-[var(--bg-deep)]">
        <video
          className="absolute inset-0 -z-20 h-full w-full bg-[var(--surface-2)] object-cover"
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
          className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.42)_42%,rgba(0,0,0,0.68)_100%)]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-64px)] max-w-[1440px] flex-col items-center justify-center px-8 pb-20 pt-10 text-center max-[720px]:min-h-[620px] max-[720px]:px-5 max-[720px]:pb-16">
          <h1 className="m-0 max-w-[1120px] text-balance text-[clamp(62px,11vw,156px)] font-normal leading-[0.88] tracking-[-0.02em] text-white [font-family:Georgia,'Times_New_Roman',serif]">
            Back your take on what happens next.
          </h1>
          <p className="mx-auto mt-8 max-w-[680px] text-balance text-[22px] leading-[1.32] text-white/90 max-[720px]:text-[18px]">
            Tiangge turns local moments into live prediction markets. Pick Yes
            or No on sports, entertainment, crypto, gaming, and real-world
            events, then see what the crowd thinks in real time.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/predict"
              className="inline-flex h-12 min-w-[154px] items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-7 text-[15px] font-semibold !text-[#061a10] transition-transform hover:-translate-y-px hover:brightness-105"
            >
              Explore today's markets
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-12 min-w-[154px] items-center justify-center rounded-[var(--r-pill)] border border-white/35 bg-white/10 px-7 text-[15px] font-semibold !text-white transition-colors hover:bg-white/18"
            >
              See how it works
            </Link>
          </div>
          <p className="mx-auto mt-5 max-w-[620px] text-balance text-[14px] leading-[1.45] text-white/76">
            No deposit needed to browse. Rules, fees, and potential payouts are
            shown before you enter.
          </p>
        </div>
      </section>

      <main>
        <section className="border-y border-[var(--border-1)] bg-[var(--surface-2)] pb-24 text-[var(--t1)] max-[720px]:pb-16">
          <div className="mx-auto max-w-[1180px] px-8 max-[720px]:px-5">
            <div className="pt-16 grid grid-cols-[0.92fr_1.08fr] gap-16 max-[900px]:pt-12 max-[900px]:grid-cols-1">
              <div>
                <h2 className="m-0 max-w-[560px] text-[clamp(42px,6vw,82px)] font-normal leading-[0.94] tracking-[-0.02em] [font-family:Georgia,'Times_New_Roman',serif]">
                  Markets for what Filipinos are already watching
                </h2>
                <p className="mt-6 max-w-[540px] text-[19px] leading-[1.42] text-[var(--t2)]">
                  From big games to viral moments, Tiangge turns the questions
                  people are already debating into clear Yes-or-No markets.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/predict"
                    className="inline-flex h-12 items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-7 text-[15px] font-semibold !text-[#061a10] transition-transform hover:-translate-y-px hover:brightness-105"
                  >
                    Explore markets
                  </Link>
                  <Link
                    href="/live"
                    className="inline-flex h-12 items-center justify-center rounded-[var(--r-pill)] border border-[var(--border-2)] bg-[var(--surface-1)] px-7 text-[15px] font-semibold !text-[var(--t1)] transition-colors hover:bg-[var(--accent-soft)]"
                  >
                    Live markets
                  </Link>
                </div>
              </div>

              <div className="grid gap-4">
                {EXAMPLE_MARKETS.map((market) => (
                  <Link
                    key={market.question}
                    href="/predict"
                    className="grid gap-4 border border-[var(--border-1)] bg-[var(--surface-1)] p-5 text-[var(--t1)] transition-colors hover:border-[var(--border-2)] hover:bg-white"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-lo)]">
                        {market.category}
                      </span>
                      <span className="font-['IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] text-[12px] font-semibold uppercase text-[var(--t3)]">
                        {market.status}
                      </span>
                    </div>
                    <span className="text-[20px] font-semibold leading-[1.25]">
                      {market.question}
                    </span>
                    <div className="grid grid-cols-[1fr_auto] items-center gap-4 max-[520px]:grid-cols-1">
                      <div>
                        <div className="h-2 overflow-hidden rounded-[var(--r-pill)] bg-[var(--no-soft)]">
                          <div
                            className="h-full rounded-[var(--r-pill)] bg-[var(--yes)]"
                            style={{ width: `${market.yesPercent}%` }}
                          />
                        </div>
                        <p className="m-0 mt-2 text-sm font-semibold text-[var(--t2)]">
                          {market.consensus}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className="inline-flex h-10 min-w-16 items-center justify-center rounded-[var(--r-pill)] bg-[var(--yes-soft)] px-4 text-sm font-bold text-[var(--yes-text)]">
                          Yes
                        </span>
                        <span className="inline-flex h-10 min-w-16 items-center justify-center rounded-[var(--r-pill)] bg-[var(--no-soft)] px-4 text-sm font-bold text-[var(--no-text)]">
                          No
                        </span>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-[var(--t3)]">
                      {market.source}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="bg-[var(--surface-1)] px-8 py-24 text-[var(--t1)] max-[720px]:px-5 max-[720px]:py-16"
        >
          <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,0.95fr)_minmax(320px,0.8fr)] items-center gap-16 max-[900px]:grid-cols-1 max-[900px]:gap-12">
            <div>
              <h2 className="m-0 max-w-[760px] text-[clamp(42px,6vw,84px)] font-normal leading-[0.95] tracking-[-0.02em] [font-family:Georgia,'Times_New_Roman',serif]">
                Simple Yes-or-No markets
              </h2>
              <p className="mt-6 max-w-[620px] text-[19px] leading-[1.42] text-[var(--t2)]">
                Choose a market, pick Yes or No, and follow the outcome. Market
                percentages shift as people make predictions, and every market
                shows its rules before you enter.
              </p>
              <div className="mt-12 grid gap-0 border-t border-[var(--border-1)]">
                {JOURNEY_STEPS.map((row) => (
                  <div
                    key={row.title}
                    className="grid grid-cols-[72px_minmax(0,1fr)] gap-6 border-b border-[var(--border-1)] py-7 max-[560px]:grid-cols-1 max-[560px]:gap-3"
                  >
                    <span className="font-['IBM_Plex_Mono',ui-monospace,SFMono-Regular,Menlo,monospace] text-[12px] font-semibold text-[var(--accent-lo)]">
                      {row.step}
                    </span>
                    <div>
                      <h3 className="m-0 text-[26px] font-semibold leading-none text-[var(--t1)]">
                        {row.title}
                      </h3>
                      <p className="m-0 mt-3 max-w-[560px] text-[18px] leading-[1.45] text-[var(--t2)]">
                        {row.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 border-l-4 border-[var(--accent)] bg-[var(--accent-soft)] px-5 py-4">
                <p className="m-0 text-[16px] leading-[1.45] text-[var(--t2)]">
                  If Yes shows 65%, the market currently favors that outcome. If
                  you back Yes and the market resolves Yes, your position
                  settles according to the rules and payout shown before
                  confirmation.
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

        <section className="border-t border-[var(--border-1)] bg-[var(--surface-2)] px-8 py-20 text-[var(--t1)] max-[720px]:px-5 max-[720px]:py-14">
          <div className="mx-auto max-w-[1180px]">
            <div className="grid grid-cols-[0.78fr_1.22fr] gap-14 max-[900px]:grid-cols-1">
              <div>
                <h2 className="m-0 text-[clamp(36px,5vw,68px)] font-normal leading-[0.96] tracking-[-0.02em] [font-family:Georgia,'Times_New_Roman',serif]">
                  Built for local moments. Designed for clear rules.
                </h2>
                <p className="mt-5 text-[18px] leading-[1.45] text-[var(--t2)]">
                  Browse first. When you are ready, supported payment methods,
                  fees, balances, and transaction history should be visible in
                  your account.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
                {TRUST_CARDS.map((card) => (
                  <div
                    key={card.title}
                    className="border border-[var(--border-1)] bg-[var(--surface-1)] p-5"
                  >
                    <h3 className="m-0 text-[18px] font-semibold leading-tight">
                      {card.title}
                    </h3>
                    <p className="m-0 mt-3 text-[15px] leading-[1.45] text-[var(--t2)]">
                      {card.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-1)] pt-8">
              <p className="m-0 max-w-[760px] text-[15px] leading-[1.45] text-[var(--t2)]">
                Prediction markets involve risk. Review market rules, fees, and
                eligibility requirements before participating. Only use funds
                you can afford to lose.
              </p>
              <Link
                href="/predict"
                className="inline-flex h-12 items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-7 text-[15px] font-semibold !text-[#061a10] transition-transform hover:-translate-y-px hover:brightness-105"
              >
                Browse markets
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-[var(--border-1)] bg-[var(--bg-deep)] px-8 py-12 text-[var(--t2)] max-[720px]:px-5">
          <div className="mx-auto max-w-[1180px]">
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm leading-none max-[760px]:justify-start">
              {[
                { href: "/predict", label: "Browse" },
                { href: "/predict", label: "Predict" },
                { href: "/live", label: "Live markets" },
                { href: "/about", label: "About" },
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
                    className="text-[var(--t2)] hover:text-[var(--t1)]"
                  >
                    {item.label}
                  </Link>
                </Fragment>
              ))}
            </div>
            <div className="mt-12 border-t border-[var(--border-1)] pt-8">
              <p className="m-0 text-[clamp(72px,17vw,232px)] font-black leading-[0.9] tracking-normal text-[var(--accent-lo)] [font-family:'Inter_Tight','Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
                Tiangge
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
