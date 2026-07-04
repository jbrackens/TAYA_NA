import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import UsersPage from "../app/(dashboard)/users/page";

// GAP-81 (§10 Player Search / §32 Scenario 2). The office player search must run
// SERVER-SIDE so any punter — not just the fetched page — is findable. This test
// mocks globalThis.fetch (adminFetch delegates to it) and asserts that typing in
// the search box issues a backend request carrying ?search=<term>, rather than
// filtering a fixed pageSize=100 window in memory.

function makeItems(...emails: string[]) {
  return {
    items: emails.map((email, i) => ({
      id: `u-${i + 1}`,
      email,
      status: "active",
      lastLoginAt: "2026-03-01T00:00:00Z",
      pointAccountBalanceCents: 12345,
      realizedPointsCents: 6789,
    })),
  };
}

describe("UsersPage server-side search", () => {
  const realFetch = globalThis.fetch;
  let urls: string[];

  beforeEach(() => {
    urls = [];
    globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      // The full population lives server-side; only rows matching ?search= come
      // back. "zoe" is NOT in the initial page but IS returned when searched.
      const body = url.includes("search=zoe")
        ? makeItems("zoe@predict.dev")
        : makeItems("alice@predict.dev", "bob@predict.dev");
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: 200 }),
      );
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("issues an initial listing without a search param", async () => {
    render(<UsersPage />);
    await waitFor(() =>
      expect(screen.getByText("alice@predict.dev")).toBeTruthy(),
    );
    expect(urls.length).toBeGreaterThan(0);
    expect(urls[0]).toContain("/api/v1/admin/punters?");
    expect(urls[0]).toContain("pageSize=100");
    expect(urls[0]).not.toContain("search=");
  });

  it("refetches server-side with ?search= when the operator types", async () => {
    render(<UsersPage />);
    await waitFor(() =>
      expect(screen.getByText("alice@predict.dev")).toBeTruthy(),
    );

    fireEvent.change(screen.getByPlaceholderText("Search..."), {
      target: { value: "zoe" },
    });

    // A backend request carrying the search term is issued (debounced), and the
    // out-of-page match is rendered — proof the search is not an in-memory filter
    // over the initial 100-row window.
    await waitFor(() =>
      expect(urls.some((u) => u.includes("search=zoe"))).toBe(true),
    );
    await waitFor(() =>
      expect(screen.getByText("zoe@predict.dev")).toBeTruthy(),
    );
  });

  // verification #25 MED regression lock: the Retry button must actually refetch
  // (a no-op state setter would be dropped by React's bail-out).
  it("Retry issues a fresh fetch after an error", async () => {
    let calls = 0;
    globalThis.fetch = vi.fn(() => {
      calls += 1;
      if (calls === 1) {
        return Promise.resolve(new Response("nope", { status: 500 }));
      }
      return Promise.resolve(
        new Response(JSON.stringify(makeItems("alice@predict.dev")), {
          status: 200,
        }),
      );
    }) as unknown as typeof fetch;

    render(<UsersPage />);
    const retry = await screen.findByText("Try Again");
    expect(calls).toBe(1);
    fireEvent.click(retry);
    await waitFor(() =>
      expect(screen.getByText("alice@predict.dev")).toBeTruthy(),
    );
    expect(calls).toBeGreaterThanOrEqual(2);
  });
});
