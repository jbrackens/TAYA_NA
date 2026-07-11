"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

/**
 * P10 boot-path fix (2026-07-12): the English strings for the render-
 * critical namespaces are BUNDLED at build time (static JSON imports,
 * ~56KB raw / ~13KB gzipped) so i18next initialises synchronously on
 * both server and client. Before this, the app SSR'd a blank <div/>
 * on every route while 11 namespace fetches resolved — first paint
 * was blocked behind JS boot + network. Non-English languages and the
 * long-tail namespaces still lazy-load through the fetch backend.
 */
import enCommon from "../../../public/static/locales/en/common.json";
import enHeader from "../../../public/static/locales/en/header.json";
import enSidebar from "../../../public/static/locales/en/sidebar.json";
import enFooter from "../../../public/static/locales/en/footer.json";
import enAccount from "../../../public/static/locales/en/account.json";
import enSettings from "../../../public/static/locales/en/settings.json";
import enRewards from "../../../public/static/locales/en/rewards.json";
import enPortfolio from "../../../public/static/locales/en/portfolio.json";
import enLeaderboards from "../../../public/static/locales/en/leaderboards.json";
import enPrediction from "../../../public/static/locales/en/prediction.json";
import enMarketContent from "../../../public/static/locales/en/market-content.json";

const EN_BUNDLED_RESOURCES = {
  common: enCommon,
  header: enHeader,
  sidebar: enSidebar,
  footer: enFooter,
  account: enAccount,
  settings: enSettings,
  rewards: enRewards,
  portfolio: enPortfolio,
  leaderboards: enLeaderboards,
  prediction: enPrediction,
  "market-content": enMarketContent,
} as const;

/**
 * All available translation namespaces.
 * These correspond to JSON files under /public/static/locales/{lng}/<ns>.json
 */
const NAMESPACES = [
  "common",
  "header",
  "sidebar",
  "footer",
  "login",
  "register",
  "account",
  "portfolio",
  "leaderboards",
  "account-status-bar",
  "settings",
  "limits",
  "responsible-gaming",
  "self-exclude",
  "idle-activity",
  "session-timer",
  "language-selector",
  "api-errors",
  "error-component",
  "page-home",
  "page-about",
  "page-terms",
  "page-privacy-policy",
  "notifications",
  "transactions",
  "security",
  "personal-details",
  "rewards",
  "bonus",
  "content",
  "prediction",
  "market-content",
];

const SUPPORTED_LANGUAGES = ["en", "zh-Hans", "zh-Hant", "tl", "ms", "id"];

/**
 * Dynamically load a namespace JSON from the public folder.
 * Works with Next.js public static file serving.
 */
const loadNamespace = async (
  lng: string,
  ns: string,
): Promise<Record<string, string>> => {
  try {
    const res = await fetch(`/static/locales/${lng}/${ns}.json`);
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
};

// Custom backend plugin for i18next that loads from /public/static/locales/
const fetchBackend = {
  type: "backend" as const,
  init: () => {},
  read: (
    lng: string,
    ns: string,
    callback: (err: Error | null, data: Record<string, string> | null) => void,
  ) => {
    loadNamespace(lng, ns)
      .then((data) => callback(null, data))
      .catch((err) =>
        callback(err instanceof Error ? err : new Error(String(err)), null),
      );
  },
};

/**
 * Critical namespaces loaded at init (blocks render).
 * Page-specific namespaces are loaded on demand by useTranslation().
 */
const INIT_NAMESPACES = [
  "common",
  "header",
  "sidebar",
  "footer",
  "account",
  "settings",
  "rewards",
  "portfolio",
  "leaderboards",
  "prediction",
  "market-content",
];

// Only initialize once. With `resources` supplied for English, init is
// SYNCHRONOUS — isInitialized is true before the first render on both
// server and client (no blank-shell gate, no hydration divergence).
// partialBundledLanguages keeps the fetch backend active for the other
// languages and for namespaces outside the bundled set.
if (!i18n.isInitialized) {
  void i18n
    .use(fetchBackend)
    .use(initReactI18next)
    .init({
      lng: "en",
      fallbackLng: "en",
      load: "currentOnly",
      supportedLngs: SUPPORTED_LANGUAGES,
      ns: INIT_NAMESPACES,
      defaultNS: "common",
      resources: { en: EN_BUNDLED_RESOURCES },
      partialBundledLanguages: true,
      interpolation: {
        escapeValue: false, // React handles XSS
      },
      react: {
        useSuspense: false, // Don't suspend — show keys as fallback
      },
    });
}

export { SUPPORTED_LANGUAGES, NAMESPACES };
export default i18n;
