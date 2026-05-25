export function renderCanaryReport(canary) {
  const rows = canary.checks.map((check) => ({
    name: check.name,
    status: check.status,
    durationMs: check.durationMs,
    message: check.message ?? "",
  }));
  return {
    id: canary.id,
    status: canary.status,
    startedAt: canary.startedAt,
    finishedAt: canary.finishedAt,
    summary: `${canary.status.toUpperCase()} · ${rows.length} checks`,
    rows,
  };
}

export function renderReconciliationDashboard(summary) {
  return {
    reportId: summary.reportId,
    businessDate: summary.businessDate,
    headline:
      summary.mismatchCount === 0
        ? "All cashier records reconciled"
        : `${summary.mismatchCount} reconciliation mismatches`,
    itemCount: summary.itemCount,
    matchedCount: summary.matchedCount,
    mismatchCount: summary.mismatchCount,
    byStatus: summary.byStatus,
  };
}
