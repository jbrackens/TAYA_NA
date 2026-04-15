'use client';

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * All available translation namespaces.
 * These correspond to JSON files under /public/static/locales/{lng}/<ns>.json
 */
const NAMESPACES = [
  'common', 'header', 'landing', 'sidebar', 'footer', 'betslip', 'bet-button', 'bet-history',
  'cashier', 'login', 'register', 'account', 'account-status-bar', 'settings',
  'limits', 'deposit-limits', 'responsible-gaming', 'self-exclude', 'idle-activity',
  'session-timer', 'fixture', 'fixture-list', 'language-selector', 'api-errors',
  'error-component', 'page-home', 'page-about', 'page-terms', 'page-privacy-policy',
  'page-betting-rules', 'notifications', 'transactions', 'security', 'personal-details',
  'rewards', 'bet-analytics', 'home',
];

const SUPPORTED_LANGUAGES = ['en', 'de'];

/**
 * Dynamically load a namespace JSON from the public folder.
 * Works with Next.js public static file serving.
 */
const loadNamespace = async (lng: string, ns: string): Promise<Record<string, string>> => {
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
  type: 'backend' as const,
  init: () => {},
  read: (lng: string, ns: string, callback: (err: Error | null, data: Record<string, string> | null) => void) => {
    loadNamespace(lng, ns)
      .then((data) => callback(null, data))
      .catch((err) => callback(err instanceof Error ? err : new Error(String(err)), null));
  },
};

/**
 * Critical namespaces loaded at init (blocks render).
 * Page-specific namespaces are loaded on demand by useTranslation().
 */
const INIT_NAMESPACES = ['common', 'header', 'sidebar', 'footer', 'landing'];

// Only initialize once
if (!i18n.isInitialized) {
  i18n
    .use(fetchBackend)
    .use(initReactI18next)
    .init({
      lng: 'en',
      fallbackLng: 'en',
      supportedLngs: SUPPORTED_LANGUAGES,
      ns: INIT_NAMESPACES,
      defaultNS: 'common',
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
