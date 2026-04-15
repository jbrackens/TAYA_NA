'use client';

import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './config';

interface I18nProviderProps {
  children: React.ReactNode;
}

/**
 * Wraps the app with the i18next provider.
 *
 * Hydration safety: `ready` MUST start as `false` unconditionally.
 * On the server the fetch-based backend cannot load translations (relative
 * URLs have no origin during SSR), so i18n is never initialised there.
 * If we derived the initial state from `i18n.isInitialized` the client
 * could start with `true` (the module already ran) while the server was
 * `false` — producing a different component tree and a React hydration
 * error.
 *
 * We wait for the `initialized` event, which fires after the INIT_NAMESPACES
 * (common, header, sidebar, footer, landing) have been fetched.  Page-specific
 * namespaces (cashier, betslip, etc.) are loaded lazily by useTranslation().
 */
export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  // Always false on first render — matches the server-rendered HTML.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedLanguage = localStorage.getItem('phoenix_language');

    if (storedLanguage && storedLanguage !== i18n.language) {
      void i18n.changeLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    // i18n may already be fully initialised (module-level init completed
    // before this effect ran).  `isInitialized` is only `true` once every
    // namespace in the `ns` array has been loaded for the current language.
    if (i18n.isInitialized) {
      setReady(true);
      return;
    }

    const markReady = () => setReady(true);
    i18n.on('initialized', markReady);
    return () => {
      i18n.off('initialized', markReady);
    };
  }, []);

  if (!ready) {
    // Render a minimal placeholder that is identical on server and client.
    // The real children (AppShell with sidebar, header, page) render only
    // after every translation namespace is available.
    return <I18nextProvider i18n={i18n}><div /></I18nextProvider>;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default I18nProvider;
