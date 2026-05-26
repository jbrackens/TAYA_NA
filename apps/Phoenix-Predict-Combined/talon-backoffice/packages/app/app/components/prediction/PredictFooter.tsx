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
    <footer className="flex flex-col gap-2 border-t border-[var(--border-1)] px-6 py-4 text-xs text-[var(--t3)]">
      <div className="flex flex-wrap gap-4">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-[var(--t3)] no-underline"
          >
            {l.label}
          </Link>
        ))}
      </div>
      <div className="opacity-70">
        <span className="font-bold text-[var(--t1)]">
          Hula <span className="text-[var(--accent)]">Na!</span>
        </span>
        {" · "}© {YEAR} DORA Research, Inc.
        {" · "}Trade event contracts, not sports bets
      </div>
    </footer>
  );
}
