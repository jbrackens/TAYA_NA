const config = require("./../../jest.config");
const path = require("path");

module.exports = {
  ...config,
  silent: false,
  setupFiles: [path.join(__dirname, "./setupTests.ts")],
  preset: "ts-jest",
};
