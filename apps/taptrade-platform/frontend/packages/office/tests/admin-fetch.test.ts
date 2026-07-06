import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminFetch } from "../app/lib/admin-fetch";

describe("adminFetch", () => {
  const realFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    // happy-dom's document.cookie is append-only across tests; replacing the
    // getter directly is the only reliable reset. Each test calls setCookies()
    // to install the cookies it cares about.
    setCookies("");
  });

  function setCookies(value: string) {
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => value,
      set: (v: string) => {
        value = v;
      },
    });
  }

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  function calledWith(): [string | URL | Request, RequestInit] {
    const fetchMock = globalThis.fetch as ReturnType<typeof vi.fn>;
    return fetchMock.mock.calls[0] as [string | URL | Request, RequestInit];
  }

  it("sends credentials: include by default so the access_token cookie is forwarded", async () => {
    await adminFetch("/api/v1/admin/punters");
    const [, init] = calledWith();
    expect(init.credentials).toBe("include");
  });

  it("defaults X-Admin-Role: admin", async () => {
    await adminFetch("/api/v1/admin/punters");
    const [, init] = calledWith();
    const headers = new Headers(init.headers);
    expect(headers.get("X-Admin-Role")).toBe("admin");
  });

  it("attaches X-CSRF-Token on mutations when csrf_token cookie is set", async () => {
    setCookies("csrf_token=abc123");
    await adminFetch("/api/v1/admin/markets/m1/lifecycle/halt", {
      method: "POST",
    });
    const [, init] = calledWith();
    const headers = new Headers(init.headers);
    expect(headers.get("X-CSRF-Token")).toBe("abc123");
  });

  it("does NOT attach X-CSRF-Token on safe methods", async () => {
    setCookies("csrf_token=abc123");
    await adminFetch("/api/v1/admin/punters");
    const [, init] = calledWith();
    const headers = new Headers(init.headers);
    expect(headers.get("X-CSRF-Token")).toBeNull();
  });

  it("does NOT attach X-CSRF-Token when the cookie is absent (allow gateway to 403 honestly)", async () => {
    setCookies("");
    await adminFetch("/api/v1/admin/markets/m1/lifecycle/halt", {
      method: "POST",
    });
    const [, init] = calledWith();
    const headers = new Headers(init.headers);
    expect(headers.get("X-CSRF-Token")).toBeNull();
  });

  it("preserves a caller-provided X-CSRF-Token override", async () => {
    setCookies("csrf_token=from-cookie");
    await adminFetch("/api/v1/admin/markets/m1/lifecycle/halt", {
      method: "POST",
      headers: { "X-CSRF-Token": "from-caller" },
    });
    const [, init] = calledWith();
    const headers = new Headers(init.headers);
    expect(headers.get("X-CSRF-Token")).toBe("from-caller");
  });

  it("preserves a caller-provided credentials override", async () => {
    await adminFetch("/api/v1/admin/punters", { credentials: "omit" });
    const [, init] = calledWith();
    expect(init.credentials).toBe("omit");
  });
});
