/**
 * Regression coverage for production demo routing.
 *
 * Run: npx tsx --test app/__tests__/prediction-client-browser-base.test.ts
 */
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { createPredictionClient } from "../../../api-client/src/prediction-client";

const originalWindow = (globalThis as typeof globalThis & { window?: unknown })
  .window;
const originalFetch = globalThis.fetch;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;

afterEach(() => {
  if (originalWindow === undefined) {
    delete (globalThis as typeof globalThis & { window?: unknown }).window;
  } else {
    (globalThis as typeof globalThis & { window?: unknown }).window =
      originalWindow;
  }
  globalThis.fetch = originalFetch;
  if (originalApiUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  }
});

describe("createPredictionClient browser base URL", () => {
  it("uses same-origin API paths in browsers when no public API URL is configured", async () => {
    (globalThis as typeof globalThis & { window?: unknown }).window = {
      __NEXT_DATA__: {},
    };
    delete process.env.NEXT_PUBLIC_API_URL;

    const urls: string[] = [];
    globalThis.fetch = async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await createPredictionClient().getCategories();

    assert.deepEqual(urls, ["/api/v1/categories"]);
  });

  it("treats an empty public API URL as same-origin instead of localhost", async () => {
    (globalThis as typeof globalThis & { window?: unknown }).window = {
      __NEXT_DATA__: {},
    };
    process.env.NEXT_PUBLIC_API_URL = "";

    const urls: string[] = [];
    globalThis.fetch = async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await createPredictionClient().getCategories();

    assert.deepEqual(urls, ["/api/v1/categories"]);
  });
});
