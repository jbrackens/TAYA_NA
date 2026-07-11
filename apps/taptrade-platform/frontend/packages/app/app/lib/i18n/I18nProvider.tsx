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
 * P10 (2026-07-12): English boot namespaces are bundled into the init
 * (see config.ts), so i18next initialises SYNCHRONOUSLY on both server
 * and client — the old `ready` gate that SSR'd an empty <div/> until 11
 * namespace fetches finished is gone, and every route now server-renders
 * real content. A stored non-English language is applied post-hydration;
 * users on those locales see one English-first paint (documented
 * trade-off — the alternative was a blank first paint for everyone).
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
