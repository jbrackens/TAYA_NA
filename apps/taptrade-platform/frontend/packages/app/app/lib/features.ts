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
 * Out of scope of this flag: KYC (FEATURE_KYC) and point-use/session
 * limits. Those are tracked separately.
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
 * Out of scope of this flag: point-use/prediction/session limits (those are
 * user-set play caps that stand alone), responsible-play
 * tooling (FEATURE_RG).
 */
export const FEATURE_KYC = process.env.NEXT_PUBLIC_FEATURE_KYC === "true";

/**
 * User-facing play-limit tooling: point-use / prediction / session limits
 * UI on /profile/'s Limits tab. Off by default. Turn on for jurisdictional
 * deploys that require self-imposed spending caps (UK, regulated US sports
 * + prediction markets like Kalshi). Off for offshore-style deploys
 * (Polymarket-style) where users trade without limit-setting tools.
 *
 * Currently gates: the "Limits" tab on /profile/ (filtered out of the
 * tab navigation when off) and its panel content.
 *
 * Out of scope of this flag:
 *   - getLimitsHistory called from /account/rg-history/ — that page is
 *     already gated by FEATURE_RG.
 */
export const FEATURE_LIMITS = process.env.NEXT_PUBLIC_FEATURE_LIMITS === "true";

/**
 * Community chat surface. Off by default until the Rocket.Chat feasibility
 * spike proves iframe/session/cookie behavior and moderation controls.
 */
export const FEATURE_CHAT = process.env.NEXT_PUBLIC_FEATURE_CHAT === "true";

export const CHAT_PUBLIC_URL = (
  process.env.NEXT_PUBLIC_CHAT_PUBLIC_URL || ""
).replace(/\/$/, "");

/**
 * Social OAuth entry points. Off by default because the buttons are only safe
 * to show when provider client IDs/secrets and redirect URIs are configured
 * for the current deploy. Otherwise users hit visible 400s from /oauth/start.
 */
export const FEATURE_SOCIAL_AUTH =
  process.env.NEXT_PUBLIC_FEATURE_SOCIAL_AUTH === "true";

/**
 * Dedicated live/in-play markets surface. Off by default while private
 * provider access and event-data coverage are still being finalized.
 *
 * Currently gates: the /live/ route content and Live nav entries.
 */
export const FEATURE_LIVE_MARKETS =
  process.env.NEXT_PUBLIC_FEATURE_LIVE_MARKETS === "true";

/**
 * Demo-only synthetic chart fallback. When on, MarketChart falls back to a
 * deterministic seeded walk while price history is loading, failed, or has
 * no movement — the pre-launch behavior that keeps the seeded demo box
 * pretty. Off by default: real deploys show honest loading / error / empty
 * chart states instead of fabricated price movement.
 */
export const DEMO_SYNTHETIC_CHARTS =
  process.env.NEXT_PUBLIC_DEMO_SYNTHETIC_CHARTS === "true";

/**
 * Optional ambient video layer behind the landing-page hero scrim.
 * Value is a public asset path (e.g. "/brand/hero-ambient.mp4"); empty
 * string (default) renders no video element at all — the drawn chart
 * composition is the base hero and remains the fallback for reduced
 * motion, no-JS, and slow connections.
 *
 * Asset requirements + direction brief: docs/hero-ambient-video.md.
 * Footage must contain no readable text, signage, or screens — the
 * product layer stays code-drawn on top.
 */
export const HERO_AMBIENT_VIDEO =
  process.env.NEXT_PUBLIC_HERO_AMBIENT_VIDEO || "";
