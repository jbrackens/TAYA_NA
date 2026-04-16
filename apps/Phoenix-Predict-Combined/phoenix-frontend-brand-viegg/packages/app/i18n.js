const NextI18Next = require("next-i18next").default;
const { localeSubpaths } = require("next/config").default().publicRuntimeConfig;
const path = require("path");

module.exports = new NextI18Next({
  defaultLanguage: "en",
  shallowRender: true,
  otherLanguages: ["de"],
  browserLanguageDetection: true,
  serverLanguageDetection: false,
  localePath: path.resolve("./public/static/locales"),
  localeSubpaths,
});
