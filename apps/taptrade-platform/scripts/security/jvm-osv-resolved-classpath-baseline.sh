#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT/phoenix-backend"
REVIVAL_DIR="$ROOT/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_PATH="${JVM_OSV_RESOLVED_CLASSPATH_REPORT:-$REVIVAL_DIR/68_JVM_OSV_RESOLVED_CLASSPATH_BASELINE.md}"
TIMESTAMP="$(date -u +"%Y%m%d_%H%M%S")"
ARTIFACT_PATH="$ARTIFACT_DIR/jvm_osv_resolved_classpath_baseline_${TIMESTAMP}.md"
JSON_ARTIFACT_PATH="$ARTIFACT_DIR/jvm_osv_resolved_classpath_baseline_${TIMESTAMP}.json"
CLASSPATH_LOG="$ARTIFACT_DIR/jvm_resolved_classpath_${TIMESTAMP}.log"

mkdir -p "$ARTIFACT_DIR"

if [[ ! -d "$BACKEND_DIR" ]]; then
  echo "Backend directory not found: $BACKEND_DIR" >&2
  exit 1
fi

JAVA_HOME_CANDIDATE="${JAVA_HOME:-}"
if [[ -z "$JAVA_HOME_CANDIDATE" ]]; then
  JAVA_HOME_CANDIDATE="$(/usr/libexec/java_home -v 17 2>/dev/null || /usr/libexec/java_home -v 21 2>/dev/null || true)"
fi

if [[ -z "$JAVA_HOME_CANDIDATE" ]]; then
  echo "No JAVA_HOME candidate found; install Java 17+ or set JAVA_HOME." >&2
  exit 1
fi

if ! command -v sbt >/dev/null 2>&1; then
  echo "sbt is required for resolved JVM classpath SCA." >&2
  exit 1
fi

(
  cd "$BACKEND_DIR"
  export JAVA_HOME="$JAVA_HOME_CANDIDATE"
  sbt -Dsbt.log.noformat=true "show phoenix-backend / Compile / externalDependencyClasspath"
) >"$CLASSPATH_LOG" 2>&1

node - "$BACKEND_DIR" "$CLASSPATH_LOG" "$REPORT_PATH" "$ARTIFACT_PATH" "$JSON_ARTIFACT_PATH" <<'NODE'
const fs = require("fs");
const path = require("path");

