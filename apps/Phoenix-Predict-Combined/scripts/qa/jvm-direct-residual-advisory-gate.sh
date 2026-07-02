#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REVIVAL_DIR="$ROOT/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_PATH="${JVM_DIRECT_RESIDUAL_ADVISORY_REPORT:-$REVIVAL_DIR/65_JVM_DIRECT_RESIDUAL_ADVISORY_GATE.md}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"
ARTIFACT_PATH="$ARTIFACT_DIR/jvm_direct_residual_advisory_gate_${TIMESTAMP}.md"

mkdir -p "$ARTIFACT_DIR"

node - "$REPORT_PATH" "$ARTIFACT_PATH" "$ARTIFACT_DIR" <<'NODE'
const fs = require("fs");
const path = require("path");

const [, , reportPath, artifactPath, artifactDir] = process.argv;

const allowedResiduals = new Map([
  [
    "com.lightbend.akka.management:akka-management_2.13",
    {
      version: "1.1.3",
      vulns: ["GHSA-9qvj-rpj8-v5c8"],
      rationale:
        "Runtime Akka Management line; OSV fixed version is 1.6.1, which requires Java/SBT compile and runtime validation before accepting.",
    },
  ],
  [
    "com.rabbitmq:amqp-client",
    {
      version: "5.8.0",
      vulns: ["GHSA-mm8h-8587-p46h"],
      rationale:
        "Runtime RabbitMQ client pulled through inherited odds-feed support; fixed version 5.18.0 needs Java/SBT compile and integration validation.",
    },
  ],
  [
    "com.typesafe.akka:akka-stream-kafka_2.13",
    {
      version: "3.0.0",
      vulns: ["GHSA-55vq-xpjf-r2xc"],
      rationale:
        "Runtime Akka Stream Kafka line; OSV fixed version is 4.0.2 and should not be bumped without resolver-backed compatibility evidence.",
    },
  ],
  [
    "org.keycloak:keycloak-adapter-core",
    {
      version: "17.0.1",
      vulns: ["GHSA-7vw6-5q2f-7w5r"],
      rationale:
        "Runtime Keycloak adapter; advisory has no fixed event in OSV and broad Keycloak upgrades require auth compatibility validation.",
    },
  ],
  [
    "org.keycloak:keycloak-core",
    {
      version: "17.0.1",
      vulns: [
        "GHSA-5cc8-pgp5-7mpm",
        "GHSA-755v-r4x4-qf7m",
        "GHSA-93ww-43rr-79v3",
        "GHSA-9vm7-v8wj-3fqw",
        "GHSA-c7xw-p58w-h6fj",
        "GHSA-g4gc-rh26-m3p5",
        "GHSA-q4xq-445g-g6ch",
        "GHSA-v436-q368-hvgg",
        "GHSA-w97f-w3hq-36g2",
        "GHSA-xmmm-jw76-q7vg",
      ],
      rationale:
        "Runtime Keycloak core; multiple advisories remain and any major Keycloak movement requires auth/session compatibility validation.",
    },
  ],
]);

function latestJsonArtifact(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter((name) => /^jvm_osv_direct_dependency_baseline_\d{8}_\d{6}\.json$/.test(name))
    .sort();
  if (files.length === 0) return null;
  return path.join(dir, files[files.length - 1]);
}

function sorted(values) {
  return [...values].sort();
}

function sameArray(a, b) {
  const aa = sorted(a);
  const bb = sorted(b);
  return aa.length === bb.length && aa.every((value, index) => value === bb[index]);
}

const sourceJson = latestJsonArtifact(artifactDir);
const failures = [];
let payload = null;
let residualRows = [];

if (!sourceJson) {
  failures.push(`missing JVM OSV direct JSON artifact in ${artifactDir}`);
} else {
  try {
    payload = JSON.parse(fs.readFileSync(sourceJson, "utf8"));
  } catch (error) {
    failures.push(`invalid JSON artifact ${sourceJson}: ${error.message}`);
  }
}

