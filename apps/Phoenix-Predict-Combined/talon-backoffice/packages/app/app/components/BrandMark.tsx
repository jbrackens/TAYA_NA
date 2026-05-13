/**
 * BrandMark — compact angular Hula Na identity mark for the top shell.
 *
 * Uses the black + neon green sports-bookmaker direction from the wordmark
 * without copying any external brand asset.
 */

type BrandMarkProps = {
  size?: number;
};

export default function BrandMark({ size = 32 }: BrandMarkProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        filter: "drop-shadow(0 0 8px rgba(37, 235, 42, 0.28))",
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        focusable="false"
        style={{ display: "block" }}
      >
        <path
          d="M8.2 3.5H25.6L32.5 10.4V27.2L26.2 32.5H7.1L3.5 28.9V9.3L8.2 3.5Z"
          fill="#121114"
        />
        <path
          d="M8.2 3.5H25.6L32.5 10.4V27.2L26.2 32.5H7.1L3.5 28.9V9.3L8.2 3.5Z"
          stroke="#25EB2A"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path d="M24.9 5.4 30.4 10.9V15.6L21.2 5.4h3.7Z" fill="#25EB2A" />
        <path d="M24.5 8.2H28.2L17.8 28.1H14.1L24.5 8.2Z" fill="#25EB2A" />
        <text
          x="17.2"
          y="24.8"
          textAnchor="middle"
          fontFamily="'Bebas Neue', 'Arial Narrow', Impact, sans-serif"
          fontSize="17"
          fontWeight="400"
          letterSpacing="0.6"
          fill="#F8F9FA"
        >
          HN
        </text>
      </svg>
    </span>
  );
}
