/**
 * BrandMark — Tiangge identity mark for the top shell.
 *
 * Small market-line motif used with the Tiangge wordmark.
 * Inspired by the Canva direction, but rendered as code-native SVG so it
 * stays crisp in the header and avoids shipping the typoed full logo image.
 */

type BrandMarkProps = {
  className?: string;
  size?: number;
};

export default function BrandMark({
  className = "",
  size = 32,
}: BrandMarkProps) {
  const width = Math.round(size * 2.235);
  const strokeWidth = Math.max(1.6, size * 0.094);
  const dotRadius = Math.max(2.25, size * 0.13);
  const nodes = [
    [dotRadius, size * 0.56],
    [width * 0.46, size * 0.72],
    [width - dotRadius, size * 0.24],
  ];

  return (
    <svg
      aria-hidden="true"
      className={`block shrink-0 overflow-visible text-[var(--accent)] ${className}`}
      width={width}
      height={size}
      viewBox={`0 0 ${width} ${size}`}
      fill="none"
    >
      <path
        d={nodes
          .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`)
          .join(" ")}
        stroke="var(--accent-lo)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {nodes.map(([cx, cy], index) => (
        <circle
          key={index}
          cx={cx}
          cy={cy}
          r={dotRadius}
          fill={index === 1 ? "var(--no-text)" : "var(--accent-lo)"}
        />
      ))}
    </svg>
  );
}
