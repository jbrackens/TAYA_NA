/**
 * BrandMark — Tiangge identity mark for the top shell.
 *
 * Renders the brand asset at /public/brand/mark.png. Source PNG was
 * trimmed of whitespace and downsized to 512px on the long edge for
 * retina-sharp display at small sizes.
 */

type BrandMarkProps = {
  size?: number;
};

export default function BrandMark({ size = 32 }: BrandMarkProps) {
  return (
    <img
      src="/brand/mark.png"
      alt=""
      aria-hidden="true"
      height={size}
      className="block w-auto shrink-0"
    />
  );
}
