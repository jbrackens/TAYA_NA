/**
 * BrandMark — Tiangge identity token.
 *
 * A solid deep-forest rounded-square tile holding a split "T" (the bid/ask
 * mark) and the mint "period" signature dot. Rendered as code-native SVG so it
 * stays crisp from a 16px favicon up to large lockups, and themes off the
 * --brand-* tokens. Pairs with the "Tiangge." wordmark (Schibsted Grotesk).
 *
 * (Replaces the retired chart-line mark, 2026-06-06.)
 */

type BrandMarkProps = {
  className?: string;
  size?: number;
  /** Corner radius as a fraction of size (default 0.22). */
  radius?: number;
};

export default function BrandMark({
  className = "",
  size = 36,
  radius = 0.22,
}: BrandMarkProps) {
  const r = Math.round(100 * radius);
  return (
    <svg
      aria-hidden="true"
      className={`block shrink-0 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
    >
      <rect width="100" height="100" rx={r} fill="var(--brand-ink)" />
      {/* split T — two top bars (bid / ask · YES / NO) over a single stem */}
      <rect
        x="22"
        y="30"
        width="22"
        height="13"
        rx="2.5"
        fill="var(--brand-fg)"
      />
      <rect
        x="56"
        y="30"
        width="22"
        height="13"
        rx="2.5"
        fill="var(--brand-fg)"
      />
      <rect
        x="43.5"
        y="30"
        width="13"
        height="42"
        rx="2.5"
        fill="var(--brand-fg)"
      />
      {/* the period — mint signature dot */}
      <circle cx="79" cy="79" r="6.5" fill="var(--brand-period)" />
    </svg>
  );
}
