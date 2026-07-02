"use client";

import { Card } from "../../components/shared";

interface ReportExport {
  label: string;
  description: string;
  href: string;
  testid: string;
}

// Same-origin GET downloads: the office proxies /api/v1/* to the gateway and
// the session cookie rides along, so a plain link streams the CSV. The gateway
// gates each on the owning read permission and audits the pull.
const EXPORTS: ReportExport[] = [
  {
    label: "KYC statuses (CSV)",
    description:
      "Every user's identity-verification status, risk level, and last-verified time.",
    href: "/api/v1/admin/reports/kyc-statuses.csv",
    testid: "export-kyc-statuses",
  },
  {
    label: "Surveillance alerts (CSV)",
    description:
      "All market-integrity alerts (wash, spoofing, collusion, duplicate account) with status and case linkage.",
    href: "/api/v1/admin/reports/surveillance-alerts.csv",
    testid: "export-surveillance-alerts",
  },
];

export default function ExportsPage() {
  return (
    <div className="space-y-6" data-testid="exports-page">
      <div>
        <h1 className="font-['Inter',sans-serif] text-2xl font-semibold text-[var(--t1,#1a1a1a)]">
          Reports &amp; Exports
        </h1>
        <p className="mt-1 text-sm text-[var(--t2,#4a4a4a)]">
          Download operational datasets as CSV. Each export is permission-gated
          and recorded in the audit log.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {EXPORTS.map((ex) => (
          <Card key={ex.href} className="p-5">
            <h2 className="m-0 mb-1 text-base font-semibold text-[var(--t1,#1a1a1a)]">
              {ex.label}
            </h2>
            <p className="mb-4 text-[13px] text-[var(--t2,#4a4a4a)]">
              {ex.description}
            </p>
            <a
              href={ex.href}
              className="inline-flex items-center rounded-lg bg-[var(--focus-ring,#0e7a53)] px-4 py-2 text-sm font-semibold text-[var(--bg-deep,#f7f3ed)]"
              data-testid={ex.testid}
              download
            >
              Download CSV
            </a>
          </Card>
        ))}
      </div>
    </div>
  );
}
