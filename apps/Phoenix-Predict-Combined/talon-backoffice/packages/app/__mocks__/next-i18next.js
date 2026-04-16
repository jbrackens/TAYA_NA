// Jest mock for next-i18next — avoids loading i18next-fs-backend
// which requires node:fs (unsupported in jest 25).
const useTranslation = () => ({
  t: (key) => key,
  i18n: { language: "en", changeLanguage: () => Promise.resolve() },
});

const appWithTranslation = (Component) => Component;
const withTranslation = () => (Component) => Component;
const Trans = ({ children }) => children;

module.exports = { appWithTranslation, useTranslation, withTranslation, Trans };
