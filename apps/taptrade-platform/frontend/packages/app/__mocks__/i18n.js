// Jest mock for i18n.js — avoids loading next-i18next which pulls in
// i18next-fs-backend (requires node:fs, unsupported in jest 25).
const useTranslation = () => ({
  t: (key) => key,
  i18n: { language: "en", changeLanguage: () => Promise.resolve() },
});

const appWithTranslation = (Component) => Component;

module.exports = {
  appWithTranslation,
  useTranslation,
  i18n: { language: "en" },
};
module.exports.default = module.exports;
module.exports.appWithTranslation = appWithTranslation;
module.exports.useTranslation = useTranslation;
module.exports.i18n = { language: "en" };
