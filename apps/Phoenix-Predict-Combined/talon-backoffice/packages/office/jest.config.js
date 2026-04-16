const config = require("./../../jest.config");
const path = require("path");

module.exports = {
  ...config,
  silent: false,
  roots: [path.join(__dirname)],
  setupFiles: [path.join(__dirname, "./setupTests.ts")],
  transform: {
    "^.+\\.[jt]sx?$": ["babel-jest", {
      configFile: path.join(__dirname, ".babelrc.jest.js"),
    }],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@phoenix-ui)/)",
  ],
  moduleDirectories: ["node_modules", __dirname],
};
