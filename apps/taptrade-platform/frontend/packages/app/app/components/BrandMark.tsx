/**
 * BrandMark — the standing-question glyph (P11, 2026-07-12; supersedes
 * the P9.1 split-T).
 *
 * A serif question mark drawn from Newsreader's own "?" outlines
 * (wght 560 / opsz 60): the hook in ink, the dot OVERSIZED (1.55×) in
 * press blue — the same landing period that ends the wordmark. Every
 * market is a standing question; the dot is the answer landing.
 *
 * Variants:
 *   "glyph" — hook in currentColor + blue dot, for chrome lockups.
 *   "solo"  — identical art (the dot is intrinsic to the mark); kept
 *             for call-site compatibility with the P9 API.
 * The app-icon/favicon tile lives in app/icon.svg.
 */

type BrandMarkProps = {
  className?: string;
  size?: number;
  /** Kept for API compatibility; both variants draw the full glyph. */
  variant?: "glyph" | "solo";
};

export default function BrandMark({
  className = "",
  size = 30,
  variant = "glyph",
}: BrandMarkProps) {
  void variant;
  return (
    <svg
      aria-hidden="true"
      className={`block shrink-0 text-[var(--brand-ink)] ${className}`}
      width={size * (920.9 / 1576.1)}
      height={size}
      viewBox="0 0 920.9 1576.1"
      fill="none"
    >
      <path d="M328.6 16.7Q450.7 16.7 551.7 49.3Q652.7 81.9 726.6 141.2Q800.4 200.6 840.6 280.9Q880.9 361.2 880.9 457.0Q880.9 569.0 836.0 643.9Q791.1 718.9 686.5 754.1Q581.9 789.4 401.6 783.0L442.2 637.7L439.3 970.6H399.5L312.7 579.6Q478.7 584.2 570.7 556.4Q662.7 528.7 699.4 474.6Q736.1 420.6 736.1 346.9Q736.1 271.2 707.0 219.6Q678.0 168.1 623.7 141.7Q569.5 115.2 492.5 115.2Q425.1 115.2 371.6 138.4Q318.1 161.6 277.3 192.2Q236.5 222.7 208.0 245.9Q179.6 269.1 161.7 269.1Q135.7 269.1 111.2 253.8Q86.6 238.4 70.3 212.6Q54.0 186.8 54.0 155.8Q54.0 116.9 82.1 85.2Q110.1 53.6 170.8 35.1Q231.4 16.7 328.6 16.7Z" fill="currentColor" />
      <path d="M423.1 1066.2Q532.9 1066.2 603.0 1136.9Q673.1 1207.5 673.1 1311.1Q673.1 1413.7 603.0 1484.9Q532.9 1556.1 423.1 1556.1Q314.4 1556.1 243.8 1484.9Q173.2 1413.7 173.2 1311.1Q173.2 1207.5 243.8 1136.9Q314.4 1066.2 423.1 1066.2Z" fill="var(--brand-period)" />
    </svg>
  );
}
