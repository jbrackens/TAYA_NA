/**
 * Build-time feature flags.
 *
 * Each flag is a simple boolean derived from a `NEXT_PUBLIC_FEATURE_*`
 * environment variable. Next.js inlines these into the client bundle at
 * build time, so the value is fixed for a given deploy. Default is off —
 * a deploy must set the matching env var to `"true"` to enable the flag.
 *
 * To set a flag, add it to `.env.local` / `.env.development` /
 * `.env.staging` / `.env.production` for that deploy:
 *
 *   NEXT_PUBLIC_FEATURE_RG=true
 *
 * Usage to gate a route (returns 404 when off):
 *
 *   import { notFound } from "next/navigation";
 *   import { FEATURE_RG } from "../../lib/features";
 *   if (!FEATURE_RG) notFound();
 *
 * Usage to hide a UI element (renders nothing when off):
 *
 *   {FEATURE_RG && <Link href="/responsible-gaming">Responsible Gaming</Link>}
 */

/**
 * Responsible-gambling features: self-exclusion, cool-off, RG history,
 * the /responsible-gaming/ informational page, and any UI entry point
 * that links to them. Off by default. Turn on for jurisdictional deploys
 * that legally require RG tooling (e.g. UK, regulated US sports-betting).
 *
 * Out of scope of this flag: KYC (FEATURE_KYC), deposit/stake/session
 * limits, cashier. Those are tracked separately.
 */
export const FEATURE_RG = process.env.NEXT_PUBLIC_FEATURE_RG === "true";

/**
 * KYC / identity verification surface. Off by default. Turn on for
 * jurisdictional deploys that legally require KYC (e.g. regulated US
 * prediction markets like Kalshi). Off for offshore-style deploys
 * (Polymarket-style) where users trade pseudonymously.
 *
 * Currently gates: the "Identity Verification (KYC)" row and "Complete
 * Verification" CTA on /profile/. Email and phone verification rows are
 * NOT gated — those are sensible regardless of jurisdiction.
 *
 * Out of scope of this flag: deposit/stake/session limits (those are
 * "user-set spending caps" that stand alone), responsible-gambling
 * tooling (FEATURE_RG).
 */
export const FEATURE_KYC = process.env.NEXT_PUBLIC_FEATURE_KYC === "true";

/**
 * User-facing spending-limit tooling: the deposit / stake / session limits
 * UI on /profile/'s Limits tab. Off by default. Turn on for jurisdictional
 * deploys that require self-imposed spending caps (UK, regulated US sports
 * + prediction markets like Kalshi). Off for offshore-style deploys
 * (Polymarket-style) where users trade without limit-setting tools.
 *
 * Currently gates: the "Limits" tab on /profile/ (filtered out of the
 * tab navigation when off) and its panel content.
 *
 * Out of scope of this flag:
 *   - The /cashier/ deposit/withdraw flow itself — that ships regardless.
 *   - Server-side AML threshold checks (getMonthlyDepositTotal) — those
 *     are not user-set and stay always-on.
 *   - getLimitsHistory called from /account/rg-history/ — that page is
 *     already gated by FEATURE_RG.
 */
export const FEATURE_LIMITS = process.env.NEXT_PUBLIC_FEATURE_LIMITS === "true";

/**
 * FEATURE_CMS gates the CMS-driven static-page fetch in
 * `app/components/ContentPage.tsx`. When OFF (default), the
 * ContentPageRenderer skips its `/api/v1/content/{slug}` GET and
 * renders the caller's fallbackContent immediately. When ON, the
 * renderer hits the CMS API and falls back to fallbackContent only
 * on error.
 *
 * The default is OFF because the CMS backend isn't populated for
 * the prediction platform yet — every /api/v1/content/{slug} call
 * was returning 404, polluting the console with one error per
 * static page load (about, terms, privacy, contact-us, etc.).
 *
 * Flip to "true" via NEXT_PUBLIC_FEATURE_CMS=true once the CMS
 * is wired and content slugs exist.
 */
export const FEATURE_CMS = process.env.NEXT_PUBLIC_FEATURE_CMS === "true";
