/**
 * Card image helper (DESIGN.md §6 MarketCard composition).
 *
 * Every MarketCard renders a small circular image beside the title.
 * Imported markets carry an `imagePath` from the discovery sync. Native
 * (gateway-authored) markets don't, so we render a quiet neutral monogram
 * disc instead — initials derived from the category label (falling back
 * to the ticker, minus machine import prefixes).
 *
 * Returning a discriminated union keeps the consumer's render path
 * straightforward: either an <img src> or a colored <span> with the
 * monogram inside.
 */

interface MarketImageInput {
  ticker: string;
  imagePath?: string | null;
  imageUrl?: string | null;
  image_url?: string | null;
  categoryLabel?: string;
}

export type MarketImageProps =
  | { kind: "image"; src: string }
  | { kind: "monogram"; monogram: string; bgClass: string };

// One neutral warm disc for every monogram (P8): colored discs read as the
// SaaS icon-circle cliché and the old hue map used off-palette purple/amber.
function categoryMonogram(label?: string): string | null {
  if (!label) return null;
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const letters =
    words.length >= 2 ? `${words[0][0]}${words[1][0]}` : words[0].slice(0, 2);
  return letters.toUpperCase();
}

function tickerToMonogram(ticker: string): string {
  // Machine import prefixes (IMP-…) carry no meaning; skip them.
  const cleaned = ticker.replace(/^IMP-?/i, "").replace(/[^A-Za-z0-9]/g, "");
  return cleaned.slice(0, 2).toUpperCase() || "M";
}

export function getMarketImageProps(
  market: MarketImageInput,
): MarketImageProps {
  const src = [market.imagePath, market.imageUrl, market.image_url].find(
    (value) => value && value.trim().length > 0,
  );
  if (src) {
    return { kind: "image", src };
  }
  return {
    kind: "monogram",
    monogram:
      categoryMonogram(market.categoryLabel) ?? tickerToMonogram(market.ticker),
    bgClass: "bg-neutral",
  };
}
