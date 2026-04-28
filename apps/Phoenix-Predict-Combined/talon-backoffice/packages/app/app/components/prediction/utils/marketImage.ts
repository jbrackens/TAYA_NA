/**
 * Deterministic image/monogram helper for MarketCard (P8, DESIGN.md §7).
 *
 * Every card must carry a corner image. Imported markets use imagePath from
 * the discovery sync. Native (gateway-authored) markets use a colored monogram
 * disc: first 2 chars of the ticker, hue derived from category.
 */

type ImageResult =
  | { src: string }
  | { monogram: string; bgClass: string };

const CATEGORY_HUE_MAP: Record<string, string> = {
  politics:      "cat-blue",
  political:     "cat-blue",
  crypto:        "cat-orange",
  cryptocurrency:"cat-orange",
  sports:        "cat-soccer",
  sport:         "cat-soccer",
  entertainment: "cat-purple",
  tech:          "cat-green",
  technology:    "cat-green",
  economics:     "cat-green",
  economic:      "cat-green",
};

function categoryToBgClass(categoryLabel: string | undefined): string {
  if (!categoryLabel) return "cat-slate";
  const key = categoryLabel.toLowerCase().trim();
  return CATEGORY_HUE_MAP[key] ?? "cat-slate";
}

export function getMarketImageProps(market: {
  ticker: string;
  imagePath?: string;
  categoryLabel?: string;
}): ImageResult {
  if (market.imagePath) {
    return { src: market.imagePath };
  }
  const monogram = market.ticker.replace(/-/g, "").slice(0, 2).toUpperCase() || "?";
  const bgClass = categoryToBgClass(market.categoryLabel);
  return { monogram, bgClass };
}
