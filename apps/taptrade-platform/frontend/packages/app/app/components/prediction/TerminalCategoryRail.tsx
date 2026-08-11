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

// FEED2-002: the composed Nav/CategoryRow idiom (02 System) — a 3×13 edge
// bar + 11px semibold uppercase +1px-tracked label on a 30px row, radius 6.
// Active = lime edge on a lime-wash row with ink text; inactive = hairline
// edge with tertiary text. Below 1280 the 72px rail shows two-letter mono
// monograms (the system's monogram idiom) instead of the retired icons.
const BASE_LINK_CLASS =
  "group flex min-h-[30px] items-center gap-2 rounded-[6px] px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.09em] no-underline transition-colors duration-150 max-[1279px]:justify-center max-[1279px]:px-2";
const ACTIVE_LINK_CLASS = "bg-[var(--accent-soft)] text-[var(--t1)]";
const INACTIVE_LINK_CLASS =
  "text-[var(--t3)] hover:bg-[var(--surface-2)] hover:text-[var(--t1)]";
const EDGE_BAR_BASE_CLASS =
  "h-[13px] w-[3px] flex-none rounded-[1px] max-[1279px]:hidden";
const EDGE_BAR_ACTIVE_CLASS = "bg-[var(--accent)]";
const EDGE_BAR_INACTIVE_CLASS = "bg-[var(--border-2)]";
const RAIL_LABEL_CLASS = "max-[1279px]:sr-only";
const RAIL_MONOGRAM_CLASS =
  "hidden font-mono text-[11px] font-medium max-[1279px]:inline";

export function TerminalCategoryRail({
  categories,
  mode,
  activeCategorySlug,
}: TerminalCategoryRailProps) {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const visibleCategories = categories.slice(0, 7);
  const homeActive = !activeCategorySlug;
  const homeHref = mode === "discover" ? "/discover" : "/predict";
  const monogramOf = (label: string) => label.slice(0, 2).toUpperCase();

  return (
    <aside className="terminal-scrollbar sticky top-16 flex h-[calc(100vh-64px)] min-w-0 flex-col overflow-y-auto border-r border-[var(--border-1)] bg-[var(--surface-1)] px-2.5 pb-5 pt-4 max-[1023px]:hidden">
      <nav className="flex flex-col gap-0.5" aria-label={t("MARKET_TOPICS")}>
        <Link
          href={homeHref}
          aria-current={homeActive ? "page" : undefined}
          className={`${BASE_LINK_CLASS} ${
            homeActive ? ACTIVE_LINK_CLASS : INACTIVE_LINK_CLASS
          }`}
        >
          <span
            className={`${EDGE_BAR_BASE_CLASS} ${
              homeActive ? EDGE_BAR_ACTIVE_CLASS : EDGE_BAR_INACTIVE_CLASS
            }`}
            aria-hidden="true"
          />
          <span className={RAIL_LABEL_CLASS}>{t("FOR_YOU")}</span>
          <span className={RAIL_MONOGRAM_CLASS} aria-hidden="true">
            {monogramOf(t("FOR_YOU"))}
          </span>
        </Link>

        {visibleCategories.map((category) => {
          const slug = category.slug.toLowerCase();
          const active = activeCategorySlug === slug;
          const label = categoryName(contentT, category);
          const href =
            mode === "discover"
              ? `/discover?category=${encodeURIComponent(slug)}`
              : `/category/${category.slug}`;
          return (
            <Link
              key={category.id}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`${BASE_LINK_CLASS} ${
                active ? ACTIVE_LINK_CLASS : INACTIVE_LINK_CLASS
              }`}
            >
              <span
                className={`${EDGE_BAR_BASE_CLASS} ${
                  active ? EDGE_BAR_ACTIVE_CLASS : EDGE_BAR_INACTIVE_CLASS
                }`}
                aria-hidden="true"
              />
              <span className={RAIL_LABEL_CLASS}>{label}</span>
              <span className={RAIL_MONOGRAM_CLASS} aria-hidden="true">
                {monogramOf(label)}
              </span>
            </Link>
          );
        })}

        <Link
          href="/portfolio"
          className={`${BASE_LINK_CLASS} ${INACTIVE_LINK_CLASS}`}
        >
          <span
            className={`${EDGE_BAR_BASE_CLASS} ${EDGE_BAR_INACTIVE_CLASS}`}
            aria-hidden="true"
          />
          <span className={RAIL_LABEL_CLASS}>{t("SAVED")}</span>
          <span className={RAIL_MONOGRAM_CLASS} aria-hidden="true">
            {monogramOf(t("SAVED"))}
          </span>
        </Link>
      </nav>

      <div className="mt-auto border-t border-[var(--border-1)] px-2 pt-5 max-[1279px]:px-0">
        <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--t2)] max-[1279px]:justify-center">
          <span
            className="h-2 w-2 rounded-full bg-[var(--yes)]"
            aria-hidden="true"
          />
          <span className="max-[1279px]:sr-only">{t("MARKET_DATA_LIVE")}</span>
        </div>
        <p className="mt-2 text-[11px] leading-[1.45] text-[var(--t3)] max-[1279px]:hidden">
          {t("MARKET_RISK_SHORT")}
        </p>
      </div>
    </aside>
  );
}
