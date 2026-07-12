"use client";

/**
 * DiscoveryHero — the LEAD STORY (P11 "Standing Question", 2026-07-12).
 *
 * The featured market composed as a broadsheet lead: heavy ink rule on
 * top, rubric row, the market question as a serif headline, the price
 * as a serif display figure with a mono wire delta, the chart drawn as
 * a print graphic (axis figures + source line), and quiet bordered
 * actions. No card, no shadow — the story sits directly on the paper.
 *
 * P10 honesty contract carries over unchanged: the delta and the chart
 * derive from the SAME real price series; loading/absent/errored states
 * claim nothing; the demo flag's synthetic fallback wears a visible
 * "Simulated" tag.
 */

import Link from "next/link";
import { useTranslation } from "react-i18next";
import type { PredictionMarket } from "@taptrade-ui/api-client/src/prediction-types";
import { heroChartPath, seriesDelta } from "./utils/spark";
import { useMarketHistory } from "./utils/useHeroPriceHistory";
import { samplePath } from "./market-chart-state";
import { DEMO_SYNTHETIC_CHARTS } from "../../lib/features";
import { categoryLabel, localizedMarket } from "./market-content";
import { formatCompactPoints } from "./market-display";

function formatHeroCloseLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "closed";
  const days = ms / 86_400_000;
  if (days >= 1) return `${Math.floor(days)}d`;
  const hours = ms / 3_600_000;
  if (hours >= 1) return `${Math.floor(hours)}h`;
  const mins = ms / 60_000;
  return `${Math.max(1, Math.floor(mins))}m`;
}

const SIM_TAG_CLASS =
  "pointer-events-none absolute right-0 top-0 z-[1] border border-[var(--border-2)] bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--t3)]";

/**
 * Print-graphic chart: the real series with a session-open baseline,
 * lo/hi axis figures in wire mono, and a source line underneath —
 * annotated like a newspaper graphic, not a glowing app chart.
 */
