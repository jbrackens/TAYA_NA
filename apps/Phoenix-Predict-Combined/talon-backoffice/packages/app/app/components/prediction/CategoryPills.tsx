"use client";

/**
 * CategoryPills — horizontal category filter.
 *
 * Uses the sportsbook .sport-pills / .sport-pill / .sport-pill-icon classes
 * from globals.css — same look as the sport navigation on the sportsbook
 * discovery page, just with category labels instead of sports.
 */

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { Category } from "@phoenix-ui/api-client/src/prediction-types";
import { categoryName } from "./market-content";

const CATEGORY_EMOJI: Record<string, string> = {
  politics: "\u{1F3DB}\u{FE0F}",
  crypto: "\u{1FA99}",
  sports: "\u{1F3C6}",
  entertainment: "\u{1F3AC}",
  tech: "\u{1F4BB}",
  economics: "\u{1F4C8}",
};

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
    <div className="sport-pills">
      <button
        type="button"
        onClick={() => onSelect?.(null)}
        className={`sport-pill${!activeSlug ? " active" : ""}`}
      >
        <span className="sport-pill-icon">{"\u{2728}"}</span>
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
            className={`sport-pill${active ? " active" : ""}`}
          >
            <span className="sport-pill-icon">
              {CATEGORY_EMOJI[cat.slug] ?? "\u{2022}"}
            </span>
            {categoryName(contentT, cat)}
          </Link>
        );
      })}
    </div>
  );
}