async function main() {
  const [, , backendDir, classpathLog, reportPath, artifactPath, jsonArtifactPath] = process.argv;
  const generatedAt = new Date().toISOString();
  const text = fs.readFileSync(classpathLog, "utf8");

  function coordinateFromJar(jarPath) {
    const normalized = jarPath.replaceAll("\\", "/");
    const marker = "/maven2/";
    const markerIndex = normalized.indexOf(marker);
    if (markerIndex === -1) return null;
    const relative = normalized.slice(markerIndex + marker.length);
    const parts = relative.split("/");
    if (parts.length < 4) return null;
    const jarName = parts[parts.length - 1];
    if (!jarName.endsWith(".jar")) return null;
    const version = parts[parts.length - 2];
    const artifact = parts[parts.length - 3];
    const group = parts.slice(0, -3).join(".");
    if (!group || !artifact || !version) return null;
    return {
      ecosystem: "Maven",
      name: `${group}:${artifact}`,
      version,
      jarPath,
    };
  }

  const jarPathRegex = /(?:\/[^\s)'"]+?\.jar)/g;
  const byKey = new Map();
  for (const match of text.matchAll(jarPathRegex)) {
    const coordinate = coordinateFromJar(match[1] || match[0]);
    if (!coordinate) continue;
    const key = `${coordinate.name}@${coordinate.version}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.jarPaths.push(coordinate.jarPath);
    } else {
      byKey.set(key, {
        ecosystem: coordinate.ecosystem,
        name: coordinate.name,
        version: coordinate.version,
        jarPaths: [coordinate.jarPath],
      });
    }
  }

  const packages = [...byKey.values()].sort((a, b) =>
    `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`),
  );

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
  const cveIds = new Set(
    vulnerable.flatMap((result) =>
      (result.vulns || []).flatMap((vuln) => vuln.aliases || []).filter((alias) => alias.startsWith("CVE-")),
    ),
  );

  function summarizeVuln(vuln) {
    const aliases = (vuln.aliases || []).filter((alias) => alias.startsWith("CVE-")).slice(0, 3).join(", ");
    return aliases ? `${vuln.id} (${aliases})` : vuln.id;
  }

  const lines = [];
  lines.push("# JVM OSV Resolved Classpath Baseline");
  lines.push("");
  lines.push(`- Generated: \`${generatedAt}\``);
  lines.push(`- Backend: \`${backendDir}\``);
  lines.push(`- Resolved classpath log: \`${classpathLog}\``);
  lines.push("- Data source: OSV API `https://api.osv.dev/v1/querybatch`");
  lines.push("- Ecosystem: Maven");
  lines.push("- Scope: SBT-resolved `phoenix-backend / Compile / externalDependencyClasspath` jar coordinates.");
  lines.push("- Limitation: compile classpath evidence does not replace runtime smoke/compatibility validation or human residual-risk acceptance.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Resolved package/version coordinates: **${packages.length}**`);
  lines.push(`- Coordinates with OSV findings: **${vulnerable.length}**`);
  lines.push(`- Unique OSV vulnerability ids: **${vulnIds.size}**`);
  lines.push(`- Unique CVE aliases: **${cveIds.size}**`);
  lines.push("");
  lines.push("## Findings");
  lines.push("");
  if (vulnerable.length === 0) {
    lines.push("No OSV findings were returned for resolved classpath coordinates.");
  } else {
    lines.push("| Package | Version | Findings | Example jar |");
    lines.push("|---|---:|---|---|");
    for (const result of vulnerable) {
      const findingText = result.vulns.map(summarizeVuln).join("<br>");
      lines.push(`| \`${result.name}\` | \`${result.version}\` | ${findingText} | \`${result.jarPaths[0]}\` |`);
    }
  }
  lines.push("");
  lines.push("## Resolved Coordinates");
  lines.push("");
  lines.push("| Package | Version | Jar count |");
  lines.push("|---|---:|---:|");
  for (const result of results) {
    lines.push(`| \`${result.name}\` | \`${result.version}\` | ${result.jarPaths.length} |`);
  }
  lines.push("");
  lines.push("## Required Follow-Up");
  lines.push("");
  lines.push("- Review every resolved classpath OSV finding against launch runtime reachability and inherited compatibility constraints.");
  lines.push("- Remediate or explicitly accept residual JVM findings before Scenario 12 can pass.");
  lines.push("- Keep `security-jvm-required`, direct JVM OSV, and this resolved-classpath OSV baseline in launch readiness.");

  const payload = {
    generatedAt,
    backendDir,
    classpathLog,
    scope: "phoenix-backend / Compile / externalDependencyClasspath",
    packages,
    results,
    summary: {
      coordinateCount: packages.length,
      vulnerableCoordinateCount: vulnerable.length,
      uniqueOsvIds: vulnIds.size,
      uniqueCveAliases: cveIds.size,
    },
  };

  const body = `${lines.join("\n")}\n`;
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.writeFileSync(reportPath, body);
  fs.writeFileSync(artifactPath, body);
  fs.writeFileSync(jsonArtifactPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`Wrote report: ${reportPath}`);
  console.log(`Wrote artifact: ${artifactPath}`);
  console.log(`Wrote JSON: ${jsonArtifactPath}`);
  console.log(`Resolved ${packages.length} coordinates; ${vulnerable.length} have OSV findings; ${vulnIds.size} unique OSV ids.`);
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
NODE
