import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "antd";
import EligibilityTagsModal from "../containers/prediction-markets/EligibilityTagsModal";
import type { PredictionMarket } from "@phoenix-ui/api-client/src/prediction-types";

// GAP-98 (§15/§25): per-market eligibility-tag config editor over the
// GET/POST /admin/markets/{id}/eligibility-tags route (markets:edit). Every
// control gates fail-closed on canEdit; adding/removing a required tag POSTs
// {tagId, op}.

const market = {
  id: "mkt-1",
  ticker: "FED-CUT",
} as unknown as PredictionMarket;

let calls: { url: string; method: string; body?: string }[] = [];

function mockFetch(catalog: { id: number; name: string }[]) {
  calls = [];
  globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || "GET").toUpperCase();
    calls.push({ url, method, body: init?.body as string | undefined });
    if (url.includes("/eligibility-tags")) {
      if (method === "POST")
        return Promise.resolve(
          new Response(JSON.stringify({}), { status: 200 }),
        );
      return Promise.resolve(
        new Response(JSON.stringify({ marketId: "mkt-1", tagIds: [10] }), {
          status: 200,
        }),
      );
    }
    // segments/tags catalog
    return Promise.resolve(
      new Response(JSON.stringify({ tags: catalog }), { status: 200 }),
    );
  }) as unknown as typeof fetch;
}

function renderModal(canEdit: boolean) {
  return render(
    <App>
      <EligibilityTagsModal
        market={market}
        canEdit={canEdit}
        onClose={() => {}}
      />
    </App>,
  );
}

describe("EligibilityTagsModal (GAP-98)", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("renders current required tags by name and disables Add for a read-only caller", async () => {
    mockFetch([
      { id: 10, name: "VIP" },
      { id: 11, name: "KYC-verified" },
    ]);
    renderModal(false);
    // the market's current required tag (id 10 -> "VIP") renders
    await screen.findByText("VIP");
    expect(screen.getByTestId("eligibility-add-submit")).toBeDisabled();
  });

  it("adds a required tag via POST op:add (raw-id fallback when no catalog)", async () => {
    mockFetch([]); // empty catalog -> raw-id input path
    renderModal(true);
    const input = await screen.findByTestId("eligibility-add-raw");
    fireEvent.change(input, { target: { value: "11" } });
    const submit = screen.getByTestId("eligibility-add-submit");
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(
        calls.some(
          (c) =>
            c.method === "POST" &&
            c.url.includes("/api/v1/admin/markets/mkt-1/eligibility-tags") &&
            (c.body ?? "").includes('"op":"add"') &&
            (c.body ?? "").includes('"tagId":11'),
        ),
      ).toBe(true),
    );
  });

  // Isolates the markets:edit gate: in the raw-id branch with a VALID id filled,
  // the only remaining disabler is !canEdit — so this fails if the gate is
  // dropped (unlike the Select-branch case where selected===undefined also
  // disables Add). (verifier #31 MED.)
  it("keeps Add disabled for a read-only caller even with a valid tag id filled", async () => {
    mockFetch([]); // empty catalog -> raw-id path
    renderModal(false);
    const input = await screen.findByTestId("eligibility-add-raw");
    fireEvent.change(input, { target: { value: "11" } });
    // rawId is non-empty and not busy, so only !canEdit can disable it
    expect(screen.getByTestId("eligibility-add-submit")).toBeDisabled();
    expect(input).toBeDisabled();
  });
});
