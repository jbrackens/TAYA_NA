// Vitest global setup for the @taptrade-ui/office package.
//
// Registers @testing-library/jest-dom v6 matchers (toBeInTheDocument,
// toBeDisabled, toHaveTextContent, ...) onto Vitest's `expect`. v6 ships a
// Vitest-aware entrypoint (`/vitest`) that types `expect.extend` correctly —
// the React-19 / RTL-v16 compatible line. Older v5 used a Jest-only global
// shim that doesn't type against Vitest's matcher interface.
//
// Auto-cleanup: @testing-library/react v16 no longer auto-unmounts between
// tests when run outside a Jest-globals environment, so we wire RTL's
// `cleanup` to Vitest's `afterEach` here. Without this, DOM from one render
// test leaks into the next (duplicate elements break `getByText`).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
