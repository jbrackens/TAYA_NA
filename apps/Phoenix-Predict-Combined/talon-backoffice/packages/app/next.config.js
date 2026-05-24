const path = require("path");
// i18n config removed — incompatible with Next.js 13.5 App Router
// const { i18n } = require("./next-i18next.config");

const chatOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_CHAT_PUBLIC_URL || "";
  try {
    return raw ? new URL(raw).origin : "";
  } catch {
    return "";
  }
})();
const realtimeOrigin = (() => {
  const raw = process.env.NEXT_PUBLIC_WS_URL || "";
  try {
    return raw ? new URL(raw).origin : "";
  } catch {
    return "";
  }
})();

const frameSrc = ["'self'", "https://www.googletagmanager.com"];
const connectSrc = ["'self'"];
if (chatOrigin) {
  frameSrc.push(chatOrigin);
  connectSrc.push(chatOrigin, chatOrigin.replace(/^http/, "ws"));
}
if (realtimeOrigin) {
  connectSrc.push(realtimeOrigin);
}

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "frame-ancestors 'self'",
      `frame-src ${frameSrc.join(" ")}`,
      `connect-src ${connectSrc.join(" ")}`,
    ].join("; "),
  },
];

module.exports = {
  output: "standalone",
  compress: true,
  allowedDevOrigins: ["127.0.0.1"],
  // Transpile workspace packages that expose raw TypeScript source
  // NOTE: @phoenix-ui/design-system removed — all imports replaced with inline components
  transpilePackages: ["@phoenix-ui/utils", "@phoenix-ui/api-client"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Proxy API requests to Go backend (for development, avoids CORS issues)
        {
          source: "/api/v1/:path*",
          destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080"}/api/v1/:path*`,
        },
        // Proxy admin requests to Go backend
        {
          source: "/admin/:path*",
          destination: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:18080"}/admin/:path*`,
        },
      ],
    };
  },
  webpack: (config, options) => {
    if (!options.isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        bufferutil: false,
        "utf-8-validate": false,
      };
    } else {
      config.externals = config.externals || [];
      config.externals.push({
        bufferutil: "commonjs bufferutil",
        "utf-8-validate": "commonjs utf-8-validate",
      });
    }
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          "@phoenix-ui/utils$": path.resolve(__dirname, "../utils/src"),
        },
      },
    };
  },
  compiler: {
    styledComponents: true,
  },
  // compiler.styledComponents removed — no longer using styled-components in app/
  trailingSlash: true,
};
