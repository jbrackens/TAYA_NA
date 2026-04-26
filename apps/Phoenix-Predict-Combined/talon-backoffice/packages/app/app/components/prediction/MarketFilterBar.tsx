"use client";

/**
 * MarketFilterBar — single-row filter control that sits below the hero+
 * sidebar row on /predict.
 *
 * Two dimensions:
 *   - Closing window: All / 1D / 1W / 1M (Pariflow-style segmented pills)
 *   - Topic (category): All / Politics / Crypto / Sports / ...   (dropdown)
 *
 * The pills are the primary control — closing-window scoping is the move
 * users make most often. The topic dropdown is pushed to the right of the
 * row so it doesn't compete for attention.
 *
 * State is owned by the parent (controlled component). `value` is the
 * current selection; `onChange` fires on every change.
 */

import { useId } from "react";
import type { Category } from "@phoenix-ui/api-client/src/prediction-types";

export type DateWindow = "all" | "24h" | "7d" | "30d";

export interface MarketFilterValue {
  categorySlug: string; // "all" or a category slug
  dateWindow: DateWindow;
}

export const EMPTY_FILTER: MarketFilterValue = {
  categorySlug: "all",
  dateWindow: "all",
};

export function isFilterActive(v: MarketFilterValue): boolean {
  return v.categorySlug !== "all" || v.dateWindow !== "all";
}

/**
 * Convert a date window into an absolute ISO timestamp suitable for the
 * `closeBefore` query param on `/api/v1/markets`. Returns `undefined` when
 * the window is "all" (i.e., no upper bound).
 */
export function dateWindowToCloseBefore(w: DateWindow): string | undefined {
  if (w === "all") return undefined;
  const ms = w === "24h" ? 24 : w === "7d" ? 24 * 7 : 24 * 30;
  return new Date(Date.now() + ms * 60 * 60 * 1000).toISOString();
}

interface Props {
  categories: Category[];
  value: MarketFilterValue;
  onChange: (next: MarketFilterValue) => void;
}

const TIME_PILLS: { value: DateWindow; label: string }[] = [
  { value: "all", label: "All" },
  { value: "24h", label: "1D" },
  { value: "7d", label: "1W" },
  { value: "30d", label: "1M" },
];

export function MarketFilterBar({ categories, value, onChange }: Props) {
  const topicId = useId();
  const active = isFilterActive(value);

  return (
    <>
      <style>{`
        .mfb {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          padding: 8px 12px;
          margin: 0 0 22px;
          border-radius: var(--r-pill);
        }
        .mfb-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--t3);
          padding: 0 6px;
        }
        .mfb-pills {
          display: inline-flex;
          background: rgba(0, 0, 0, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--r-pill);
          padding: 3px;
          gap: 2px;
        }
        .mfb-pill {
          appearance: none;
          background: transparent;
          border: 0;
          padding: 7px 16px;
          min-width: 56px;
          border-radius: var(--r-pill);
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: var(--t2);
          cursor: pointer;
          transition: color 150ms ease, background 150ms ease, box-shadow 150ms ease;
          letter-spacing: 0.01em;
        }
        .mfb-pill:hover {
          color: var(--t1);
          background: rgba(255, 255, 255, 0.06);
        }
        .mfb-pill:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px var(--accent-soft);
        }
        .mfb-pill.is-active {
          color: var(--accent);
          background: var(--accent-soft);
          box-shadow: inset 0 0 0 1px rgba(43, 228, 128, 0.5);
          text-shadow: 0 0 6px var(--accent-glow-color);
        }
        .mfb-spacer { flex: 1; }
        .mfb-topic {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .mfb-select {
          appearance: none;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%),
            rgba(0, 0, 0, 0.18);
          color: var(--t1);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--r-pill);
          padding: 8px 32px 8px 14px;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: border-color 150ms ease, background 150ms ease;
          background-image:
            linear-gradient(45deg, transparent 50%, var(--t2) 50%),
            linear-gradient(135deg, var(--t2) 50%, transparent 50%);
          background-position:
            calc(100% - 16px) calc(50% - 2px),
            calc(100% - 11px) calc(50% - 2px);
          background-size: 5px 5px, 5px 5px;
          background-repeat: no-repeat;
        }
        .mfb-select:hover {
          border-color: rgba(255, 255, 255, 0.22);
        }
        .mfb-select:focus-visible {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 2px var(--accent-soft);
        }
        .mfb-select.is-active {
          border-color: rgba(43, 228, 128, 0.5);
          background-color: rgba(43, 228, 128, 0.08);
          color: var(--accent);
        }
        .mfb-clear {
          background: transparent;
          border: 0;
          color: var(--t3);
          font-family: inherit;
          font-size: 12px;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: var(--r-pill);
          transition: color 150ms ease, background 150ms ease;
        }
        .mfb-clear:hover {
          color: var(--t1);
          background: rgba(255, 255, 255, 0.06);
        }
        @media (max-width: 640px) {
          .mfb { padding: 8px 10px; gap: 8px; }
          .mfb-spacer { display: none; }
          .mfb-topic { width: 100%; }
          .mfb-select { width: 100%; }
        }
      `}</style>
      <div
        className="glass glass-thin mfb"
        role="search"
        aria-label="Filter markets"
      >
        <span className="mfb-label">Closing</span>

        <div
          className="mfb-pills"
          role="tablist"
          aria-label="Filter by closing window"
        >
          {TIME_PILLS.map((pill) => {
            const isActive = value.dateWindow === pill.value;
            return (
              <button
                key={pill.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`mfb-pill ${isActive ? "is-active" : ""}`}
                onClick={() => onChange({ ...value, dateWindow: pill.value })}
              >
                {pill.label}
              </button>
            );
          })}
        </div>

        <div className="mfb-spacer" />

        <div className="mfb-topic">
          <label
            htmlFor={topicId}
            style={{ position: "absolute", left: -10000 }}
          >
            Topic
          </label>
          <select
            id={topicId}
            className={`mfb-select ${value.categorySlug !== "all" ? "is-active" : ""}`}
            value={value.categorySlug}
            onChange={(e) =>
              onChange({ ...value, categorySlug: e.target.value })
            }
          >
            <option value="all">All topics</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
          {active && (
            <button
              type="button"
              className="mfb-clear"
              onClick={() => onChange(EMPTY_FILTER)}
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </>
  );
}
