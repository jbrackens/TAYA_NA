"use client";

/**
 * PredictFooter — the ink anchor (P9.4, 2026-07-07).
 *
 * Every page ends on one deliberate deep-forest statement: the brand
 * surface the P9 white system otherwise never spends. The inverse Tap Path
 * lockup, quiet ivory links, and legal line sit under a hairline.
 * This is a brand-layer surface (DESIGN.md Active Brand) — market data
 * never renders on ink.
 */

import Link from "next/link";
import { FEATURE_RG } from "../../lib/features";
import { brand } from "../../lib/brand";
import BrandMark from "../BrandMark";

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
    <footer className="mt-10 rounded-[var(--r-rh-lg)] bg-[var(--brand-ink)] px-7 py-6 text-xs max-[640px]:px-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2.5 text-[19px] font-semibold leading-none tracking-[-0.025em] text-[var(--brand-on-dark)]">
          <BrandMark size={28} tone="light" />
          <span>{brand.name}</span>
        </span>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="font-medium text-[rgba(241,236,227,0.72)] no-underline transition-colors duration-[120ms] hover:text-[var(--brand-on-dark)]"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-5 border-t border-[rgba(241,236,227,0.14)] pt-4 text-[rgba(241,236,227,0.55)]">
        <span className="font-bold text-[rgba(241,236,227,0.85)]">
          {brand.name}
        </span>
        {" · "}© {YEAR} {brand.legalEntity}
        {" · "}Non-redeemable point prediction markets
      </div>
    </footer>
  );
}
