"use client";

import React from "react";

const iconStyle: React.CSSProperties = { width: 18, height: 18, flexShrink: 0 };

/** Minimal monochrome sport SVG icons — 18×18, currentColor stroke */
const icons: Record<string, React.FC> = {
  soccer: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z" />
      <path d="M2 12h20" />
    </svg>
  ),
  basketball: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M4.93 4.93c4.08 3.06 6.83 7.97 7.07 13.07" />
      <path d="M19.07 4.93c-4.08 3.06-6.83 7.97-7.07 13.07" />
      <path d="M2 12h20" />
    </svg>
  ),
  tennis: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M18.09 5.91A8.96 8.96 0 0 1 5.91 18.09" />
    </svg>
  ),
  "american-football": () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="12" rx="10" ry="7" transform="rotate(-45 12 12)" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  ),
  football: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="12" rx="10" ry="7" transform="rotate(-45 12 12)" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  ),
  baseball: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M6.34 6.34a8 8 0 0 0 0 11.32" />
      <path d="M17.66 6.34a8 8 0 0 1 0 11.32" />
    </svg>
  ),
  "ice-hockey": () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 4L4 20h4l2-4h4l2 4h4L13 4z" />
      <path d="M8 16h8" />
    </svg>
  ),
  hockey: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 4L4 20h4l2-4h4l2 4h4L13 4z" />
      <path d="M8 16h8" />
    </svg>
  ),
  esports: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 12h4M8 10v4" />
      <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  mma: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 11V6a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2" />
      <path d="M13 6V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v7" />
      <path d="M7 11a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2" />
      <path d="M9 16v4M15 16v4" />
    </svg>
  ),
  boxing: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 11V6a2 2 0 0 0-2-2h-1a2 2 0 0 0-2 2" />
      <path d="M13 6V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v7" />
      <path d="M7 11a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a2 2 0 0 0-2-2" />
      <path d="M9 16v4M15 16v4" />
    </svg>
  ),
  golf: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 18V2l7 4-7 4" />
      <path d="M6 22c3.31 0 6-1.34 6-3s-2.69-3-6-3-6 1.34-6 3 2.69 3 6 3z" />
    </svg>
  ),
  cricket: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 19L19 5" />
      <rect
        x="3"
        y="17"
        width="4"
        height="6"
        rx="1"
        transform="rotate(-45 5 20)"
      />
      <circle cx="17" cy="5" r="3" />
    </svg>
  ),
  rugby: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="12" rx="10" ry="6" transform="rotate(-30 12 12)" />
      <path d="M8 8l8 8" />
    </svg>
  ),
  volleyball: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2c3 3.5 3 8.5 0 12" />
      <path d="M12 2c-3 3.5-3 8.5 0 12" />
      <path d="M5.5 16.5C9 14 15 14 18.5 16.5" />
    </svg>
  ),
  handball: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2v20M2 12h20" />
    </svg>
  ),
  "table-tennis": () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="15" cy="6" r="3" />
      <path d="M5 19l8-8" />
      <path d="M3 21l3-3" />
    </svg>
  ),
  darts: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  racing: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 13.52 9H12" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </svg>
  ),
  cycling: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="17" r="3" />
      <circle cx="18" cy="17" r="3" />
      <path d="M6 17l3-7h4l3 7" />
      <path d="M12 7l-1 3" />
      <circle cx="12" cy="5" r="1.5" />
    </svg>
  ),
  cs2: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  dota2: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 12h4M8 10v4" />
      <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  lol: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 12h4M8 10v4" />
      <circle cx="16" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  swimming: () => (
    <svg
      style={iconStyle}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 16c.6.5 1.2 1 2.5 1C7 17 7 15 9.5 15S12 17 14.5 17 17 15 19.5 15c1.3 0 1.9.5 2.5 1" />
      <path d="M2 20c.6.5 1.2 1 2.5 1C7 21 7 19 9.5 19S12 21 14.5 21 17 19 19.5 19c1.3 0 1.9.5 2.5 1" />
      <circle cx="9" cy="8" r="2" />
      <path d="M15 6l-3 4" />
    </svg>
  ),
};

/** Default icon for unknown sports */
const DefaultIcon: React.FC = () => (
  <svg
    style={iconStyle}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 12l3 3 5-5" />
  </svg>
);

export function SportIcon({ sportKey }: { sportKey: string }) {
  const key = sportKey.toLowerCase().replace(/\s+/g, "-");
  const Icon = icons[key] || DefaultIcon;
  return <Icon />;
}

export default SportIcon;
