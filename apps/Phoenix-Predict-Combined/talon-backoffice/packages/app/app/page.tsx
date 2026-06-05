import { Fragment } from "react";
import Link from "next/link";
import BrandMark from "./components/BrandMark";

const MARKET_LINKS = [
  ["Politics", "Election, policy, and macro event markets"],
  ["Entertainment", "Awards, releases, and pop-culture moments"],
  ["Sports", "Game outcomes and live moments as they unfold"],
];

const JOURNEY_STEPS = [
  {
    step: "01",
    title: "Browse",
    body: "Browse local moments, trending events, and categories that match what people are already talking about.",
  },
  {
    step: "02",
    title: "Predict",
    body: "Choose Yes or No, see the price before you commit, and track how the market moves in real time.",
  },
  {
    step: "03",
    title: "Earn",
    body: "Settle winning contracts back to your wallet and keep your next local call ready to go.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-deep)] text-[var(--t1)] [font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
      <header className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-8 max-[720px]:px-5">
        <Link
          href="/"
          className="inline-flex min-h-11 flex-col items-end justify-center gap-0 [color:var(--accent-lo)] no-underline"
          aria-label="Tiangge home"
        >
          <BrandMark className="mb-[-2px]" size={17} />
          <span className="text-[28px] font-black leading-[0.8] tracking-normal [color:var(--accent-lo)] [font-family:'Inter_Tight','Inter',-apple-system,BlinkMacSystemFont,sans-serif] max-[420px]:text-[26px]">
            Tiangge
          </span>
          <span className="mt-[1px] text-[10px] font-semibold uppercase leading-none tracking-[0.16em] text-[#5f6f7a] [font-family:'Inter_Tight','Inter',-apple-system,BlinkMacSystemFont,sans-serif]">
            PREDICTIONS
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
            href="/auth/register"
            className="inline-flex h-11 items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-7 text-sm font-semibold !text-[#061a10] transition-transform hover:-translate-y-px hover:brightness-105 max-[420px]:px-5"
          >
            Sign up
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
            Trade what comes next
          </h1>
          <p className="mx-auto mt-8 max-w-[680px] text-balance text-[22px] leading-[1.32] text-white/90 max-[720px]:text-[18px]">
            Prediction contracts built from local moments!
          </p>
          <div className="mt-8">
            <Link
              href="/auth/register"
              className="inline-flex h-12 min-w-[154px] items-center justify-center rounded-[var(--r-pill)] bg-[var(--accent)] px-7 text-[15px] font-semibold !text-[#061a10] transition-transform hover:-translate-y-px hover:brightness-105"
            >
              Hula Na!
            </Link>
          </div>
        </div>
      </section>

      <main>
        <section className="border-y border-[var(--border-1)] bg-[var(--surface-2)] pb-24 text-[var(--t1)] max-[720px]:pb-16">
          <div className="mx-auto max-w-[1180px] px-8 max-[720px]:px-5">
            <div className="pt-16 grid grid-cols-[0.92fr_1.08fr] gap-16 max-[900px]:pt-12 max-[900px]:grid-cols-1">
              <div>
                <h2 className="m-0 max-w-[560px] text-[clamp(42px,6vw,82px)] font-normal leading-[0.94] tracking-[-0.02em] [font-family:Georgia,'Times_New_Roman',serif]">
                  Pick your side on real outcomes
                </h2>
                <p className="mt-6 max-w-[540px] text-[19px] leading-[1.42] text-[var(--t2)]">
                  Start from broad discovery, jump into live markets, or search
                  directly for the outcome you already have a view on.
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

              <div className="grid gap-0 border-t border-[var(--border-1)]">
                {MARKET_LINKS.map(([title, body]) => (
                  <Link
                    key={title}
                    href="/discover"
                    className="grid grid-cols-[130px_minmax(0,1fr)] gap-6 border-b border-[var(--border-1)] py-6 text-[var(--t1)] transition-colors hover:bg-[var(--surface-1)] max-[640px]:grid-cols-1 max-[640px]:gap-2"
                  >
                    <span className="text-sm font-bold uppercase tracking-[0.14em] text-[var(--accent-lo)]">
                      {title}
                    </span>
                    <span className="text-[18px] font-medium leading-[1.35]">
                      {body}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--surface-1)] px-8 py-24 text-[var(--t1)] max-[720px]:px-5 max-[720px]:py-16">
          <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,0.95fr)_minmax(320px,0.8fr)] items-center gap-16 max-[900px]:grid-cols-1 max-[900px]:gap-12">
            <div>
              <h2 className="m-0 max-w-[760px] text-[clamp(42px,6vw,84px)] font-normal leading-[0.95] tracking-[-0.02em] [font-family:Georgia,'Times_New_Roman',serif]">
                Discover, predict, earn
              </h2>
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
            </div>

            <div
              className="mx-auto w-full max-w-[360px]"
              aria-label="Real Hula Na player app mobile mockup"
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

        <footer className="border-t border-[var(--border-1)] bg-[var(--bg-deep)] px-8 py-12 text-[var(--t2)] max-[720px]:px-5">
          <div className="mx-auto max-w-[1180px]">
            <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-sm leading-none max-[760px]:justify-start">
              {[
                { href: "/discover", label: "Browse" },
                { href: "/predict", label: "Predict" },
                { href: "/live", label: "Live markets" },
                { href: "/about", label: "About" },
                { href: "/contact-us", label: "Contact" },
                { href: "/terms", label: "Terms" },
                { href: "/privacy", label: "Privacy" },
              ].map((item, index) => (
                <Fragment key={item.href}>
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
