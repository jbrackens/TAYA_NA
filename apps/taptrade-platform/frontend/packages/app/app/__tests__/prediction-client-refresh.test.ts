/**
 * LC-37: PredictionApiClient (order/preview/cancel/portfolio path) must
 * refresh-and-retry once on a 401 instead of throwing a raw "API error:
 * 401" and silently dropping a money action. Tests the real shipped
 * client. Fails-without: with the 401→refresh→retry branch removed the
 * first sub-test throws on the initial 401 (no /refresh call, no retry).
 *
 * Run: npx tsx --test app/__tests__/prediction-client-refresh.test.ts
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { PredictionApiClient } from "@taptrade-ui/api-client/src/prediction-client";

type Step = { status: number; body?: unknown };

function scriptFetch(steps: Step[]) {
  const calls: { url: string; method: string }[] = [];
  let i = 0;
  const fn = async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), method: (init?.method as string) || "GET" });
    const step = steps[Math.min(i, steps.length - 1)];
    i++;
    return {
      ok: step.status >= 200 && step.status < 300,
      status: step.status,
      json: async () => step.body ?? {},
      text: async () => JSON.stringify(step.body ?? {}),
    } as unknown as Response;
  };
  return { fn, calls };
}

const realFetch = globalThis.fetch;
const realWindow = (globalThis as Record<string, unknown>).window;
const realDocument = (globalThis as Record<string, unknown>).document;

beforeEach(() => {
  (globalThis as Record<string, unknown>).window = {};
  (globalThis as Record<string, unknown>).document = {
    cookie: "csrf_token=tok-csrf",
  };
});
afterEach(() => {
  globalThis.fetch = realFetch;
  (globalThis as Record<string, unknown>).window = realWindow;
  (globalThis as Record<string, unknown>).document = realDocument;
});

describe("PredictionApiClient 401 refresh-and-retry (LC-37)", () => {
  it("refreshes once then retries and resolves on a transient 401", async () => {
    const s = scriptFetch([
      { status: 401, body: { error: { message: "expired" } } },
      { status: 200 }, // /refresh
      { status: 200, body: { categories: [] } }, // retried discovery
    ]);
    globalThis.fetch = s.fn as unknown as typeof fetch;
    const c = new PredictionApiClient("http://test.local");

    const out = await c.getDiscovery();
    assert.deepEqual(out, { categories: [] });
    assert.equal(s.calls.length, 3, "orig + refresh + retry");
    assert.match(s.calls[1].url, /\/api\/v1\/auth\/refresh\/$/);
    assert.equal(s.calls[1].method, "POST");
  });

  it("does NOT loop: a 401 on the retry throws after exactly one refresh", async () => {
    const s = scriptFetch([
      { status: 401 },
      { status: 200 }, // /refresh ok
      { status: 401, body: { error: { message: "still 401" } } }, // retry still 401
    ]);
    globalThis.fetch = s.fn as unknown as typeof fetch;
    const c = new PredictionApiClient("http://test.local");

    await assert.rejects(() => c.getDiscovery(), /still 401|API error: 401/);
    assert.equal(s.calls.length, 3, "orig + one refresh + one retry, no loop");
  });

  it("throws (no retry) when the refresh itself fails", async () => {
    const s = scriptFetch([
      { status: 401, body: { error: { message: "expired" } } },
      { status: 500 }, // /refresh fails
    ]);
    globalThis.fetch = s.fn as unknown as typeof fetch;
    const c = new PredictionApiClient("http://test.local");

    await assert.rejects(() => c.getDiscovery(), /expired|API error: 401/);
    assert.equal(s.calls.length, 2, "orig + failed refresh, no retry");
  });

  it("normal 200 never attempts a refresh", async () => {
    const s = scriptFetch([{ status: 200, body: { categories: [1] } }]);
    globalThis.fetch = s.fn as unknown as typeof fetch;
    const c = new PredictionApiClient("http://test.local");

    await c.getDiscovery();
    assert.equal(s.calls.length, 1, "single call, no refresh");
  });
});
