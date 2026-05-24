"use client";

import { Globe2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  defaultLocale,
  legacyLocaleStorageKey,
  localeStorageKey,
  normalizeLocale,
  supportedLocales,
  type SupportedLocale,
} from "../../lib/i18n/locales";

type LanguageSelectorProps = {
  source: "header" | "mobile_menu" | "settings";
};

function getStoredLocale(): SupportedLocale {
  if (typeof window === "undefined") return defaultLocale;
  return normalizeLocale(
    window.localStorage.getItem(localeStorageKey) ||
      window.localStorage.getItem(legacyLocaleStorageKey),
  );
}

function persistLocale(locale: SupportedLocale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localeStorageKey, locale);
  window.localStorage.setItem(legacyLocaleStorageKey, locale);
  document.cookie = `${localeStorageKey}=${encodeURIComponent(locale)}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function trackLanguageEvent(event: string, properties: Record<string, string>) {
  if (typeof window === "undefined") return;
  const dataLayer = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
  if (Array.isArray(dataLayer)) {
    dataLayer.push({ event, ...properties });
  }
}

export function LanguageSelector({ source }: LanguageSelectorProps) {
  const { t, i18n } = useTranslation("language-selector");
  const [locale, setLocale] = useState<SupportedLocale>(() => getStoredLocale());

  useEffect(() => {
    const nextLocale = getStoredLocale();
    setLocale(nextLocale);
    if (i18n.language !== nextLocale) {
      void i18n.changeLanguage(nextLocale);
    }
  }, [i18n]);

  const currentLabel = useMemo(
    () => supportedLocales.find((item) => item.code === locale)?.label ?? "English",
    [locale],
  );

  return (
    <label className="lang-select-wrap" title={t("SELECT_LANGUAGE")}>
      <Globe2 size={15} aria-hidden="true" />
      <span className="sr-only">{t("SELECT_LANGUAGE")}</span>
      <select
        className="lang-select"
        aria-label={t("SELECT_LANGUAGE")}
        value={locale}
        onFocus={() => trackLanguageEvent("language_selector_opened", { source })}
        onChange={(event) => {
          const previousLocale = locale;
          const newLocale = normalizeLocale(event.target.value);
          setLocale(newLocale);
          persistLocale(newLocale);
          void i18n.changeLanguage(newLocale);
          trackLanguageEvent("language_changed", {
            previousLocale,
            newLocale,
            source,
          });
        }}
      >
        {supportedLocales.map((item) => (
          <option key={item.code} value={item.code}>
            {item.label}
          </option>
        ))}
      </select>
      <span className="lang-current" aria-hidden="true">
        {currentLabel}
      </span>
    </label>
  );
}
