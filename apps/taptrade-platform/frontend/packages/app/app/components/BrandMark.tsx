/**
 * BrandMark — TapTrade's four-plane market mark.
 *
 * The geometry is the production SVG translation of the approved generated
 * identity: two upper signal planes and two lower outcome stems separated by
 * one continuous central void. It stays crisp at header and favicon sizes.
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
      className={`block shrink-0 ${className}`}
      width={size}
      height={size}
      viewBox="0 0 120 100"
      fill="none"
    >
      <defs>
        <linearGradient
          id="taptrade-mark-gradient"
          x1="8"
          y1="2"
          x2="108"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          {/* Gradient stops read theme tokens (handoff spec §3 item 4,
              2026-07-26) so a theme can recolour the mark. The
              --brand-mark-stop-* defaults in globals.css are the
              previous literal violet values — no visual change yet. */}
          <stop stopColor="var(--brand-mark-stop-1, #9188ff)" />
          <stop offset="0.52" stopColor="var(--brand-mark-stop-2, #766af1)" />
          <stop offset="1" stopColor="var(--brand-mark-stop-3, #6258d3)" />
        </linearGradient>
      </defs>
      <g fill="url(#taptrade-mark-gradient)">
        <path d="M0 0h34c11 0 22 9 22 21v13c-8-8-15-16-27-16H19C10 18 2 11 0 0Z" />
        <path d="M120 0H86C75 0 64 9 64 21v13c8-8 15-16 27-16h10c9 0 17-7 19-18Z" />
        <path d="M13 34h17c14 0 23 11 23 25v28l-13 13V61c0-7-5-11-12-13-8-2-14-7-15-14Z" />
        <path d="M107 34H90c-14 0-23 11-23 25v28l13 13V61c0-7 5-11 12-13 8-2 14-7 15-14Z" />
      </g>
      {variant === "solo" && (
        <circle cx="60" cy="88" r="3" fill="var(--brand-period)" />
      )}
    </svg>
  );
}
