"use client";

/**
 * PredictFooter — legal and info links.
 *
 * Intentionally minimal — most of the visual weight lives in .ps-topbar and
 * .ps-sidebar. This bar just sits at the bottom of the page with the brand,
 * copyright, and legal/info links.
 */

import Link from "next/link";

const YEAR = new Date().getFullYear();

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/responsible-gaming", label: "Responsible Gaming" },
  { href: "/contact-us", label: "Contact" },
];

export function PredictFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid #1a1f3a",
        padding: "16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontSize: 12,
        color: "#D3D3D3",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{ color: "#D3D3D3", textDecoration: "none" }}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div style={{ opacity: 0.7 }}>
        <span style={{ color: "#f8fafc", fontWeight: 700 }}>
          TAYA <span style={{ color: "var(--accent)" }}>Predict</span>
        </span>
        {" · "}© {YEAR}
        {" · "}Trade event contracts, not sports bets
      </div>
    </footer>
  );
}
