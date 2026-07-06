#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REVIVAL_DIR="$ROOT/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_PATH="${JVM_RESOLVED_RESIDUAL_ADVISORY_REPORT:-$REVIVAL_DIR/69_JVM_RESOLVED_RESIDUAL_ADVISORY_GATE.md}"
POLICY_PATH="${JVM_RESOLVED_RESIDUAL_ADVISORY_POLICY:-$REVIVAL_DIR/jvm_resolved_residual_allowlist.json}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"
ARTIFACT_PATH="$ARTIFACT_DIR/jvm_resolved_residual_advisory_gate_${TIMESTAMP}.md"

mkdir -p "$ARTIFACT_DIR"

node - "$REPORT_PATH" "$ARTIFACT_PATH" "$ARTIFACT_DIR" "$POLICY_PATH" <<'NODE'
const fs = require("fs");
const path = require("path");

const [, , reportPath, artifactPath, artifactDir, policyPath] = process.argv;

function latestJsonArtifact(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs
    .readdirSync(dir)
    .filter((name) => /^jvm_osv_resolved_classpath_baseline_\d{8}_\d{6}\.json$/.test(name))
    .sort();
  return files.length === 0 ? null : path.join(dir, files[files.length - 1]);
}

function sorted(values) {
  return [...values].sort();
}

function sameArray(a, b) {
  const aa = sorted(a);
  const bb = sorted(b);
  return aa.length === bb.length && aa.every((value, index) => value === bb[index]);
}

function loadPolicy(filePath) {
  if (!fs.existsSync(filePath)) {
    return { residuals: [] };
  }
  const policy = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(policy.residuals)) {
    throw new Error(`policy ${filePath} must contain a residuals array`);
  }
  return policy;
}

function allowedKey(row) {
  return `${row.name}@${row.version}`;
}

const sourceJson = latestJsonArtifact(artifactDir);
const failures = [];
let payload = null;
let policy = null;
let residualRows = [];
let allowedResiduals = new Map();

if (!sourceJson) {
  failures.push(`missing JVM OSV resolved classpath JSON artifact in ${artifactDir}`);
} else {
  try {
    payload = JSON.parse(fs.readFileSync(sourceJson, "utf8"));
  } catch (error) {
    failures.push(`invalid JSON artifact ${sourceJson}: ${error.message}`);
  }
}

try {
  policy = loadPolicy(policyPath);
  allowedResiduals = new Map(
    policy.residuals.map((entry) => [
      `${entry.name}@${entry.version}`,
      {
        name: entry.name,
        version: entry.version,
        vulns: Array.isArray(entry.vulns) ? entry.vulns : [],
        rationale: entry.rationale || "",
      },
    ]),
  );
} catch (error) {
  failures.push(error.message);
  policy = { residuals: [] };
}

if (payload) {
  const results = Array.isArray(payload.results) ? payload.results : [];
  residualRows = results
    .filter((row) => Array.isArray(row.vulns) && row.vulns.length > 0)
    .map((row) => ({
      name: row.name,
      version: row.version,
      vulns: row.vulns.map((vuln) => vuln.id || String(vuln)).filter(Boolean),
      firstJar: Array.isArray(row.jarPaths) && row.jarPaths.length > 0 ? row.jarPaths[0] : "",
    }));

  for (const row of residualRows) {
    const allowed = allowedResiduals.get(allowedKey(row));
    if (!allowed) {
      failures.push(`${row.name}@${row.version}: unreviewed resolved JVM OSV finding (${row.vulns.join(", ")})`);
      continue;
    }
    if (!sameArray(row.vulns, allowed.vulns)) {
      failures.push(`${row.name}@${row.version}: expected vulns ${allowed.vulns.join(", ")}, got ${row.vulns.join(", ") || "<none>"}`);
    }
    if (!allowed.rationale) {
      failures.push(`${row.name}@${row.version}: reviewed residual entry is missing rationale`);
    }
  }

  for (const [key] of allowedResiduals) {
    if (!residualRows.some((row) => allowedKey(row) === key)) {
      failures.push(`${key}: reviewed residual entry no longer appears in resolved classpath findings`);
    }
  }
}

const status = failures.length === 0 ? "pass" : "fail";
const generatedAt = new Date().toISOString();
const uniqueIds = sorted(new Set(residualRows.flatMap((row) => row.vulns)));

const lines = [];
lines.push("# JVM Resolved Classpath Residual Advisory Gate");
lines.push("");
lines.push(`- Generated: \`${generatedAt}\``);
lines.push(`- Result: **${status}**`);
lines.push(`- Source JSON: \`${sourceJson || "<missing>"}\``);
lines.push(`- Reviewed residual policy: \`${policyPath}\``);
lines.push("- Decision: resolved JVM OSV findings may remain only when they match the reviewed residual policy exactly.");
lines.push("");
lines.push("## Observed Resolved Findings");
lines.push("");
lines.push("| Package | Version | Advisory ids | Example jar |");
lines.push("|---|---:|---|---|");
for (const row of residualRows) {
  lines.push(`| \`${row.name}\` | \`${row.version}\` | ${row.vulns.map((id) => `\`${id}\``).join(", ")} | \`${row.firstJar}\` |`);
}
if (residualRows.length === 0) {
  lines.push("| none |  |  |  |");
}
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Coordinates with resolved classpath OSV findings: \`${residualRows.length}\``);
lines.push(`- Unique OSV vulnerability ids: \`${uniqueIds.length}\``);
lines.push(`- Reviewed residual policy entries: \`${allowedResiduals.size}\``);
lines.push("");

if (failures.length > 0) {
  lines.push("## Failures");
  lines.push("");
  for (const failure of failures) lines.push(`- ${failure}`);
  lines.push("");
} else {
  lines.push("## Verification");
  lines.push("");
  lines.push("- Every resolved classpath JVM OSV finding matched the reviewed residual package, version, advisory id set, and rationale.");
  lines.push("- No unreviewed resolved classpath JVM OSV finding was observed.");
  lines.push("- Stale reviewed residual entries fail so remediated findings can be removed from the policy.");
  lines.push("");
}

lines.push("## Notes");
lines.push("");
lines.push("- This gate does not claim residual advisories are remediated.");
lines.push("- A missing policy means no resolved JVM OSV findings are accepted.");
lines.push("- Remediate findings where possible before adding residual entries.");
lines.push("- Any accepted residual needs compatibility/risk rationale and launch sign-off before Scenario 12 can pass.");

const body = `${lines.join("\n")}\n`;
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(reportPath, body);
fs.writeFileSync(artifactPath, body);

console.log(`JVM resolved residual advisory gate: ${status}`);
console.log(`Wrote report: ${reportPath}`);
console.log(`Wrote artifact: ${artifactPath}`);
if (failures.length > 0) {
  for (const failure of failures.slice(0, 25)) console.error(`- ${failure}`);
  if (failures.length > 25) console.error(`- ... ${failures.length - 25} more failures`);
  process.exit(1);
}
NODE