function LeadChart({
  values,
  synthetic,
  up,
  height,
  sourceLine,
  simulatedLabel,
}: {
  values: number[] | null;
  synthetic: boolean;
  up: boolean;
  height: number;
  sourceLine: string;
  simulatedLabel: string;
}) {
  const chart = heroChartPath(values, 800, height);
  if (!chart || !values) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const stroke = up ? "var(--yes)" : "var(--no)";
  return (
    <figure className="relative m-0 min-w-0">
      {synthetic && <span className={SIM_TAG_CLASS}>{simulatedLabel}</span>}
      <div className="flex items-stretch gap-2">
        {/* Axis figures — hi over lo, right-aligned wire mono. */}
        <div
          className="flex w-9 shrink-0 flex-col justify-between py-0.5 text-right font-mono text-[10px] leading-none text-[var(--t3)] [font-variant-numeric:tabular-nums]"
          aria-hidden="true"
        >
          <span>{Math.round(hi)}¢</span>
          <span>{Math.round(lo)}¢</span>
        </div>
        <svg
          className="block w-full overflow-visible"
          style={{ height }}
          viewBox={`0 0 800 ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <line
            x1="0"
            x2="800"
            y1={chart.baselineY}
            y2={chart.baselineY}
            stroke="var(--border-2)"
            strokeWidth="1"
            strokeDasharray="2 5"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={chart.line}
            stroke={stroke}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={chart.end.x}
            cy={chart.end.y}
            r={3.5}
            fill={stroke}
            stroke="var(--bg-deep)"
            strokeWidth={1.5}
          />
        </svg>
      </div>
      <figcaption className="mt-1.5 pl-11 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--t4)]">
        {sourceLine}
      </figcaption>
    </figure>
  );
}

export function DiscoveryHero({
  market,
  categoryName,
}: {
  market: PredictionMarket | null;
  categoryName?: string;
}) {
  const { t } = useTranslation("prediction");
  const { t: contentT } = useTranslation("market-content");
  const history = useMarketHistory(market?.ticker ?? "");
  if (!market) {
    return (
      <section className="min-h-[420px] border-t-[3px] border-[var(--rule-ink)] pt-4 text-[var(--t3)]">
        {t("LOADING_MARKETS")}
      </section>
    );
  }

  const displayMarket = localizedMarket(contentT, market);
  const resolvedCategoryName = categoryName || market.categoryName || "";
  const displayCategory = resolvedCategoryName
    ? categoryLabel(contentT, resolvedCategoryName)
    : "";
  const yes = displayMarket.yesPricePoints;
  const no = displayMarket.noPricePoints;

  const delta = seriesDelta(history.points);
  const syntheticValues =
    DEMO_SYNTHETIC_CHARTS && history.state !== "ready"
      ? samplePath(`${displayMarket.ticker}-hero`, "1d", yes)
      : null;
  const chartValues = history.points ?? syntheticValues;
  const chartSynthetic = syntheticValues !== null;
  const chartUp = chartSynthetic
    ? (chartValues?.[chartValues.length - 1] ?? 0) >= (chartValues?.[0] ?? 0)
    : (delta?.up ?? true);
  const isUp = delta ? delta.up : true;
  const isFlat = delta ? delta.flat : true;
  const volumeLabel = formatCompactPoints(displayMarket.volumePoints);
  const oiLabel =
    displayMarket.openInterestPoints != null &&
    displayMarket.openInterestPoints > 0
      ? formatCompactPoints(displayMarket.openInterestPoints)
      : "—";
  const closesLabel = formatHeroCloseLeft(displayMarket.closeAt);

  return (
    <section
      className="border-t-[3px] border-[var(--rule-ink)] pt-3 font-sans"
      aria-label={t("FEATURED_MARKET")}
    >
      {/* Rubric row: LEAD STORY · LIVE · category — print furniture. */}
      <header className="rh-hero-eyebrow mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--t3)]">
        <span className="text-[var(--t1)]">
          {t("LEAD_STORY", "Lead story")}
        </span>
        {displayMarket.status === "open" && (
          <>
            <span aria-hidden="true" className="text-[var(--border-2)]">
              |
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--accent-text)]">
              <span
                className="h-[6px] w-[6px] rounded-full bg-[var(--brand-dot)]"
                aria-hidden="true"
              />
              {t("LIVE")}
            </span>
          </>
        )}
        {displayCategory && (
          <>
            <span aria-hidden="true" className="text-[var(--border-2)]">
              |
            </span>
            <span>{displayCategory}</span>
          </>
        )}
      </header>

      {/* The question is the headline. min-h reserves two lines so pager
          flips don't pump the page height. */}
      <h1
        className="type-display m-0 mb-5 min-h-[2.2em] max-w-[24ch] text-balance text-[clamp(28px,3.4vw,46px)] font-medium leading-[1.08] text-[var(--t1)]"
        title={displayMarket.title}
      >
        {displayMarket.title}
      </h1>

      <div className="grid grid-cols-[minmax(280px,5fr)_7fr] gap-10 max-[980px]:grid-cols-1 max-[980px]:gap-6">
        {/* ── Left: the figure, the actions, the wire stats ─────────── */}
        <div className="flex min-w-0 flex-col">
          <div
            className="type-display m-0 text-[clamp(56px,6vw,92px)] font-medium leading-[0.9] text-[var(--t1)]"
            aria-label={`Yes price ${yes} cents`}
          >
            {yes}
            <span className="ml-1 text-[0.5em] font-normal text-[var(--t3)]">
              ¢
            </span>
          </div>
          <div className="mb-6 mt-2.5 flex items-baseline gap-2.5 font-mono text-[13px] [font-variant-numeric:tabular-nums]">
            {delta && !isFlat ? (
              <span
                className={`font-semibold ${isUp ? "text-[var(--yes-text)]" : "text-[var(--no-text)]"}`}
              >
                {isUp ? "▲" : "▼"} {isUp ? "+" : ""}
                {delta.delta}¢ ({isUp ? "+" : ""}
                {delta.pct.toFixed(1)}%)
              </span>
            ) : (
              <span className="font-semibold text-[var(--t3)]">
                {history.state === "loading" ? "…" : "—"}
              </span>
            )}
            <span className="text-[12px] text-[var(--t3)]">{t("TODAY")}</span>
          </div>

          {/* Mobile chart between figure and actions. */}
          <div className="mb-5 hidden max-[980px]:block">
            <LeadChart
              values={chartValues}
              synthetic={chartSynthetic}
              simulatedLabel={t("SIMULATED", "Simulated")}
              up={chartUp}
              height={140}
              sourceLine={t(
                "CHART_SOURCE_LINE",
                "Source: TapTrade order flow · today",
              )}
            />
          </div>

          <div className="mt-auto grid grid-cols-2 gap-3">
            <Link
              href={`/market/${displayMarket.ticker}?side=yes`}
              className="flex min-h-11 items-center justify-between border border-[var(--yes-border)] bg-transparent px-4 text-[14px] font-semibold text-[var(--yes-text)] no-underline transition-colors duration-150 hover:bg-[var(--yes-soft)]"
            >
              <span>{t("BUY_YES")}</span>
              <span className="font-mono [font-variant-numeric:tabular-nums]">
                {yes}¢
              </span>
            </Link>
            <Link
              href={`/market/${displayMarket.ticker}?side=no`}
              className="flex min-h-11 items-center justify-between border border-[var(--no-border)] bg-transparent px-4 text-[14px] font-semibold text-[var(--no-text)] no-underline transition-colors duration-150 hover:bg-[var(--no-soft)]"
            >
              <span>{t("BUY_NO")}</span>
              <span className="font-mono [font-variant-numeric:tabular-nums]">
                {no}¢
              </span>
            </Link>
          </div>

          {/* Wire stat line — one row of mono figures under a hairline. */}
          <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-t border-[var(--border-1)] pt-3 font-mono text-[12px] text-[var(--t2)] [font-variant-numeric:tabular-nums]">
            <div className="flex gap-1.5">
              <dt className="text-[var(--t4)]">{t("24H_VOLUME")}</dt>
              <dd className="m-0 font-semibold">{volumeLabel}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-[var(--t4)]">{t("OPEN_INTEREST")}</dt>
              <dd className="m-0 font-semibold">{oiLabel}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-[var(--t4)]">{t("CLOSES")}</dt>
              <dd className="m-0 font-semibold">{closesLabel}</dd>
            </div>
          </dl>
        </div>

        {/* ── Right: the print graphic ──────────────────────────────── */}
        <div className="relative min-w-0 max-[980px]:hidden">
          {chartValues && chartValues.length >= 2 ? (
            <LeadChart
              values={chartValues}
              synthetic={chartSynthetic}
              simulatedLabel={t("SIMULATED", "Simulated")}
              up={chartUp}
              height={300}
              sourceLine={t(
                "CHART_SOURCE_LINE",
                "Source: TapTrade order flow · today",
              )}
            />
          ) : (
            <div
              className="flex h-full min-h-[300px] w-full items-center justify-center border border-dashed border-[var(--border-1)] text-[12px] text-[var(--t3)]"
              role="status"
            >
              {history.state === "loading"
                ? t("CHART_LOADING", "Loading price history…")
                : history.state === "error"
                  ? t("CHART_UNAVAILABLE", "Price history unavailable")
                  : t("CHART_NO_TRADES", "No price movement yet")}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
