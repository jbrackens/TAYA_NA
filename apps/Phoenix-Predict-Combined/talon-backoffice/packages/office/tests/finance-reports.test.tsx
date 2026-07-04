import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import FinanceReportsPage from "../app/(dashboard)/finance/reports/page";

// GAP-48 slice 3 (§23 Reporting dashboard). Component test: the page fetches the
// daily-balance + reconciliation reports and renders the summary, the daily
// table, and a date-scoped wallet-ledger CSV link. adminFetch calls
// globalThis.fetch, so mocking fetch by URL exercises the whole page.

const dailyBalance = {
  unit: "PTS",
  days: [
    {
      date: "2026-03-01",
      creditsCents: 100000,
      debitsCents: 40000,
      netCents: 60000,
      entryCount: 5,
      distinctUsers: 3,
    },
  ],
};

const reconciliation = {
  totalCreditPointsCents: 100000,
  totalDebitPointsCents: 40000,
  netMovementPointsCents: 60000,
  entryCount: 5,
  distinctUserCount: 3,
  unit: "PTS",
};

function mockFetch(status = 200) {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes("daily-balance") ? dailyBalance : reconciliation;
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
  }) as unknown as typeof fetch;
}

describe("FinanceReportsPage", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => mockFetch());
  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.restoreAllMocks();
  });

  it("renders the reconciliation summary and daily-balance rows from the API", async () => {
    render(<FinanceReportsPage />);
    await waitFor(() =>
      expect(screen.getByTestId("finance-reports-summary")).toBeTruthy(),
    );
    // Summary label unique to the summary block.
    expect(screen.getByText("Total credits")).toBeTruthy();
    // 100000 cents formats to 1,000.00 PTS (appears in summary + table).
    expect(screen.getAllByText(/1,000\.00 PTS/).length).toBeGreaterThan(0);
    // Daily-balance row date.
    expect(screen.getByText("2026-03-01")).toBeTruthy();
  });

  it("builds a date-scoped wallet-ledger CSV link", async () => {
    render(<FinanceReportsPage />);
    const link = await screen.findByTestId("finance-reports-csv");
    const href = link.getAttribute("href") ?? "";
    expect(href).toContain("/api/v1/admin/reports/wallet-ledger.csv?");
    expect(href).toContain("from=");
    expect(href).toContain("to=");
  });

  it("shows an error state when a report request fails", async () => {
    mockFetch(500);
    render(<FinanceReportsPage />);
    await waitFor(() =>
      expect(screen.getByText(/request failed/i)).toBeTruthy(),
    );
  });
});
