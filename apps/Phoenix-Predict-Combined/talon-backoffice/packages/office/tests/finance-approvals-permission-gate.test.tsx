import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import FinanceApprovalsPage from "../app/(dashboard)/finance/approvals/page";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-96 (§7/§25/§29, completing GAP-91's SoD): the dual-approval queue's
// Approve/Reject gate on finances:approve (the CHECKER permission), NOT the
// finances:write that ORIGINATES an adjustment. So the checker-only
// finance-approver role (finances:approve) can operate the queue, and an
// originator (finances:write only) sees the buttons DISABLED rather than
// enabled→backend-403.

const pending = {
  id: 1,
  subjectId: "cust-1",
  direction: "credit",
  amountCents: 20000,
  reason: "goodwill",
  makerId: "maker",
  createdAt: "2026-03-01T00:00:00Z",
};

function mockFetch() {
  globalThis.fetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method || "GET").toUpperCase();
    if (method === "POST") {
      return Promise.resolve(
        new Response(JSON.stringify({ approved: true }), { status: 200 }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ actions: [pending] }), { status: 200 }),
    );
  }) as unknown as typeof fetch;
}

function renderPage(perms: string[]) {
  return render(
    <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
      <FinanceApprovalsPage />
    </PermissionsContext.Provider>,
  );
}

describe("Finance approvals permission gate", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => mockFetch());
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("disables Approve/Reject for an originator holding only finances:write (not the checker)", async () => {
    renderPage(["finances:write", "finances:read"]);
    await screen.findByTestId("approve-1");
    expect(screen.getByTestId("approve-1")).toBeDisabled();
    expect(screen.getByTestId("reject-1")).toBeDisabled();
  });

  it("enables Approve/Reject for the checker holding finances:approve", async () => {
    renderPage(["finances:approve", "finances:read"]);
    await screen.findByTestId("approve-1");
    expect(screen.getByTestId("approve-1")).not.toBeDisabled();
    expect(screen.getByTestId("reject-1")).not.toBeDisabled();
  });
});
