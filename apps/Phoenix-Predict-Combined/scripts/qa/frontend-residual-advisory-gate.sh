#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REVIVAL_DIR="$ROOT/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_PATH="${FRONTEND_RESIDUAL_ADVISORY_REPORT:-$REVIVAL_DIR/60_FRONTEND_RESIDUAL_ADVISORY_GATE.md}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"
ARTIFACT_PATH="$ARTIFACT_DIR/frontend_residual_advisory_gate_${TIMESTAMP}.md"

mkdir -p "$ARTIFACT_DIR"

latest_audit_log() {
  local prefix="$1"
  local latest
  latest="$(find "$ARTIFACT_DIR" -maxdepth 1 -type f -name "${prefix}_*.log" | sort | tail -n 1)"
  if [[ -z "$latest" ]]; then
    echo "$ARTIFACT_DIR/${prefix}_2026-03-02.log"
    return
  fi
  echo "$latest"
}

TAPTRADE_OFFICE_AUDIT_LOG="${FRONTEND_RESIDUAL_TAPTRADE_OFFICE_AUDIT_LOG:-$(latest_audit_log talon_yarn_audit)}"
PLAYER_AUDIT_LOG="${FRONTEND_RESIDUAL_PLAYER_AUDIT_LOG:-$(latest_audit_log taptrade_player_yarn_audit)}"

node - "$REPORT_PATH" "$ARTIFACT_PATH" "$TAPTRADE_OFFICE_AUDIT_LOG" "$PLAYER_AUDIT_LOG" <<'NODE'
const fs = require("fs");
const path = require("path");

const [, , reportPath, artifactPath, talonLog, playerLog] = process.argv;

const allowedHighs = new Map([
  [
    "ip|GHSA-2p57-rm9w-gvfp",
    {
      module: "ip",
      advisory: "GHSA-2p57-rm9w-gvfp",
      maxRows: 3,
      version: "1.1.5",
      pathMustContain: "lerna>",
      patchedVersions: "<0.0.0",
      rationale:
        "Inherited Lerna add/publish package-fetch proxy path; current advisory feed reports no patched upstream range.",
    },
  ],
  [
    "lodash.set|GHSA-p6mc-m468-83gw",
    {
      module: "lodash.set",
      advisory: "GHSA-p6mc-m468-83gw",
      maxRows: 2,
      version: "4.3.2",
      pathMustContain: "lerna>",
      patchedVersions: "<0.0.0",
      rationale:
        "Inherited Lerna version/publish GitHub client path; current advisory feed reports no patched upstream range.",
    },
  ],
]);

function parseAuditLog(label, file) {
  if (!fs.existsSync(file)) {
    return {
      label,
      file,
      rows: [],
      failures: [`missing audit log: ${file}`],
      counts: { critical: 0, high: 0 },
      highKeys: new Map(),
    };
  }

  const rows = [];
  const failures = [];
  const counts = { critical: 0, high: 0 };
  const highKeys = new Map();

  for (const [index, line] of fs.readFileSync(file, "utf8").split(/\n+/).entries()) {
    if (!line.trim()) continue;
    let payload;
    try {
      payload = JSON.parse(line);
    } catch (error) {
      failures.push(`line ${index + 1}: invalid JSON (${error.message})`);
      continue;
    }
    if (payload.type !== "auditAdvisory") continue;
    const advisory = payload.data && payload.data.advisory;
    if (!advisory) continue;
    const severity = advisory.severity || "unknown";
    if (severity !== "critical" && severity !== "high") continue;

    const findings = Array.isArray(advisory.findings) ? advisory.findings : [];
    const paths = findings.flatMap((finding) => Array.isArray(finding.paths) ? finding.paths : []);
    const versions = [...new Set(findings.map((finding) => finding.version).filter(Boolean))];
    const row = {
      module: advisory.module_name,
      title: advisory.title,
      severity,
      advisory: advisory.github_advisory_id || String(advisory.id || advisory.url || ""),
      patchedVersions: advisory.patched_versions || "",
      vulnerableVersions: advisory.vulnerable_versions || "",
      versions,
      paths,
    };
    rows.push(row);
    counts[severity] += 1;

    if (severity === "critical") {
      failures.push(`${row.module}: critical advisory ${row.advisory} is never allowed`);
      continue;
    }

    const key = `${row.module}|${row.advisory}`;
    highKeys.set(key, (highKeys.get(key) || 0) + 1);
    const allowed = allowedHighs.get(key);
    if (!allowed) {
      failures.push(`${row.module}: unreviewed high advisory ${row.advisory}`);
      continue;
    }
    if (row.patchedVersions !== allowed.patchedVersions) {
      failures.push(
        `${row.module}: expected patched_versions ${allowed.patchedVersions}, got ${row.patchedVersions || "<empty>"}`,
      );
    }
    if (allowed.version && !row.versions.includes(allowed.version)) {
      failures.push(`${row.module}: expected installed version ${allowed.version}, got ${row.versions.join(", ") || "<none>"}`);
    }
    if (!row.paths.some((p) => p.includes(allowed.pathMustContain))) {
      failures.push(`${row.module}: advisory path is no longer confined to ${allowed.pathMustContain} tooling`);
    }
  }

  for (const [key, count] of highKeys) {
    const allowed = allowedHighs.get(key);
    if (allowed && count > allowed.maxRows) {
      failures.push(`${key}: expected at most ${allowed.maxRows} advisory rows, got ${count}`);
    }
  }

  return { label, file, rows, failures, counts, highKeys };
}

