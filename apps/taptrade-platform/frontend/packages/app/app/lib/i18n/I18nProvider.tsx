"use client";

import React, { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "./config";
import {
  legacyLocaleStorageKey,
  localeStorageKey,
  normalizeLocale,
} from "./locales";

interface I18nProviderProps {
  children: React.ReactNode;
}

/**
 * Wraps the app with the i18next provider.
 *
 * P12 perf (2026-07-12): children render IMMEDIATELY. The English init
 * namespaces are bundled into the JS at build time (see config.ts), so
 * i18n initialises synchronously during module evaluation on both the
 * server and the client — there is no async init to wait for and no
 * hydration hazard: both passes render the same English tree.
 *
 * Previously this component returned an empty <div/> until a client-side
 * fetch of 11 namespace JSONs completed, which blanked EVERY route's first
 * paint behind a network waterfall and defeated SSR entirely.
 *
 * Non-EN locales: the stored locale is applied in an effect below.
 * changeLanguage() lazy-loads that locale's namespaces via the fetch
 * backend and re-renders when they arrive. A returning non-EN user
 * therefore sees a brief flash of English before their language applies —
 * an accepted tradeoff versus the old behaviour (a blank screen for ALL
 * users, EN included, on every cold load).
 */
export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  useEffect(() => {
    const storedLanguage = normalizeLocale(
      localStorage.getItem(localeStorageKey) ||
        localStorage.getItem(legacyLocaleStorageKey),
    );

    if (storedLanguage && storedLanguage !== i18n.language) {
      void i18n.changeLanguage(storedLanguage);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default I18nProvider;
