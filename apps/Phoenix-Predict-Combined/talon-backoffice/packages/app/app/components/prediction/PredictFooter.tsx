"use client";

/**
 * PredictFooter — legal and info links.
 *
 * Intentionally minimal — most of the visual weight lives in .ps-topbar and
 * .ps-sidebar. This bar just sits at the bottom of the page with the brand,
 * copyright, and legal/info links.
 */

import Link from "next/link";
import { FEATURE_RG } from "../../lib/features";

const YEAR = new Date().getFullYear();

const LINKS = [
  { href: "/about", label: "About" },
  { href: "/tos", label: "Terms of Use" },
  { href: "/privacy", label: "Privacy" },
  ...(FEATURE_RG
    ? [{ href: "/responsible-gaming", label: "Responsible Gaming" }]
    : []),
  { href: "/contact-us", label: "Contact" },
];

export function PredictFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-1)",
        padding: "16px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        fontSize: 12,
        color: "var(--t3)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            style={{ color: "var(--t3)", textDecoration: "none" }}
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div style={{ opacity: 0.7 }}>
        <span style={{ color: "var(--t1)", fontWeight: 700 }}>
          Hula <span style={{ color: "var(--accent)" }}>Na!</span>
        </span>
        {" · "}© {YEAR} DORA Research, Inc.
        {" · "}Trade event contracts, not sports bets
      </div>
    </footer>
  );
}
