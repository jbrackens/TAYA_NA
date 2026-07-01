"use client";

/**
 * CategoryPills — horizontal category filter.
 */

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { Category } from "@phoenix-ui/api-client/src/prediction-types";
import { categoryName } from "./market-content";

const CATEGORY_EMOJI: Record<string, string> = {
  politics: "\u{1F3DB}\u{FE0F}",
  esports: "\u{1F3AE}",
  sports: "\u{1F3C6}",
  entertainment: "\u{1F3AC}",
  tech: "\u{1F4BB}",
  economics: "\u{1F4C8}",
};

const PILLS_WRAPPER_CLASS =
  "flex min-w-max gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";
const PILL_BASE_CLASS =
  "inline-flex items-center gap-2 whitespace-nowrap rounded-md border px-4 py-2.5 text-[13px] font-bold transition-all duration-150";
const PILL_ACTIVE_CLASS =
  "border-[var(--yes-border)] bg-[var(--yes-soft)] text-[var(--yes-text)] shadow-[0_0_24px_rgba(113,238,184,0.12)]";
const PILL_INACTIVE_CLASS =
  "border-[rgba(42,49,80,0.9)] bg-[#0f1630] text-[#d3d3d3] hover:-translate-y-px hover:border-[#435079] hover:text-[#dbeafe]";
const PILL_ICON_CLASS = "text-[15px] leading-none";

function pillClass(active: boolean): string {
  return `${PILL_BASE_CLASS} ${active ? PILL_ACTIVE_CLASS : PILL_INACTIVE_CLASS}`;
}

interface CategoryPillsProps {
  categories: Category[];
  activeSlug?: string | null;
  onSelect?: (slug: string | null) => void;
}

export function CategoryPills({
  categories,
  activeSlug,
  onSelect,
}: CategoryPillsProps) {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  return (
    <div className={PILLS_WRAPPER_CLASS}>
      <button
        type="button"
        onClick={() => onSelect?.(null)}
        className={pillClass(!activeSlug)}
      >
        <span className={PILL_ICON_CLASS}>{"\u{2728}"}</span>
        {t("ALL")}
      </button>
      {categories.map((cat) => {
        const active = activeSlug === cat.slug;
        return (
          <Link
            key={cat.slug}
            href={`/category/${cat.slug}`}
            onClick={(e) => {
              if (onSelect) {
                e.preventDefault();
                onSelect(cat.slug);
              }
            }}
            className={pillClass(active)}
          >
            <span className={PILL_ICON_CLASS}>
              {CATEGORY_EMOJI[cat.slug] ?? "\u{2022}"}
            </span>
            {categoryName(contentT, cat)}
          </Link>
        );
      })}
    </div>
  );
}
