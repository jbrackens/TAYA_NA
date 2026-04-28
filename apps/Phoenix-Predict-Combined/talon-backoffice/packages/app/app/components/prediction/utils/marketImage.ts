/**
 * Card image helper (DESIGN.md §6 MarketCard composition).
 *
 * Every MarketCard renders a small circular image in the top-right corner.
 * Imported markets carry an `imagePath` from the discovery sync. Native
 * (gateway-authored) markets don't, so we render a deterministic colored
 * monogram disc instead — hue derived from category, label = first ~2
 * chars of the ticker.
 *
 * Returning a discriminated union keeps the consumer's render path
 * straightforward: either an <img src> or a colored <span> with the
 * monogram inside.
 */

interface MarketImageInput {
  ticker: string;
  imagePath?: string;
  categoryLabel?: string;
}

export type MarketImageProps =
  | { kind: "image"; src: string }
  | { kind: "monogram"; monogram: string; bgClass: string };

const CATEGORY_HUE: Record<string, string> = {
  politics: "bg-blue",
  crypto: "bg-orange",
  sports: "bg-emerald",
  entertainment: "bg-purple",
  tech: "bg-cyan",
  technology: "bg-cyan",
  economics: "bg-green",
  economy: "bg-green",
};

function categoryToBgClass(label?: string): string {
  if (!label) return "bg-slate";
  return CATEGORY_HUE[label.toLowerCase()] ?? "bg-slate";
}

function tickerToMonogram(ticker: string): string {
  const cleaned = ticker.replace(/[^A-Za-z0-9]/g, "");
  return cleaned.slice(0, 2).toUpperCase() || "M";
}

export function getMarketImageProps(
  market: MarketImageInput,
): MarketImageProps {
  if (market.imagePath && market.imagePath.trim().length > 0) {
    return { kind: "image", src: market.imagePath };
  }
  return {
    kind: "monogram",
    monogram: tickerToMonogram(market.ticker),
    bgClass: categoryToBgClass(market.categoryLabel),
  };
}
