import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AMLPage from "../app/(dashboard)/aml/page";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-84 slice 3 (§29): AML mutations are compliance:write server-side, so the
// disposition controls are disabled for a read-only caller. Mocks globalThis
// .fetch (adminFetch delegates to it) with one open alert.

function mockFetch() {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    let body: unknown = {};
    if (url.includes("/aml/rules")) body = { rules: [] };
    else if (url.includes("/aml/alerts"))
      body = {
        alerts: [
          {
            id: 1,
            subjectId: "u-1",
            status: "open",
            riskPoints: 60,
            summary: "x",
          },
        ],
      };
    else if (url.includes("/aml/cases")) body = { cases: [] };
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  }) as unknown as typeof fetch;
}

function renderAML(perms: string[]) {
  return render(
    <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
      <AMLPage />
    </PermissionsContext.Provider>,
  );
}

describe("AML page permission gate", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => mockFetch());
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("enables Dismiss for a compliance:write caller", async () => {
    renderAML(["compliance:write", "compliance:read"]);
    const btn = await screen.findByTestId("aml-alert-dismiss-1");
    expect(btn).not.toBeDisabled();
  });

  it("disables Dismiss for a read-only caller (no compliance:write)", async () => {
    renderAML(["compliance:read"]);
    const btn = await screen.findByTestId("aml-alert-dismiss-1");
    expect(btn).toBeDisabled();
  });
});
