module.exports = {
  modulePathIgnorePatterns: ["<rootDir>/config/"],
  transformIgnorePatterns: ["/node_modules/(?!axios)/"],
  moduleNameMapper: {
    "^i18n$": "<rootDir>/packages/app-core/i18n.js",
  },
  verbose: false,
  silent: true,
};
