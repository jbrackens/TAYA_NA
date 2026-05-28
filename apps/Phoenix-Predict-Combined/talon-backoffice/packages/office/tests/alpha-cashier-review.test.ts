import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(__dirname, "../containers/provider-ops/cashier-review.tsx"),
  "utf-8",
);

describe("alpha cashier review panel", () => {
  it("wires the admin alpha cashier withdrawal and reconciliation endpoints", () => {
    expect(source).toContain('"admin/cashier/alpha/withdrawals"');
    expect(source).toContain('"admin/cashier/alpha/deposits"');
    expect(source).toContain('"admin/cashier/alpha/audit-events"');
    expect(source).toContain('"admin/cashier/alpha/reconciliation"');
    expect(source).toContain(
      '"admin/cashier/alpha/withdrawals/:withdrawalID/approve"',
    );
    expect(source).toContain(
      '"admin/cashier/alpha/withdrawals/:withdrawalID/reject"',
    );
    expect(source).toContain(
      '"admin/cashier/alpha/withdrawals/:withdrawalID/mark-broadcasted"',
    );
    expect(source).toContain(
      '"admin/cashier/alpha/withdrawals/:withdrawalID/mark-completed"',
    );
  });

  it("refreshes withdrawal queue and reconciliation state together", () => {
    expect(source).toContain("const refreshAlphaCashier = async () => {");
    expect(source).toContain("triggerAlphaWithdrawals()");
    expect(source).toContain("triggerAlphaDeposits");
    expect(source).toContain("triggerAlphaAuditEvents");
    expect(source).toContain("triggerAlphaReconciliation()");
    expect(source).toContain("setAlphaWithdrawals(");
    expect(source).toContain("setAlphaDeposits(");
    expect(source).toContain("setAlphaAuditEvents(");
    expect(source).toContain("setAlphaReconciliation(");
  });

  it("requires review notes for alpha rejection and tx hashes for broadcast marking", () => {
    expect(source).toContain("reviewNote: string");
    expect(source).toContain("{ txHash: string }");
    expect(source).toContain("triggerAlphaReject");
    expect(source).toContain("triggerAlphaBroadcasted");
  });
});
