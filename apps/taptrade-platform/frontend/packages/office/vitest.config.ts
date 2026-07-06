import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Vitest config for the @taptrade-ui/office package.
//
// Replaces the broken Jest 25 + babel-jest + TS 5 setup (which hangs on
// startup — see the deprecated `test:jest` script). Vitest works with TS 5
// out of the box, runs ~10x faster than Jest, and uses a Jest-compatible
// expect/describe/it API so existing tests can migrate incrementally.
//
// Scope is intentionally narrow at scaffold time:
//   - `tests/` directory holds new Vitest tests
//   - Existing `__tests__/*.test.{ts,tsx}` Jest tests stay opt-in via
//     `yarn test:jest` (still broken, kept only so PRs that fix Jest don't
//     have to wrestle with the script wiring at the same time)
//   - happy-dom for the DOM runtime — much lighter than jsdom and
//     compatible with @testing-library/react which is already a devDep
//
// To add a test: create `tests/<name>.test.ts` (or .tsx for components),
// import from `vitest` instead of `@jest/globals`, and run `yarn test`.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    globals: true,
    // jest-dom v6 matchers + RTL auto-cleanup (see vitest.setup.ts). Required
    // by the render-based tests added with the RTL v11 -> v16 upgrade.
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    // Existing __tests__/*.test.* files are still Jest-targeted. Keep them
    // out of Vitest's collection until they're migrated one-by-one.
    exclude: ["**/node_modules/**", "**/.next/**", "**/__tests__/**"],
  },
  resolve: {
    alias: {
      "@taptrade-ui/utils": path.resolve(__dirname, "../utils/src"),
      "@taptrade-ui/api-client": path.resolve(__dirname, "../api-client/src"),
      i18n: path.resolve(__dirname, "./i18n.ts"),
    },
  },
});
