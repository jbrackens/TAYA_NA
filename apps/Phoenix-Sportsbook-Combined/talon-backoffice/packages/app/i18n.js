// next-i18next v14+ — no class instantiation needed.
// Config lives in next-i18next.config.js; this module re-exports
// the hooks and HOCs that the rest of the codebase imports from "i18n".
const { appWithTranslation, useTranslation } = require("next-i18next");
const i18next = require("i18next");

module.exports = { appWithTranslation, useTranslation, i18n: i18next.default || i18next };
module.exports.default = { appWithTranslation, useTranslation, i18n: i18next.default || i18next };
module.exports.appWithTranslation = appWithTranslation;
module.exports.useTranslation = useTranslation;
module.exports.i18n = i18next.default || i18next;
