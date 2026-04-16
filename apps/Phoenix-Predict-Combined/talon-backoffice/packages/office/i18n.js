// next-i18next v14+ — no class instantiation needed.
// Config lives in next-i18next.config.js; this module re-exports
// the hooks and HOCs that the rest of the codebase imports from "i18n".
const { appWithTranslation, useTranslation } = require("next-i18next");
const nextI18NextConfig = require("./next-i18next.config.js");

// Wrap appWithTranslation to always pass the explicit config,
// ensuring translations load even without serverSideTranslations per page.
const wrappedAppWithTranslation = (App) =>
  appWithTranslation(App, nextI18NextConfig);

module.exports = { appWithTranslation: wrappedAppWithTranslation, useTranslation };
module.exports.default = { appWithTranslation: wrappedAppWithTranslation, useTranslation };
module.exports.appWithTranslation = wrappedAppWithTranslation;
module.exports.useTranslation = useTranslation;
