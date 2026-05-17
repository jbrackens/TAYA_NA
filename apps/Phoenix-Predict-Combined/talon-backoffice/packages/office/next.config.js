const path = require("path");
// i18n config removed — incompatible with Next.js 13.5 App Router
// const { i18n } = require("./next-i18next.config");

const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

module.exports = {
  output: "standalone",
  // Transpile workspace packages that expose raw TypeScript source
  outputFileTracingRoot: path.join(__dirname, "../.."),
  transpilePackages: [
    "@phoenix-ui/design-system",
    "@phoenix-ui/utils",
    "@phoenix-ui/api-client",
    "@phoenix-api/client",
  ],
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
  // Redirect the entire legacy /risk-management subtree to /dashboard.
  // pages/risk-management/{summary,prediction,markets,fixed-exotics,
  // market-categories,provider-ops}/ render sportsbook-shaped surfaces
  // (freebet usage, odds-boost breakdowns, bet/stake counts, fixture
  // exposure) that don't exist in the prediction-market product. Visible
  // under the prediction brand they read as a credibility leak.
  //
  // The page files stay on disk (deleting them is a separate cleanup
  // PR — they share state with sportsbook-era hooks that need an audit
  // first); the redirect just makes sure no operator can land on them.
  // When PR #48 (feat/risk-dashboard-v1) merges, change the destination
  // to /prediction-admin/risk so the redirect lands on the real
  // prediction-native dashboard.
  async redirects() {
    return [
      {
        source: "/risk-management/:path*",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
  webpack: (config, options) => {
    if (!options.isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    // React 19 compat for AntD 4.x: alias the exact `react-dom` request to
    // a shim that restores render()/unmountComponentAtNode() on top of
    // createRoot. `__real_react_dom` points at the genuine module so the
    // shim can re-export it without the `react-dom$` alias looping.
    const realReactDom = require.resolve("react-dom");
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve.alias,
          i18n: path.resolve(__dirname, "i18n.js"),
          "next/config$": path.resolve(__dirname, "lib/next-runtime-config.js"),
          __real_react_dom$: realReactDom,
          "react-dom$": path.resolve(
            __dirname,
            "lib/react-dom-react19-shim.js",
          ),
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
  typescript: {
    // antd 4.x class components don't declare `children` in props,
    // which breaks with @types/react 18. Runtime is unaffected.
    ignoreBuildErrors: true,
  },
};