if (payload) {
  const results = Array.isArray(payload.results) ? payload.results : [];
  residualRows = results
    .filter((row) => Array.isArray(row.vulns) && row.vulns.length > 0)
    .map((row) => ({
      name: row.name,
      version: row.version,
      vulns: row.vulns.map((vuln) => vuln.id || String(vuln)).filter(Boolean),
      firstSource:
        Array.isArray(row.occurrences) && row.occurrences.length > 0
          ? `${row.occurrences[0].source}:${row.occurrences[0].line}`
          : "",
    }));

  for (const row of residualRows) {
    const allowed = allowedResiduals.get(row.name);
    if (!allowed) {
      failures.push(`${row.name || "<unknown>"}: unreviewed direct JVM OSV finding (${row.vulns.join(", ")})`);
      continue;
    }
    if (row.version !== allowed.version) {
      failures.push(`${row.name}: expected version ${allowed.version}, got ${row.version || "<empty>"}`);
    }
    if (!sameArray(row.vulns, allowed.vulns)) {
      failures.push(`${row.name}: expected vulns ${allowed.vulns.join(", ")}, got ${row.vulns.join(", ") || "<none>"}`);
    }
  }
}

const status = failures.length === 0 ? "pass" : "fail";
const generatedAt = new Date().toISOString();
const uniqueIds = sorted(new Set(residualRows.flatMap((row) => row.vulns)));

const lines = [];
lines.push("# JVM Direct Residual Advisory Gate");
lines.push("");
lines.push(`- Generated: \`${generatedAt}\``);
lines.push(`- Result: **${status}**`);
lines.push(`- Source JSON: \`${sourceJson || "<missing>"}\``);
lines.push("- Decision: direct JVM OSV findings may remain only when they match the reviewed runtime residual set exactly.");
lines.push("");
lines.push("## Allowed Residual Direct Findings");
lines.push("");
lines.push("| Package | Version | Advisory ids | Rationale |");
lines.push("|---|---:|---|---|");
for (const [name, allowed] of allowedResiduals) {
  lines.push(`| \`${name}\` | \`${allowed.version}\` | ${allowed.vulns.map((id) => `\`${id}\``).join(", ")} | ${allowed.rationale} |`);
}
lines.push("");
lines.push("## Observed Direct Findings");
lines.push("");
lines.push("| Package | Version | Advisory ids | First source |");
lines.push("|---|---:|---|---|");
for (const row of residualRows) {
  lines.push(`| \`${row.name}\` | \`${row.version}\` | ${row.vulns.map((id) => `\`${id}\``).join(", ")} | \`${row.firstSource}\` |`);
}
if (residualRows.length === 0) {
  lines.push("| none |  |  |  |");
}
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Coordinates with direct OSV findings: \`${residualRows.length}\``);
lines.push(`- Unique OSV vulnerability ids: \`${uniqueIds.length}\``);
lines.push("");

if (failures.length > 0) {
  lines.push("## Failures");
  lines.push("");
  for (const failure of failures) lines.push(`- ${failure}`);
  lines.push("");
} else {
  lines.push("## Verification");
  lines.push("");
  lines.push("- Every direct JVM OSV finding matched the reviewed residual package, version, and advisory id set.");
  lines.push("- No new direct JVM OSV finding was observed.");
  lines.push("- Lower residual counts pass only when the remaining rows still match the reviewed residual set.");
  lines.push("");
}

lines.push("## Notes");
lines.push("");
lines.push("- This gate does not claim the residual advisories are remediated.");
lines.push("- Full resolver-backed JVM SCA, eviction review, compile proof, and runtime validation remain required before Scenario 12 can pass.");
lines.push("- Any new package, changed version, changed advisory id set, malformed artifact, or missing artifact fails this gate.");

const body = `${lines.join("\n")}\n`;
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(reportPath, body);
fs.writeFileSync(artifactPath, body);

console.log(`JVM direct residual advisory gate: ${status}`);
console.log(`Wrote report: ${reportPath}`);
console.log(`Wrote artifact: ${artifactPath}`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
NODE
