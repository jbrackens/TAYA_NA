const path = require("path");

const { I18NextHMRPlugin } = require("i18next-hmr/plugin");
const { nextI18NextRewrites } = require("next-i18next/rewrites");

const localeSubpaths = {};

const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

module.exports = {
  rewrites: async () => nextI18NextRewrites(localeSubpaths),
  publicRuntimeConfig: {
    API_GLOBAL_ENDPOINT: process.env.API_GLOBAL_ENDPOINT,
    WS_GLOBAL_ENDPOINT: process.env.WS_GLOBAL_ENDPOINT,
    SHOW_FOR_SUBMISSION: process.env.SHOW_FOR_SUBMISSION,
    GEOCOMPLY_ENV: process.env.GEOCOMPLY_ENV,
    GEOCOMPLY_MOBILE_SERVICE_URL: process.env.GEOCOMPLY_MOBILE_SERVICE_URL,
    GEOCOMPLY_OOBEE_URL: process.env.GEOCOMPLY_OOBEE_URL,
    CDN_URL: process.env.CDN_URL,
    localeSubpaths,
    env: process.env.ENV_NAME,
    staticFolder: "/static",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  webpack: (config, options) => {
    if (!options.isServer) {
      config.resolve.fallback.fs = false;
    }
    return {
      ...config,
      plugins: [
        ...config.plugins,
        new I18NextHMRPlugin({
          localesDir: path.resolve(__dirname, "public/static/locales"),
        }),
      ],
      node: {},
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          i18n: path.resolve(__dirname, "i18n.js"),
        },
      },
    };
  },
  trailingSlash: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
};
