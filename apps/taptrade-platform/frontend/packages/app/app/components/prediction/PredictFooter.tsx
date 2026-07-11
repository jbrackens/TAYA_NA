"use client";

/**
 * PredictFooter — the ink anchor (P9.4) + the fair-play block (P10).
 *
 * Every page ends on one deliberate deep-forest statement: the brand
 * surface the white system otherwise never spends. Ivory wordmark with
 * the mint period, quiet ivory links, legal line under a hairline.
 * This is a brand-layer surface (DESIGN.md Active Brand) — market data
 * never renders on ink.
 *
 * P10 safety-discoverability invariant (2026-07-12): entry points to
 * player controls — notification preferences, play limits, self-
 * exclusion, support — are ALWAYS present here, on every deploy. The
 * jurisdiction feature flags still gate the page content (a deploy
 * without RG tooling routes those links to the points disclosure on
 * /about instead of a 404), but discoverability of controls never
 * disappears: safety must be at least as findable as the trade button.
 */

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { FEATURE_RG, FEATURE_LIMITS } from "../../lib/features";
import { brand } from "../../lib/brand";
import BrandWordmark from "../BrandWordmark";

const YEAR = new Date().getFullYear();

const FOOTER_LINK_CLASS =
  "font-medium text-[rgba(241,236,227,0.72)] no-underline transition-colors duration-[120ms] hover:text-[var(--brand-on-dark)]";
const FOOTER_HEAD_CLASS =
  "mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(241,236,227,0.45)]";
const FOOTER_COL_CLASS = "flex min-w-[140px] flex-col gap-2";

export function PredictFooter() {
  const { t } = useTranslation("footer");

  const productLinks = [
    { href: "/about", label: t("ABOUT", "About") },
    { href: "/tos", label: t("TERMS", "Terms of Use") },
    { href: "/privacy", label: t("PRIVACY", "Privacy") },
    { href: "/contact-us", label: t("CONTACT", "Contact") },
  ];

  // Fair play & controls: page targets adapt to the deploy's flags, the
  // entries themselves never disappear.
  const safetyLinks = [
    {
      href: "/account/notifications",
      label: t("NOTIFICATION_SETTINGS", "Notification settings"),
    },
    FEATURE_LIMITS
      ? { href: "/profile?tab=limits", label: t("PLAY_LIMITS", "Play limits") }
      : {
          href: "/about#fair-play",
          label: t("PLAY_LIMITS", "Play limits"),
        },
    FEATURE_RG
      ? {
          href: "/account/self-exclude",
          label: t("TAKE_A_BREAK", "Take a break / self-exclude"),
        }
      : {
          href: "/about#fair-play",
          label: t("TAKE_A_BREAK", "Take a break / self-exclude"),
        },
    { href: "/contact-us", label: t("SUPPORT", "Support") },
    {
      href: "/account/settings",
      label: t("ACCOUNT_CLOSURE", "Close account"),
    },
  ];

  return (
    <footer className="mt-10 rounded-[var(--r-rh-lg)] bg-[var(--brand-ink)] px-7 py-6 text-xs max-[640px]:px-5">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
        <BrandWordmark
          height={18}
          label={brand.name}
          className="mt-0.5 text-[var(--brand-on-dark)] [--brand-period:var(--brand-period-dark)]"
        />
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          <nav
            className={FOOTER_COL_CLASS}
            aria-label={t("PRODUCT", "Product")}
          >
            <span className={FOOTER_HEAD_CLASS}>{t("PRODUCT", "Product")}</span>
            {productLinks.map((l) => (
              <Link key={l.href} href={l.href} className={FOOTER_LINK_CLASS}>
                {l.label}
              </Link>
            ))}
          </nav>
          <nav
            className={FOOTER_COL_CLASS}
            aria-label={t("FAIR_PLAY", "Fair play & controls")}
          >
            <span className={FOOTER_HEAD_CLASS}>
              {t("FAIR_PLAY", "Fair play & controls")}
            </span>
            {safetyLinks.map((l) => (
              <Link key={l.label} href={l.href} className={FOOTER_LINK_CLASS}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="mt-5 border-t border-[rgba(241,236,227,0.14)] pt-4 text-[rgba(241,236,227,0.55)]">
        <span className="font-bold text-[rgba(241,236,227,0.85)]">
          {brand.name}
        </span>
        {" · "}© {YEAR} {brand.legalEntity}
        {" · "}
        {t(
          "POINTS_DISCLOSURE",
          "Non-redeemable point prediction markets — play points have no cash value, cannot be deposited or withdrawn, and this platform is not registered with any financial regulator.",
        )}
      </div>
    </footer>
  );
}
