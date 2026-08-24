"use client";

import Link from "next/link";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { CurrencyBtcIcon as Bitcoin } from "@phosphor-icons/react/dist/csr/CurrencyBtc";
import { ChartLineUpIcon as EconomicsIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { CpuIcon as Cpu } from "@phosphor-icons/react/dist/csr/Cpu";
import { BankIcon as Landmark } from "@phosphor-icons/react/dist/csr/Bank";
import { MusicNotesIcon as Music2 } from "@phosphor-icons/react/dist/csr/MusicNotes";
import { TrophyIcon as Trophy } from "@phosphor-icons/react/dist/csr/Trophy";
import { useTranslation } from "react-i18next";
import type { Category } from "@taptrade-ui/api-client/src/prediction-types";
import { categoryName } from "./market-content";

export const TERMINAL_CATEGORY_ICONS: Record<string, PhosphorIcon> = {
  politics: Landmark,
  sports: Trophy,
  entertainment: Music2,
  culture: Music2,
  crypto: Bitcoin,
  tech: Cpu,
  technology: Cpu,
  economics: EconomicsIcon,
};

interface TerminalCategoryRailProps {
  categories: Category[];
  mode: "predict" | "discover";
  activeCategorySlug?: string;
}

function monogramOf(label: string): string {
  return label.slice(0, 2).toUpperCase();
}

export function TerminalCategoryRail({
  categories,
  mode,
  activeCategorySlug,
}: TerminalCategoryRailProps) {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const isPredict = mode === "predict";
  const visibleCategories = categories.slice(0, 7);
  const homeActive = !activeCategorySlug;
  const homeHref = isPredict ? "/predict" : "/discover";
  const homeLabel = isPredict
    ? t("WORKSPACE_ALL_MOMENTS", "All moments")
    : t("FOR_YOU");
  const railClass = isPredict
    ? "sticky top-16 flex h-[calc(100vh-64px)] min-w-0 flex-col overflow-y-auto bg-[var(--brand-deep)] px-5 pb-8 pt-8 max-[1199px]:px-2.5 max-[1023px]:hidden"
    : "terminal-scrollbar sticky top-16 flex h-[calc(100vh-64px)] min-w-0 flex-col overflow-y-auto border-r border-[color-mix(in_srgb,var(--brand-lavender)_28%,transparent)] bg-[var(--brand-deep)] px-2.5 pb-5 pt-4 max-[1023px]:hidden";
  const linkBase = isPredict
    ? "group flex min-h-[34px] items-center gap-2 rounded-lg px-3 text-[13px] font-medium no-underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-lavender)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-deep)] max-[1199px]:justify-center max-[1199px]:px-2"
    : "group flex min-h-[30px] items-center gap-2 rounded-[6px] px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.09em] no-underline transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-lavender)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--brand-deep)] max-[1279px]:justify-center max-[1279px]:px-2";
  const activeLink = isPredict
    ? "bg-[var(--brand-purple)] text-[var(--on-brand)]"
    : "bg-[var(--accent)] text-[var(--on-brand)]";
  const inactiveLink =
    "text-[var(--brand-lavender)] hover:bg-[color-mix(in_srgb,var(--brand-lavender)_12%,transparent)] hover:text-[var(--on-brand)]";
  const labelClass = isPredict
    ? "max-[1199px]:sr-only"
    : "max-[1279px]:sr-only";
  const monogramClass = isPredict
    ? "hidden font-mono text-[11px] font-medium max-[1199px]:inline"
    : "hidden font-mono text-[11px] font-medium max-[1279px]:inline";

  return (
    <aside className={railClass}>
      {isPredict && (
        <header className="max-[1199px]:hidden">
          <h2 className="type-display m-0 text-[28px] font-semibold leading-[1.03] tracking-[-0.04em] text-[var(--on-brand)]">
            {t("WORKSPACE_MOMENTS_RAIL_LINE_ONE", "Trending")}
            <br />
            {t("WORKSPACE_MOMENTS_RAIL_LINE_TWO", "Moments")}
          </h2>
          <p className="mb-0 mt-4 text-[13px] leading-[1.34] text-[var(--brand-lavender)]">
            {t(
              "WORKSPACE_MOMENTS_RAIL_COPY",
              "See what people are watching— and decide where you stand.",
            )}
          </p>
          <p className="mb-0 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--signal-gold)]">
            {t("WORKSPACE_EXPLORE_TOPICS_LABEL", "Explore topics")}
          </p>
        </header>
      )}

      <nav
        className={`flex flex-col gap-0.5 ${isPredict ? "mt-3 max-[1199px]:mt-0" : ""}`}
        aria-label={
          isPredict
            ? t("WORKSPACE_EXPLORE_TOPICS_LABEL", "Explore topics")
            : t("MARKET_TOPICS")
        }
      >
        <Link
          href={homeHref}
          aria-current={homeActive ? "page" : undefined}
          className={`${linkBase} ${homeActive ? activeLink : inactiveLink}`}
        >
          <span className={labelClass}>{homeLabel}</span>
          <span className={monogramClass} aria-hidden="true">
            {monogramOf(homeLabel)}
          </span>
        </Link>

        {visibleCategories.map((category) => {
          const slug = category.slug.toLowerCase();
          const active = activeCategorySlug === slug;
          const label = categoryName(contentT, category);
          const href =
            mode === "discover"
              ? `/discover?category=${encodeURIComponent(slug)}`
              : `/predict?category=${encodeURIComponent(slug)}`;
          return (
            <Link
              key={category.id}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`${linkBase} ${active ? activeLink : inactiveLink}`}
            >
              <span className={labelClass}>{label}</span>
              <span className={monogramClass} aria-hidden="true">
                {monogramOf(label)}
              </span>
            </Link>
          );
        })}

        <Link href="/portfolio" className={`${linkBase} ${inactiveLink}`}>
          <span className={labelClass}>{t("SAVED")}</span>
          <span className={monogramClass} aria-hidden="true">
            {monogramOf(t("SAVED"))}
          </span>
        </Link>
      </nav>

      {!isPredict && (
        <div className="mt-auto border-t border-[color-mix(in_srgb,var(--brand-lavender)_28%,transparent)] px-2 pt-5 max-[1279px]:px-0">
          <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--brand-lavender)] max-[1279px]:justify-center">
            <span
              className="h-2 w-2 rounded-full bg-[var(--live)]"
              aria-hidden="true"
            />
            <span className="max-[1279px]:sr-only">
              {t("MARKET_DATA_LIVE")}
            </span>
          </div>
          <p className="mt-2 text-[11px] leading-[1.45] text-[var(--brand-lavender)] max-[1279px]:hidden">
            {t("MARKET_RISK_SHORT")}
          </p>
        </div>
      )}
    </aside>
  );
}
