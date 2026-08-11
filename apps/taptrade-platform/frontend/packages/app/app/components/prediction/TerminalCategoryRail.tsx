"use client";

import Link from "next/link";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { CurrencyBtcIcon as Bitcoin } from "@phosphor-icons/react/dist/csr/CurrencyBtc";
import { BookmarkSimpleIcon as Bookmark } from "@phosphor-icons/react/dist/csr/BookmarkSimple";
import { ChartLineUpIcon as EconomicsIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { CpuIcon as Cpu } from "@phosphor-icons/react/dist/csr/Cpu";
import { HouseIcon as House } from "@phosphor-icons/react/dist/csr/House";
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

const BASE_LINK_CLASS =
  "flex min-h-12 items-center gap-3 rounded-md border-l-2 px-3 text-[14px] font-medium no-underline transition-colors duration-150 max-[1279px]:justify-center max-[1279px]:px-2";
const ACTIVE_LINK_CLASS =
  "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]";
const INACTIVE_LINK_CLASS =
  "border-transparent text-[var(--t2)] hover:border-[var(--border-2)] hover:bg-[var(--surface-2)] hover:text-[var(--t1)]";

export function TerminalCategoryRail({
  categories,
  mode,
  activeCategorySlug,
}: TerminalCategoryRailProps) {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const visibleCategories = categories.slice(0, 5);
  const homeActive = !activeCategorySlug;
  const homeHref = mode === "discover" ? "/discover" : "/predict";

  return (
    <aside className="terminal-scrollbar sticky top-16 flex h-[calc(100vh-64px)] min-w-0 flex-col overflow-y-auto border-r border-[var(--border-1)] bg-[var(--surface-1)] px-3 py-5 max-[1023px]:hidden">
      <nav className="flex flex-col gap-1" aria-label={t("MARKET_TOPICS")}>
        <Link
          href={homeHref}
          aria-current={homeActive ? "page" : undefined}
          className={`${BASE_LINK_CLASS} ${
            homeActive ? ACTIVE_LINK_CLASS : INACTIVE_LINK_CLASS
          }`}
        >
          <House
            size={20}
            weight={homeActive ? "fill" : "regular"}
            aria-hidden="true"
          />
          <span className="max-[1279px]:sr-only">{t("FOR_YOU")}</span>
        </Link>

        {visibleCategories.map((category) => {
          const slug = category.slug.toLowerCase();
          const Icon = TERMINAL_CATEGORY_ICONS[slug] ?? Cpu;
          const active = activeCategorySlug === slug;
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
              <Icon
                size={20}
                weight={active ? "fill" : "regular"}
                aria-hidden="true"
              />
              <span className="max-[1279px]:sr-only">
                {categoryName(contentT, category)}
              </span>
            </Link>
          );
        })}

        <Link
          href="/portfolio"
          className={`${BASE_LINK_CLASS} ${INACTIVE_LINK_CLASS}`}
        >
          <Bookmark size={20} weight="regular" aria-hidden="true" />
          <span className="max-[1279px]:sr-only">{t("SAVED")}</span>
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
