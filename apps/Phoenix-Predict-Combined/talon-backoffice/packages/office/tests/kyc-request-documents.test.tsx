import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import KYCReviewPage from "../app/(dashboard)/compliance/kyc/page";
import { PermissionsContext } from "../app/lib/permissions";

// GAP-103 (§12 "decline/request-documents" / Scenario 4): the KYC review
// console offers the non-terminal "Request documents" outcome — POSTs
// /admin/kyc/request-documents {userId, reason} (compliance:write server-side,
// audited kyc.documents_requested). Requires the shared reason field; gated
// fail-closed on can("compliance:write").

const review = {
  userId: "u-1",
  status: "pending_review",
  riskLevel: "low",
  documentCount: 1,
  submittedAt: "2026-03-01T00:00:00Z",
};

let calls: { url: string; method: string; body?: string }[] = [];

function mockFetch() {
  calls = [];
  globalThis.fetch = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || "GET").toUpperCase();
    calls.push({ url, method, body: init?.body as string | undefined });
    if (url.includes("/kyc/request-documents")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ userId: "u-1", status: "documents_required" }),
          { status: 200 },
        ),
      );
    }
    if (url.includes("/kyc/users/")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            status: { userId: "u-1", status: "pending_review" },
            documents: [],
            identity: null,
          }),
          { status: 200 },
        ),
      );
    }
    // queue
    return Promise.resolve(
      new Response(JSON.stringify({ reviews: [review] }), { status: 200 }),
    );
  }) as unknown as typeof fetch;
}

function renderPage(perms: string[]) {
  return render(
    <PermissionsContext.Provider value={{ perms, unconstrained: false }}>
      <KYCReviewPage />
    </PermissionsContext.Provider>,
  );
}

async function openReview() {
  fireEvent.click(await screen.findByText("u-1"));
  await screen.findByTestId("kyc-request-documents-button");
}

describe("KYC request-documents (GAP-103)", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => mockFetch());
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("is disabled for a read-only caller (no compliance:write)", async () => {
    renderPage(["compliance:read"]);
    await openReview();
    expect(screen.getByTestId("kyc-request-documents-button")).toBeDisabled();
  });

  it("requires a reason before requesting documents", async () => {
    renderPage(["compliance:write", "compliance:read"]);
    await openReview();
    fireEvent.click(screen.getByTestId("kyc-request-documents-button"));
    await screen.findByTestId("kyc-decision-notice");
    expect(screen.getByTestId("kyc-decision-notice").textContent).toMatch(
      /reason is required/i,
    );
    expect(calls.some((c) => c.url.includes("request-documents"))).toBe(false);
  });

  it("POSTs the request with the reason for a compliance:write caller", async () => {
    renderPage(["compliance:write", "compliance:read"]);
    await openReview();
    fireEvent.change(screen.getByTestId("kyc-decision-reason"), {
      target: { value: "ID photo is blurry" },
    });
    fireEvent.click(screen.getByTestId("kyc-request-documents-button"));
    await waitFor(() =>
      expect(
        calls.some(
          (c) =>
            c.method === "POST" &&
            c.url.includes("/api/v1/admin/kyc/request-documents") &&
            (c.body ?? "").includes('"userId":"u-1"') &&
            (c.body ?? "").includes('"reason":"ID photo is blurry"'),
        ),
      ).toBe(true),
    );
  });
});
