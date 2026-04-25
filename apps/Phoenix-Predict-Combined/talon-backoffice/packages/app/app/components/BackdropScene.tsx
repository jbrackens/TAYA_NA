/**
 * BackdropScene — Liquid Glass backdrop (DESIGN.md §5).
 *
 * Layer 1 is the body::before radial gradient stack in globals.css.
 * This component renders Layers 2 + 3:
 *   Layer 2 (z -2): faint SVG "market chart" wavy lines in seafoam YES,
 *     coral NO, and mint-accent. A visual hint at market data without
 *     being literal. Never read, always felt.
 *   Layer 3 (z -1): subtle orthogonal grid at ~7% opacity — trading-
 *     desk grounding via stacked linear-gradients (see .backdrop-scene__grid
 *     in globals.css).
 *
 * Fixed, non-interactive, stationary (no scroll-driven motion).
 * Honors prefers-reduced-transparency — the media query in globals.css
 * hides the SVG layer and drops the body::before to solid bg-deep.
 */
export default function BackdropScene() {
  return (
    <div className="backdrop-scene" aria-hidden="true">
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0, opacity: 0.18 }}
      >
        <defs>
          <linearGradient id="bd-yes" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--yes)" stopOpacity="0" />
            <stop offset="20%" stopColor="var(--yes)" stopOpacity="0.9" />
            <stop offset="80%" stopColor="var(--yes)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--yes)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bd-no" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--no)" stopOpacity="0" />
            <stop offset="25%" stopColor="var(--no)" stopOpacity="0.85" />
            <stop offset="75%" stopColor="var(--no)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--no)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bd-accent" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
            <stop offset="30%" stopColor="var(--accent)" stopOpacity="0.7" />
            <stop offset="70%" stopColor="var(--accent)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
          <filter id="bd-blur" x="-5%" y="-50%" width="110%" height="200%">
            <feGaussianBlur stdDeviation="1.2" />
          </filter>
        </defs>

        {/* YES (seafoam green) — upper-middle, gentle drift upward */}
        <path
          d="M 0 480 C 180 440, 340 520, 520 460 S 860 380, 1060 420 S 1320 360, 1440 400"
          stroke="url(#bd-yes)"
          strokeWidth="1.5"
          fill="none"
          filter="url(#bd-blur)"
        />

        {/* NO (coral) — lower half, crossing below YES */}
        <path
          d="M 0 560 C 220 600, 380 540, 580 580 S 900 640, 1120 600 S 1340 640, 1440 610"
          stroke="url(#bd-no)"
          strokeWidth="1.5"
          fill="none"
          filter="url(#bd-blur)"
        />

        {/* Accent (mint) — long low-amplitude trend, upper third */}
        <path
          d="M 0 320 C 240 300, 440 360, 660 320 S 1000 260, 1220 300 S 1400 280, 1440 290"
          stroke="url(#bd-accent)"
          strokeWidth="1.2"
          fill="none"
          filter="url(#bd-blur)"
        />

        {/* Secondary YES line — faint echo, lower amplitude */}
        <path
          d="M 0 680 C 200 660, 400 700, 620 670 S 980 640, 1200 680 S 1380 660, 1440 670"
          stroke="url(#bd-yes)"
          strokeWidth="1"
          strokeOpacity="0.55"
          fill="none"
          filter="url(#bd-blur)"
        />
      </svg>

      <div className="backdrop-scene__grid" />
    </div>
  );
}
