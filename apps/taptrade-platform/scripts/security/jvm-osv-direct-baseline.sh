#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT/phoenix-backend"
REVIVAL_DIR="$ROOT/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_PATH="${JVM_OSV_DIRECT_REPORT:-$REVIVAL_DIR/61_JVM_OSV_DIRECT_DEPENDENCY_BASELINE.md}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"
ARTIFACT_PATH="$ARTIFACT_DIR/jvm_osv_direct_dependency_baseline_${TIMESTAMP}.md"
JSON_ARTIFACT_PATH="$ARTIFACT_DIR/jvm_osv_direct_dependency_baseline_${TIMESTAMP}.json"

mkdir -p "$ARTIFACT_DIR"

node - "$BACKEND_DIR" "$REPORT_PATH" "$ARTIFACT_PATH" "$JSON_ARTIFACT_PATH" <<'NODE'
const fs = require("fs");
const path = require("path");

async function main() {
const [, , backendDir, reportPath, artifactPath, jsonArtifactPath] = process.argv;
const scalaBinary = "2.13";
const generatedAt = new Date().toISOString();

const files = [
  path.join(backendDir, "project", "Dependencies.scala"),
  path.join(backendDir, "project", "plugins.sbt"),
  path.join(backendDir, "project", "build.sbt"),
  path.join(backendDir, "project", "project", "plugins.sbt"),
  path.join(backendDir, "build.sbt"),
].filter((file) => fs.existsSync(file));

function stripLineComment(line) {
  const marker = line.indexOf("//");
  return marker === -1 ? line : line.slice(0, marker);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function parseVersions(text) {
  const versions = new Map();
  const regex = /\bval\s+([A-Za-z0-9_]+)\s*=\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(text))) {
    versions.set(match[1], match[2]);
  }
  return versions;
}

function resolveVersion(expr, versions) {
  const trimmed = expr.trim();
  const literal = trimmed.match(/^"([^"]+)"$/);
  if (literal) return literal[1];
  const versionRef = trimmed.match(/^Versions\.([A-Za-z0-9_]+)$/);
  if (versionRef) return versions.get(versionRef[1]) || null;
  return null;
}

function artifactName(rawArtifact, operator, scalaSuffix) {
  return operator === "%%" ? `${rawArtifact}_${scalaSuffix}` : rawArtifact;
}

function addDependency(deps, dep) {
  if (!dep.version) return;
  if (/^\$\{/.test(dep.version)) return;
  deps.push(dep);
}

function parseInlineDependencies(file, text, versions, deps, options = {}) {
  const lines = text.split(/\n/);
  const source = path.relative(backendDir, file);
  const scalaSuffix = options.scalaSuffix || scalaBinary;
  const regex = /"([^"]+)"\s*(%%|%)\s*"([^"]+)"\s*%\s*([^,\)\n]+)/g;

  lines.forEach((original, index) => {
    const line = stripLineComment(original);
    let match;
    while ((match = regex.exec(line))) {
      const [, group, operator, artifact, versionExpr] = match;
      const version = resolveVersion(versionExpr, versions);
      addDependency(deps, {
        ecosystem: "Maven",
        name: `${group}:${artifactName(artifact, operator, scalaSuffix)}`,
        version,
        group,
        artifact: artifactName(artifact, operator, scalaSuffix),
        source,
        line: index + 1,
        declaration: original.trim(),
        coverage: options.coverage || "declared direct dependency",
      });
    }
  });
}

function parseMappedSeqDependencies(file, text, versions, deps) {
  const source = path.relative(backendDir, file);
  const lines = text.split(/\n/);
  let current = null;

  lines.forEach((original, index) => {
    const line = stripLineComment(original);
    if (/^\s*(?:private\s+)?val\s+[A-Za-z0-9_]+\s*(?::\s*[^=]+)?=\s*Seq\s*\(/.test(line)) {
      current = { startLine: index + 1, lines: [line] };
      return;
    }
    if (!current) return;

    current.lines.push(line);
    const mapped = line.match(/\)\.map\s*\(_\s*%\s*Versions\.([A-Za-z0-9_]+)\)/);
    if (!mapped) {
      if (/^\s*\)\s*$/.test(line)) current = null;
      return;
    }

    const versionKey = mapped[1];
    const version = versions.get(versionKey);
    const body = current.lines.join("\n");
    const startLine = current.startLine;
    current = null;
    if (!version) return;
    const depRegex = /"([^"]+)"\s*(%%|%)\s*"([^"]+)"/g;
    let depMatch;
    while ((depMatch = depRegex.exec(body))) {
      const [, group, operator, artifact] = depMatch;
      addDependency(deps, {
        ecosystem: "Maven",
        name: `${group}:${artifactName(artifact, operator, scalaBinary)}`,
        version,
        group,
        artifact: artifactName(artifact, operator, scalaBinary),
        source,
        line: startLine,
        declaration: `${group} ${operator} ${artifact} % Versions.${versionKey}`,
        coverage: "declared direct dependency from mapped Seq",
      });
    }
  });
}

function parseSbtPlugins(file, text, deps) {
  const source = path.relative(backendDir, file);
  const regex = /addSbtPlugin\s*\(\s*"([^"]+)"\s*(%%|%)\s*"([^"]+)"\s*%\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(text))) {
    const [, group, operator, artifact, version] = match;
    const before = text.slice(0, match.index);
    const line = before.split(/\n/).length;
    addDependency(deps, {
      ecosystem: "Maven",
      name: `${group}:${artifactName(artifact, operator, scalaBinary)}`,
      version,
      group,
      artifact: artifactName(artifact, operator, scalaBinary),
      source,
      line,
      declaration: match[0].replace(/\s+/g, " "),
      coverage: operator === "%%"
        ? "declared SBT plugin, approximated with Scala binary suffix"
        : "declared SBT plugin",
    });
  }
}

