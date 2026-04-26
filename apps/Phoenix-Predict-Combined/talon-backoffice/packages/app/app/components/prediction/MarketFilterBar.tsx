"use client";

/**
 * MarketFilterBar — Robinhood-direction category pill row (P4, see
 * DESIGN.md §5 "Filter behavior").
 *
 * One horizontal row of pills: All · Politics · Crypto · Sports · Tech · …
 * Selected pill is mint-filled. The pill row is the only homepage filter
 * (DESIGN.md resolved 2026-04-26: closing-window filter dropped on the
 * homepage; Closing Soon section lives on /discover).
 *
 * State is owned by the parent (controlled). `value` is the current
 * selection; `onChange` fires whenever the user picks a new category.
 */

import type { Category } from "@phoenix-ui/api-client/src/prediction-types";

export interface MarketFilterValue {
  /** "all" or a category slug. */
  categorySlug: string;
}

export const EMPTY_FILTER: MarketFilterValue = {
  categorySlug: "all",
};

export function isFilterActive(v: MarketFilterValue): boolean {
  return v.categorySlug !== "all";
}

interface Props {
  categories: Category[];
  value: MarketFilterValue;
  onChange: (next: MarketFilterValue) => void;
}

export function MarketFilterBar({ categories, value, onChange }: Props) {
  return (
    <>
      <style>{`
        .mfb {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin: 0 0 28px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        .mfb-pill {
          appearance: none;
          background: rgba(255, 255, 255, 0.05);
          color: var(--t2);
          border: 1px solid transparent;
          border-radius: var(--r-pill);
          padding: 9px 18px;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 120ms ease, color 120ms ease;
          letter-spacing: 0;
        }
        .mfb-pill:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--t1);
        }
        .mfb-pill:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--accent-soft);
        }
        .mfb-pill.is-active {
          background: var(--accent);
          color: #061a10;
          font-weight: 600;
        }
      `}</style>
      <nav className="mfb" role="tablist" aria-label="Filter by category">
        <button
          type="button"
          role="tab"
          aria-selected={value.categorySlug === "all"}
          className={`mfb-pill ${value.categorySlug === "all" ? "is-active" : ""}`}
          onClick={() => onChange({ categorySlug: "all" })}
        >
          All
        </button>
        {categories.map((c) => {
          const isActive = value.categorySlug === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`mfb-pill ${isActive ? "is-active" : ""}`}
              onClick={() => onChange({ categorySlug: c.slug })}
            >
              {c.name}
            </button>
          );
        })}
      </nav>
    </>
  );
}
