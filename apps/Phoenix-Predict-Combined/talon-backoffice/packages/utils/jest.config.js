const config = require("./../../jest.config");
const path = require("path");

module.exports = {
  ...config,
  silent: false,
  setupFiles: [path.join(__dirname, "./setupTests.ts")],
  preset: "ts-jest",
  testPathIgnorePatterns: [
    "/node_modules/",
    // api-service.test.ts fails due to ts-jest 24 / TypeScript 5 incompatibility
    // (ts.getMutableClone removed in TS 5). Re-enable after upgrading ts-jest.
    "api/__tests__/api-service\\.test\\.ts",
  ],
};
