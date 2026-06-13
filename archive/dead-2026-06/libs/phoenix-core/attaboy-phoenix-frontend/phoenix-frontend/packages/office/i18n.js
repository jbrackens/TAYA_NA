const NextI18Next = require("next-i18next").default;
const {
  localeSubpaths,
  env,
} = require("next/config").default().publicRuntimeConfig;
const path = require("path");

const nexti18next = new NextI18Next({
  defaultLanguage: "en",
  shallowRender: true,
  browserLanguageDetection: true,
  serverLanguageDetection: false,
  localePath: path.resolve("./public/static/locales"),
  localeSubpaths,
});

const { i18n } = nexti18next;

if (env !== "production") {
  if (process.browser) {
    const { applyClientHMR } = require("i18next-hmr/client");
    applyClientHMR(i18n);
  } else {
    const { applyServerHMR } = require("i18next-hmr/server");
    applyServerHMR(i18n);
  }
}

module.exports = nexti18next;
