/**
 * Tap Path brand mark.
 *
 * These are the approved, editable Figma production exports for the selected
 * Tap Path territory. Keep the artwork as a source asset rather than
 * reconstructing its vector geometry in application code.
 * Figma master: 178:7 · production export: 193:10.
 */

type BrandMarkTone = "brand" | "ink" | "light";

type BrandMarkProps = {
  className?: string;
  /** Width in pixels; the exported Tap Path mark keeps its Figma aspect ratio. */
  size?: number;
  tone?: BrandMarkTone;
};

const MARK_SOURCE: Record<BrandMarkTone, string> = {
  brand: "/brand/tap-path-mark-brand.svg",
  ink: "/brand/tap-path-mark-ink.svg",
  light: "/brand/tap-path-mark-light.svg",
};

export default function BrandMark({
  className = "",
  size = 30,
  tone = "ink",
}: BrandMarkProps) {
  const height = (size * 17.8604) / 24.001;

  return (
    <img
      aria-hidden="true"
      alt=""
      className={`block shrink-0 object-contain ${className}`}
      height={height}
      src={MARK_SOURCE[tone]}
      width={size}
    />
  );
}
