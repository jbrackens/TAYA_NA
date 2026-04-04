const withTM = require("next-transpile-modules")(["ui"]);

module.exports = withTM({
  reactStrictMode: true,
  experimental: {
    externalDir: true,
  },
  publicRuntimeConfig: {
    API_GLOBAL_ENDPOINT: process.env.API_GLOBAL_ENDPOINT,
  },
});
