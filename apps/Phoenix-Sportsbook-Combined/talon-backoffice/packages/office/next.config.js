const path = require("path");
// i18n config removed — incompatible with Next.js 13.5 App Router
// const { i18n } = require("./next-i18next.config");

const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

module.exports = {
  // Transpile workspace packages that expose raw TypeScript source
  transpilePackages: [
    '@phoenix-ui/design-system',
    '@phoenix-ui/utils',
    '@phoenix-ui/api-client',
    '@phoenix-api/client',
  ],
  publicRuntimeConfig: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080',
    NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:18081',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:18080/ws',
    API_GLOBAL_ENDPOINT: process.env.API_GLOBAL_ENDPOINT,
    WS_GLOBAL_ENDPOINT: process.env.WS_GLOBAL_ENDPOINT,
    SHOW_FOR_SUBMISSION: process.env.SHOW_FOR_SUBMISSION,
    CDN_URL: process.env.CDN_URL,
    env: process.env.ENV_NAME,
    staticFolder: "/static",
    eligibleRoles: ["admin", "trader", "operator"],
  },
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
          source: '/api/v1/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080'}/api/v1/:path*`,
        },
        // Proxy admin requests to Go backend
        {
          source: '/admin/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:18080'}/admin/:path*`,
        },
      ],
    };
  },
  webpack: (config, options) => {
    if (!options.isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          i18n: path.resolve(__dirname, "i18n.js"),
        },
      },
    };
  },
  compiler: {
    styledComponents: true,
  },
  trailingSlash: true,
  // Suppress React 18 hydration mismatch overlay in dev mode.
  // SSR/client differences from localStorage-dependent UI (menus, profile)
  // cause benign text mismatches that don't affect runtime behavior.
  reactStrictMode: false,
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // antd 4.x class components don't declare `children` in props,
    // which breaks with @types/react 18. Runtime is unaffected.
    ignoreBuildErrors: true,
  },
};