const results = [
  parseAuditLog("TapTrade office workspace", talonLog),
  parseAuditLog("TapTrade player app", playerLog),
];

const allFailures = results.flatMap((result) => result.failures.map((failure) => `${result.label}: ${failure}`));
const status = allFailures.length === 0 ? "pass" : "fail";
const generatedAt = new Date().toISOString();

const lines = [];
lines.push("# Frontend Residual Advisory Gate");
lines.push("");
lines.push(`- Generated: \`${generatedAt}\``);
lines.push(`- Result: **${status}**`);
lines.push("- Decision: critical advisories are forbidden; high advisories may remain only when they match the reviewed inherited Lerna residuals.");
lines.push("");
lines.push("## Allowed Residual High Advisories");
lines.push("");
lines.push("| Module | Advisory | Maximum rows per audit | Required version | Required patched range | Rationale |");
lines.push("|---|---|---:|---|---|---|");
for (const allowed of allowedHighs.values()) {
  lines.push(`| \`${allowed.module}\` | \`${allowed.advisory}\` | ${allowed.maxRows} | \`${allowed.version}\` | \`${allowed.patchedVersions}\` | ${allowed.rationale} |`);
}
lines.push("");
lines.push("## Audit Results");
lines.push("");
lines.push("| Scope | Critical rows | High rows | Observed high keys | Source log |");
lines.push("|---|---:|---:|---|---|");
for (const result of results) {
  const observed = [...result.highKeys.entries()]
    .map(([key, count]) => `\`${key}\` (${count})`)
    .join(", ") || "none";
  lines.push(`| ${result.label} | ${result.counts.critical} | ${result.counts.high} | ${observed} | \`${result.file}\` |`);
}
lines.push("");

if (allFailures.length > 0) {
  lines.push("## Failures");
  lines.push("");
  for (const failure of allFailures) {
    lines.push(`- ${failure}`);
  }
  lines.push("");
} else {
  lines.push("## Verification");
  lines.push("");
  lines.push("- No critical advisory rows were present in either high-threshold audit log.");
  lines.push("- Every high advisory row matched a reviewed residual Lerna tooling path.");
  lines.push("- No new high advisory module, advisory id, patched range, installed version, or non-Lerna path was observed.");
  lines.push("");
}

lines.push("## Notes");
lines.push("");
lines.push("- This gate does not claim the residual advisories are remediated.");
lines.push("- A future Lerna replacement or dependency cleanup may reduce these rows; lower counts still pass.");
lines.push("- Any new high or critical advisory must be remediated or explicitly reviewed before this gate can pass.");

const body = `${lines.join("\n")}\n`;
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(reportPath, body);
fs.writeFileSync(artifactPath, body);

console.log(`Frontend residual advisory gate: ${status}`);
console.log(`Wrote report: ${reportPath}`);
console.log(`Wrote artifact: ${artifactPath}`);
if (allFailures.length > 0) {
  for (const failure of allFailures) console.error(`- ${failure}`);
  process.exit(1);
}
NODE
