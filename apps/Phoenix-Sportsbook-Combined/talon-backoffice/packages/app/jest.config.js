const config = require("./../../jest.config");
const path = require("path");

module.exports = {
  ...config,
  testPathIgnorePatterns: [
    "/node_modules/",
    // These tests use node:test / node:assert — run via `node --test`, not jest
    "app/__tests__/odds\\.test\\.ts",
    "app/__tests__/api-client\\.test\\.ts",
    "app/__tests__/websocket-handlers\\.test\\.ts",
    "app/__tests__/events-client\\.test\\.ts",
    // Enzyme tests fail: parse5-parser-stream requires node:stream (jest 25 incompatible)
    "components/layout/betslip/__tests__/",
    "components/layout/fixture-list/__tests__/",
    "components/auth/session-timer/__tests__/",
    "components/auth/idle-activity/__tests__/",
    "components/profile/deposit/__tests__/",
  ],
  // jest 25 can't resolve node: protocol imports used by next-i18next's
  // i18next-fs-backend. Mock next-i18next to avoid loading the real backend.
  moduleNameMapper: {
    "^next-i18next$": path.join(__dirname, "__mocks__/next-i18next.js"),
  },
};
