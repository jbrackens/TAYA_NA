/**
 * BrandMark — TapTrade identity glyph (P9 revision, 2026-07-07).
 *
 * A split "T": two ink crossbar segments (the two sides of a binary
 * market) over a mint stem (the committed trade — the action color runs
 * through the mark), with a mint "tap dot" landing under the stem in the
 * solo variant — the tap that places the trade. Strokes share
 * one weight and the two channels are real negative space, so the glyph
 * stays crisp from a 16px favicon (where the channels close into a solid
 * T) up to large lockups.
 *
 * Variants — a responsive identity system, not one frozen asset:
 *   "glyph" — naked two-tone mark: crossbars in currentColor (brand ink on
 *             light; dark surfaces set text color to --brand-on-dark and
 *             remap --brand-period to its dark variant), stem in the brand
 *             mint. For chrome next to the wordmark.
 *   "solo"  — glyph + mint tap dot. For when the mark stands alone
 *             (loading screens, auth, share surfaces).
 * The app-icon/favicon tile lives in app/icon.svg (a container is needed
 * against browser chrome); page surfaces never draw the tile.
 *
 * (Replaces the 2026-06-06 tile mark: letter-in-a-rounded-square with a
 * corner dot read as a generic app icon with a notification badge, and
 * its stem overlapped the crossbar segments producing sub-pixel seams.)
 */

type BrandMarkProps = {
  className?: string;
  size?: number;
  /** "glyph" = naked ink mark (default, for lockups); "solo" = with the mint tap dot. */
  variant?: "glyph" | "solo";
};

export default function BrandMark({
  className = "",
  size = 30,
  variant = "glyph",
}: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={`block shrink-0 text-[var(--brand-ink)] ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
    >
      {/* split crossbar — two sides of the market */}
      <rect
        x="12"
        y="18"
        width="25"
        height="16"
        rx="3"
        fill="currentColor"
      />
      <rect
        x="63"
        y="18"
        width="25"
        height="16"
        rx="3"
        fill="currentColor"
      />
      {/* the stem — one committed trade; the brand mint runs through it */}
      <rect
        x="42"
        y="18"
        width="16"
        height="56"
        rx="3"
        fill="var(--brand-period)"
      />
      {variant === "solo" && (
        /* the tap dot — the press that lands the trade */
        <circle cx="50" cy="87" r="7" fill="var(--brand-period)" />
      )}
    </svg>
  );
}
