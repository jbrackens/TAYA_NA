/** @type {import('next-i18next').UserConfig} */
const translationsBundle = require("./translations-bundle.js");

module.exports = {
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  localePath: "./public/static/locales",
  reloadOnPrerender: process.env.NODE_ENV === "development",
  resources: translationsBundle,
  ns: Object.keys(translationsBundle.en),
  defaultNS: "common",
  partialBundledLanguages: true,
  interpolation: {
    escapeValue: false,
  },
};