const allText = files.map((file) => read(file)).join("\n");
const versions = parseVersions(allText);
const deps = [];
for (const file of files) {
  const text = read(file);
  parseInlineDependencies(file, text, versions, deps);
  parseMappedSeqDependencies(file, text, versions, deps);
  parseSbtPlugins(file, text, deps);
}

const byKey = new Map();
for (const dep of deps) {
  const key = `${dep.name}@${dep.version}`;
  const existing = byKey.get(key);
  if (existing) {
    existing.occurrences.push({ source: dep.source, line: dep.line, coverage: dep.coverage });
  } else {
    byKey.set(key, {
      name: dep.name,
      version: dep.version,
      ecosystem: dep.ecosystem,
      occurrences: [{ source: dep.source, line: dep.line, coverage: dep.coverage }],
    });
  }
}

const packages = [...byKey.values()].sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));

async function queryBatch(batch) {
  const body = {
    queries: batch.map((dep) => ({
      package: { ecosystem: dep.ecosystem, name: dep.name },
      version: dep.version,
    })),
  };
  const response = await fetch("https://api.osv.dev/v1/querybatch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`OSV querybatch failed: HTTP ${response.status} ${await response.text()}`);
  }
  return response.json();
}

const results = [];
for (let i = 0; i < packages.length; i += 100) {
  const batch = packages.slice(i, i + 100);
  const json = await queryBatch(batch);
  json.results.forEach((result, index) => {
    const dep = batch[index];
    results.push({ ...dep, vulns: result.vulns || [] });
  });
}

const vulnerable = results.filter((result) => result.vulns.length > 0);
const vulnIds = new Set(vulnerable.flatMap((result) => result.vulns.map((vuln) => vuln.id)));
const cveIds = new Set(vulnerable.flatMap((result) => (result.vulns || []).flatMap((vuln) => vuln.aliases || []).filter((alias) => alias.startsWith("CVE-"))));

function summarizeVuln(vuln) {
  const aliases = (vuln.aliases || []).slice(0, 5).join(", ");
  return aliases ? `${vuln.id} (${aliases})` : vuln.id;
}

const lines = [];
lines.push("# JVM OSV Direct Dependency Baseline");
lines.push("");
lines.push(`- Generated: \`${generatedAt}\``);
lines.push(`- Backend: \`${backendDir}\``);
lines.push("- Data source: OSV API `https://api.osv.dev/v1/querybatch`");
lines.push("- Ecosystem: Maven");
lines.push("- Scope: declared direct dependencies and SBT plugin declarations parsed from backend SBT source files.");
lines.push("- Limitation: this is not a full resolved dependency graph; Java/SBT are still required for transitive SCA and eviction evidence.");
lines.push("");
lines.push("## Summary");
lines.push("");
lines.push(`- Parsed package/version coordinates: **${packages.length}**`);
lines.push(`- Coordinates with OSV findings: **${vulnerable.length}**`);
lines.push(`- Unique OSV vulnerability ids: **${vulnIds.size}**`);
lines.push(`- Unique CVE aliases: **${cveIds.size}**`);
lines.push("");

lines.push("## Findings");
lines.push("");
if (vulnerable.length === 0) {
  lines.push("No OSV findings were returned for parsed direct coordinates.");
} else {
  lines.push("| Package | Version | Findings | First source |");
  lines.push("|---|---:|---|---|");
  for (const result of vulnerable) {
    const first = result.occurrences[0];
    const findingText = result.vulns.map(summarizeVuln).join("<br>");
    lines.push(`| \`${result.name}\` | \`${result.version}\` | ${findingText} | \`${first.source}:${first.line}\` |`);
  }
}
lines.push("");

lines.push("## Parsed Coordinates");
lines.push("");
lines.push("| Package | Version | Occurrences |");
lines.push("|---|---:|---|");
for (const result of results) {
  const occurrences = result.occurrences
    .slice(0, 4)
    .map((occurrence) => `\`${occurrence.source}:${occurrence.line}\``)
    .join(", ");
  const suffix = result.occurrences.length > 4 ? `, +${result.occurrences.length - 4} more` : "";
  lines.push(`| \`${result.name}\` | \`${result.version}\` | ${occurrences}${suffix} |`);
}
lines.push("");

lines.push("## Required Follow-Up");
lines.push("");
lines.push("1. Run the SBT/JVM baseline once Java and `sbt` are available to capture the resolved transitive dependency graph and evictions.");
lines.push("2. Triage the direct OSV findings above, prioritizing runtime dependencies before test/plugin-only dependencies.");
lines.push("3. Add a full JVM SCA tool gate when Java/SBT or another resolver-backed SCA tool is available.");

const report = `${lines.join("\n")}\n`;
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(reportPath, report);
fs.writeFileSync(artifactPath, report);
fs.writeFileSync(jsonArtifactPath, JSON.stringify({ generatedAt, backendDir, packages, results }, null, 2));

console.log(`Wrote report: ${reportPath}`);
console.log(`Wrote artifact: ${artifactPath}`);
console.log(`Wrote JSON: ${jsonArtifactPath}`);
console.log(`Parsed ${packages.length} coordinates; ${vulnerable.length} have OSV findings; ${vulnIds.size} unique OSV ids.`);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
NODE
