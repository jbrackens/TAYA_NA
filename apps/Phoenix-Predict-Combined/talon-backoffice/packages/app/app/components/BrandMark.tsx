/**
 * BrandMark — 28px gradient-filled brand square with a "P" letterform.
 *
 * The one place in the app where the signature 3-stop mint → teal →
 * azure gradient appears. See DESIGN.md §3 (brand discipline: "gradient
 * is reserved for the brand moment") and §6 (shell structure).
 *
 * Specular highlight + mint glow sit on top of the gradient, and a
 * heavy 900-weight "P" is centered in dark-emerald so it reads as
 * embossed into the mark rather than stamped on top.
 */

type BrandMarkProps = {
  size?: number;
  glyph?: string;
};

export default function BrandMark({ size = 28, glyph = "P" }: BrandMarkProps) {
  const radius = Math.round(size * 0.285);
  const fontSize = Math.round(size * 0.46);
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.3) 0%, transparent 60%), var(--accent-gradient)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.15), 0 2px 6px var(--accent-glow-color), 0 0 14px rgba(43, 228, 128, 0.3)",
        color: "#04140a",
        fontWeight: 900,
        fontSize,
        lineHeight: 1,
        letterSpacing: "-0.02em",
        flexShrink: 0,
      }}
    >
      {glyph}
    </span>
  );
}
