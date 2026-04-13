'use client';

import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './config';

interface I18nProviderProps {
  children: React.ReactNode;
}

/**
 * Wraps the app with the i18next provider.
 * Waits for translations to load before rendering children,
 * preventing the flash of raw i18n keys (e.g. "HERO_KICKER").
 */
export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [ready, setReady] = useState(i18n.isInitialized && i18n.hasLoadedNamespace('common'));

  useEffect(() => {
    const storedLanguage =
      typeof window !== 'undefined'
        ? localStorage.getItem('phoenix_language')
        : null;

    if (storedLanguage && storedLanguage !== i18n.language) {
      void i18n.changeLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    if (ready) return;

    // Wait for i18next to finish loading initial namespaces
    const onInit = () => setReady(true);
    if (i18n.isInitialized && i18n.hasLoadedNamespace('common')) {
      setReady(true);
      return;
    }
    i18n.on('initialized', onInit);
    i18n.on('loaded', onInit);
    return () => {
      i18n.off('initialized', onInit);
      i18n.off('loaded', onInit);
    };
  }, [ready]);

  if (!ready) {
    // Render nothing while translations load — prevents key flash.
    // The app shell (sidebar, header) is still rendered by the layout
    // since I18nProvider wraps inside the visual shell.
    return <I18nextProvider i18n={i18n}><div /></I18nextProvider>;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default I18nProvider;
