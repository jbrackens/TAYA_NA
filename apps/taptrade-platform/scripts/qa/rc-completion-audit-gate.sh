#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKSPACE_ROOT="$(cd "$ROOT/../../.." && pwd)"
SPEC_PATH="${TAPTRADE_SPEC_PATH:-$WORKSPACE_ROOT/spec.md}"
REVIVAL_DIR="$ROOT/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_PATH="${RC_COMPLETION_AUDIT_REPORT:-$REVIVAL_DIR/67_RC_COMPLETION_AUDIT_GATE.md}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"
ARTIFACT_PATH="$ARTIFACT_DIR/rc_completion_audit_gate_${TIMESTAMP}.md"

mkdir -p "$ARTIFACT_DIR"

node - "$SPEC_PATH" "$REPORT_PATH" "$ARTIFACT_PATH" <<'NODE'
const fs = require("fs");
const path = require("path");

const [, , specPath, reportPath, artifactPath] = process.argv;
const failures = [];

if (!fs.existsSync(specPath)) {
  failures.push(`missing spec file: ${specPath}`);
}

let rows = [];
if (failures.length === 0) {
  const body = fs.readFileSync(specPath, "utf8");
  const marker = "## 20. Progress Matrix";
  const start = body.indexOf(marker);
  if (start === -1) {
    failures.push("missing ## 20. Progress Matrix section");
  } else {
    const section = body.slice(start).split(/\n## /)[0];
    rows = section
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => /^\|\s*\d+\./.test(line))
      .map((line) => {
        const cells = line
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim());
        return {
          scenario: cells[0] || "",
          status: cells[1] || "",
          evidence: cells[2] || "",
          blockers: cells[3] || "",
          next: cells[4] || "",
        };
      });
  }
}

if (rows.length !== 12) {
  failures.push(`expected 12 progress-matrix scenario rows, found ${rows.length}`);
}

for (const row of rows) {
  if (row.status !== "Pass") {
    failures.push(`${row.scenario}: status is ${row.status || "<empty>"}, expected Pass`);
  }
  if (row.status === "Pass" && !row.evidence) {
    failures.push(`${row.scenario}: status is Pass but evidence cell is empty`);
  }
}

const statusCounts = rows.reduce((acc, row) => {
  acc[row.status || "<empty>"] = (acc[row.status || "<empty>"] || 0) + 1;
  return acc;
}, {});

const generatedAt = new Date().toISOString();
const result = failures.length === 0 ? "pass" : "fail";

const lines = [];
lines.push("# RC Completion Audit Gate");
lines.push("");
lines.push(`- Generated: \`${generatedAt}\``);
lines.push(`- Result: **${result}**`);
lines.push(`- Spec: \`${specPath}\``);
lines.push("- Decision: Parity Release Candidate v1 requires all 12 progress-matrix scenarios to be `Pass` with evidence.");
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push("| Status | Count |");
lines.push("|---|---:|");
for (const status of Object.keys(statusCounts).sort()) {
  lines.push(`| ${status} | ${statusCounts[status]} |`);
}
if (Object.keys(statusCounts).length === 0) {
  lines.push("| none | 0 |");
}
lines.push("");
lines.push("## Scenario Rows");
lines.push("");
lines.push("| Scenario | Status | Blockers / Gap | Next |");
lines.push("|---|---|---|---|");
for (const row of rows) {
  lines.push(`| ${row.scenario} | ${row.status || "<empty>"} | ${row.blockers || ""} | ${row.next || ""} |`);
}
lines.push("");

if (failures.length > 0) {
  lines.push("## Failures");
  lines.push("");
  for (const failure of failures) lines.push(`- ${failure}`);
  lines.push("");
} else {
  lines.push("## Verification");
  lines.push("");
  lines.push("- All 12 scenarios are marked Pass.");
  lines.push("- Every Pass scenario has a non-empty evidence cell.");
  lines.push("");
}

lines.push("## Notes");
lines.push("");
lines.push("- This gate checks the declared completion contract in `spec.md`; it does not run browser, API, security, or preservation tests itself.");
lines.push("- It should run late in launch readiness, after evidence-producing gates have refreshed their reports.");
lines.push("- A failing result is expected until every remaining Partial/Fail scenario has reviewable evidence and the progress matrix is updated truthfully.");

const output = `${lines.join("\n")}\n`;
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(reportPath, output);
fs.writeFileSync(artifactPath, output);

console.log(`RC completion audit gate: ${result}`);
console.log(`Wrote report: ${reportPath}`);
console.log(`Wrote artifact: ${artifactPath}`);

if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
NODE
