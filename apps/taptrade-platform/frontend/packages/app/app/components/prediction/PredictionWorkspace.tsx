"use client";

/**
 * Predict discovery workspace.
 *
 * Figma source: TapTrade Design → 06 · Trending Moments →
 * 08 · Predict — Points-led / Desktop (213:870) and Mobile (221:1105).
 *
 * The pageable market grid is deliberately the primary surface. Reward and
 * moment context set the scene, without a featured-price carousel or a
 * persistent trade rail competing with public market discovery.
 */

import Link from "next/link";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type {
  Category,
  DiscoveryResponse,
} from "@taptrade-ui/api-client/src/prediction-types";
import { AllMarketsSection } from "./AllMarketsSection";
import { TerminalCategoryRail } from "./TerminalCategoryRail";

interface PredictionWorkspaceProps {
  discovery: DiscoveryResponse;
  categories: Category[];
  catalogCategories: Category[];
  activeCategorySlug?: string;
  activeCategoryId?: string;
}

function scrollToMarketGrid(): void {
  document
    .getElementById("trending-markets")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function RewardPhone() {
  return (
    <div
      className="relative h-[264px] w-full overflow-hidden"
      aria-hidden="true"
    >
      <span className="absolute bottom-[18px] right-[-10px] h-16 w-[300px] rounded-[50%] bg-[var(--signal-gold)]" />
      <span className="absolute bottom-[14px] right-[18px] h-7 w-[250px] rounded-[50%] bg-[color-mix(in_srgb,var(--signal-gold)_72%,var(--brand-dark))]" />

      <div className="absolute bottom-0 right-8 h-[248px] w-[168px] rounded-[28px] border border-[var(--signal-gold)] bg-[var(--brand-dark)] p-[7px] shadow-[0_18px_32px_rgba(0,0,0,0.28)]">
        <div className="relative flex h-full flex-col overflow-hidden rounded-[22px] bg-[var(--brand-deep)] px-4 pt-14">
          <span className="absolute left-1/2 top-[12px] flex h-[22px] w-[66px] -translate-x-1/2 items-center justify-center gap-1.5 rounded-[12px] bg-[var(--brand-lavender)]">
            <i className="size-2.5 rounded-full bg-[var(--brand-dark)]" />
            <i className="size-2.5 rounded-full bg-[var(--brand-dark)]" />
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--signal-gold)]">
            TapTrade
          </span>
          <span className="mt-3 text-[9px] uppercase tracking-[0.08em] text-[var(--brand-lavender)]">
            This week
          </span>
          <span className="font-mono text-[22px] font-semibold leading-none tracking-[-0.04em] text-[var(--on-brand)] tabular-nums">
            Top 5%
            <small className="ml-1 text-[10px] tracking-normal text-[var(--signal-gold)]">
              VIEW
            </small>
          </span>
          <span className="mt-auto mb-4 rounded-lg bg-[var(--brand-lavender)] px-2 py-2 text-[8px] font-semibold leading-[1.35] text-[var(--brand-dark)]">
            <span className="block text-[7px] uppercase tracking-[0.08em]">
              Prediction streak
            </span>
            <span className="mt-0.5 block">4 strong calls in a row</span>
          </span>
        </div>
      </div>

      <div className="absolute bottom-[18px] left-0 w-[158px] rounded-xl bg-[var(--card)] p-3 shadow-[0_10px_26px_rgba(0,0,0,0.18)]">
        <span className="block text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--brand-dark)]">
          Your points
        </span>
        <span className="mt-1 block text-[17px] font-semibold leading-none text-[var(--ink)]">
          120,000 PTS
        </span>
        <span className="mt-1 block text-[10px] text-[var(--ink-3)]">
          Put your view on the board
        </span>
      </div>
    </div>
  );
}

