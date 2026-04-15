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
    // Legacy components/ and services/ tests: babel-jest + TS5 incompatible
    // (SyntaxError on `as jest.Mock`, `interface`, type annotations).
    // All legacy tests use patterns that require @babel/plugin-transform-typescript
    // which is not configured. New tests use node:test runner, not jest.
    "components/",
    "services/",
    // app/__tests__/ tests use node:test / node:assert — run via `node --test`
    "app/__tests__/",
  ],
  // jest 25 can't resolve node: protocol imports used by next-i18next's
  // i18next-fs-backend. Mock next-i18next to avoid loading the real backend.
  moduleNameMapper: {
    "^next-i18next$": path.join(__dirname, "__mocks__/next-i18next.js"),
  },
};
