import { RequestHandler } from "express";

export const getLocaleData =
  (
    defaultLocale: string,
    defaultCurrency: string,
    supportedLanguages: string
  ): RequestHandler =>
  async (req, _res, next) => {
    const locale =
      req.params.lang && supportedLanguages.includes(req.params.lang)
        ? req.params.lang
        : defaultLocale;

    const profile = req.profile;
    const locales = req.locales;

    const actualLocale =
      profile?.LanguageISO.toLowerCase() || locale.toLowerCase();
    const actualCurrency =
      profile?.CurrencyISO.toUpperCase() || defaultCurrency.toUpperCase();
    const messages = locales ? locales[actualLocale][actualCurrency] : {};

    req.intl = {
      locale: actualLocale,
      messages
    };

    next();
  };