function RewardHero() {
  const { t } = useTranslation("prediction");
  const scrollToGrid = useCallback(() => scrollToMarketGrid(), []);

  return (
    <section
      className="grid min-h-[360px] grid-cols-[minmax(0,570px)_minmax(0,1fr)] overflow-hidden rounded-[16px] bg-[var(--brand-deep)] px-12 py-12 text-[var(--on-brand)] max-[760px]:min-h-[616px] max-[760px]:grid-cols-1 max-[760px]:px-6 max-[760px]:py-6"
      aria-labelledby="reward-hero-heading"
    >
      <div className="flex max-w-[510px] flex-col max-[760px]:h-[288px]">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.13em] text-[var(--signal-gold)]">
          {t("WORKSPACE_REWARD_KICKER", "Trending moments")}
        </p>
        <h1
          id="reward-hero-heading"
          className="type-display m-0 mt-2 text-[40px] font-semibold leading-[0.99] tracking-[-0.035em] text-[var(--on-brand)]"
        >
          <span className="block">{t("WORKSPACE_REWARD_PICK", "Pick.")}</span>
          <span className="block text-[var(--signal-gold)]">
            {t("WORKSPACE_REWARD_WIN", "Win.")}
          </span>
          <span className="block">
            {t("WORKSPACE_REWARD_REDEEM", "Repeat.")}
          </span>
        </h1>
        <p className="mb-0 mt-3 max-w-[510px] text-[14px] leading-[1.42] text-[var(--on-brand)]">
          {t(
            "WORKSPACE_REWARD_COPY",
            "Take a position on the moments people are watching, then see whether you stand with the crowd.",
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={scrollToGrid}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border-0 bg-[var(--signal-gold)] px-4 text-[14px] font-semibold text-[var(--on-gold)] transition-transform duration-150 hover:-translate-y-px hover:brightness-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal-gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-deep)] active:translate-y-0"
          >
            {t("WORKSPACE_START_PICKING", "Start Picking")}
          </button>
          <Link
            href="/rewards"
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--brand-purple)_26%,var(--brand-deep))] px-[18px] text-[14px] font-semibold text-[var(--on-brand)] no-underline transition-colors hover:bg-[color-mix(in_srgb,var(--brand-purple)_42%,var(--brand-deep))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-lavender)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-deep)]"
          >
            {t("WORKSPACE_EXPLORE_REWARDS", "View Points")}
          </Link>
        </div>
        <p className="mb-0 mt-2.5 text-[12px] text-[var(--brand-lavender)]">
          {t(
            "WORKSPACE_REWARD_TRUST",
            "Free to play  •  Clear market rules  •  Public activity",
          )}
        </p>
      </div>

      <div className="self-end pl-[52px] max-[760px]:mt-4 max-[760px]:pl-0">
        <RewardPhone />
      </div>
    </section>
  );
}

function WorkspaceNotice({
  children,
  href,
}: {
  children: string;
  href: string;
}) {
  const { t } = useTranslation("prediction");
  return (
    <div className="flex min-h-10 items-center justify-between gap-4 rounded-lg border border-[var(--border-1)] bg-[color-mix(in_srgb,var(--card)_64%,var(--raised))] px-3 text-[12px] text-[var(--ink-3)]">
      <span className="min-w-0 truncate">{children}</span>
      <Link
        href={href}
        className="shrink-0 font-semibold text-[var(--brand-purple)] no-underline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper)]"
      >
        {href === "/floor"
          ? t("WORKSPACE_OPEN_FLOOR", "Open Floor")
          : t("WORKSPACE_START_GUIDE", "Start guide")}
      </Link>
    </div>
  );
}

export function PredictionWorkspace({
  discovery,
  categories,
  catalogCategories,
  activeCategorySlug,
  activeCategoryId,
}: PredictionWorkspaceProps) {
  const { t } = useTranslation("prediction");
  const discoveryMarketCount =
    discovery.featured.length +
    discovery.trending.length +
    discovery.closingSoon.length +
    discovery.recent.length;

  return (
    <div className="mx-auto grid w-full max-w-[1920px] grid-cols-[224px_minmax(0,1fr)] items-start bg-[var(--paper)] max-[1199px]:grid-cols-[72px_minmax(0,1fr)] max-[1023px]:grid-cols-1">
      <TerminalCategoryRail
        categories={categories}
        mode="predict"
        activeCategorySlug={activeCategorySlug}
      />

      <main
        className="min-w-0 px-12 py-8 max-[1199px]:px-8 max-[1023px]:px-5 max-[1023px]:py-5"
        data-discovery-market-count={discoveryMarketCount}
      >
        <div className="mx-auto max-w-[1120px]">
          <div className="min-[1024px]:hidden">
            <h1 className="type-display m-0 text-[24px] font-semibold leading-[1.2] tracking-[-0.025em] text-[var(--ink)]">
              {t("WORKSPACE_MOMENTS_TITLE", "Trending moments")}
            </h1>
            <p className="mb-0 mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-purple)]">
              {t("WORKSPACE_EXPLORE_TOPICS", "Explore topics · all moments")}
            </p>
          </div>

          <div className="mt-4 min-[1024px]:mt-0">
            <RewardHero />
          </div>

          <div className="mt-4 grid gap-3 min-[761px]:mt-6 min-[761px]:grid-cols-2">
            <WorkspaceNotice href="/floor">
              {t(
                "WORKSPACE_FLOOR_NOTICE",
                "Try the new Floor — one board, no context switching.",
              )}
            </WorkspaceNotice>
            <WorkspaceNotice href="/about">
              {t(
                "WORKSPACE_GUIDE_NOTICE",
                "New here? See how picks and points work.",
              )}
            </WorkspaceNotice>
          </div>

          <div className="mt-4 min-[761px]:mt-6">
            <AllMarketsSection
              categories={catalogCategories}
              categoryId={activeCategoryId}
              variant="moments"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
