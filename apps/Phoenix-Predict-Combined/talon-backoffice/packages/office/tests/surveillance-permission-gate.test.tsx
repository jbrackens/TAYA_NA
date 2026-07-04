import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SurveillancePage from "../app/(dashboard)/surveillance/page";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-84 slice 4 (§29): surveillance mutations are surveillance:write server-side,
// so the disposition controls disable for a read-only caller.

function mockFetch() {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    let body: unknown = {};
    if (url.includes("/surveillance/alerts"))
      body = {
        alerts: [{ id: 1, detector: "wash", subjectId: "u-1", status: "open" }],
      };
    else if (url.includes("/surveillance/cases")) body = { cases: [] };
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  }) as unknown as typeof fetch;
}

function renderSurv(perms: string[]) {
  return render(
    <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
      <SurveillancePage />
    </PermissionsContext.Provider>,
  );
}

describe("Surveillance page permission gate", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => mockFetch());
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("enables Dismiss for a surveillance:write caller", async () => {
    renderSurv(["surveillance:write", "surveillance:read"]);
    const btn = await screen.findByTestId("alert-dismiss-1");
    expect(btn).not.toBeDisabled();
  });

  it("disables Dismiss for a read-only caller (no surveillance:write)", async () => {
    renderSurv(["surveillance:read"]);
    const btn = await screen.findByTestId("alert-dismiss-1");
    expect(btn).toBeDisabled();
  });
});
