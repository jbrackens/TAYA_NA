"use client";

/**
 * PredictFooter — legal and info links for the prediction platform.
 *
 * Replaces Footer (which referenced sportsbook pages like betting-rules and
 * bonus-rules). This footer links only to pages that still exist on the
 * prediction site: About, Terms, Privacy, Responsible Gaming, Contact.
 */

import Link from "next/link";

const YEAR = new Date().getFullYear();

export function PredictFooter() {
  return (
    <footer className="border-t border-gray-800 bg-black/60 mt-12">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-xs text-gray-500">
          © {YEAR} TAYA NA Predict. Trade event contracts, not sports bets.
        </div>
        <nav className="flex flex-wrap gap-4 text-xs text-gray-400">
          <Link href="/about" className="hover:text-white">
            About
          </Link>
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
          <Link href="/responsible-gaming" className="hover:text-white">
            Responsible Gaming
          </Link>
          <Link href="/contact-us" className="hover:text-white">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
