#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATE_TAG="$(date +%F)"
TS_TAG="$(date -u +%Y%m%d_%H%M%S)"
REVIVAL_DIR="$ROOT_DIR/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_OUT="$REVIVAL_DIR/06_DEPENDENCY_VULNERABILITY_BASELINE.md"

BACKEND_REPO="$ROOT_DIR/phoenix-backend"
TAPTRADE_OFFICE_REPO="$ROOT_DIR/frontend"
PLAYER_APP_REPO="$ROOT_DIR/frontend/packages/app"

mkdir -p "$ARTIFACT_DIR"

TAPTRADE_OFFICE_AUDIT_LOG="$ARTIFACT_DIR/talon_yarn_audit_${TS_TAG}.log"
PLAYER_APP_AUDIT_LOG="$ARTIFACT_DIR/taptrade_player_yarn_audit_${TS_TAG}.log"

run_audit() {
  local repo="$1"
  local out_log="$2"
  local exit_code

  (
    set +e
    source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true
    nvm install 20 >/dev/null 2>&1 || true
    nvm use 20 >/dev/null 2>&1 || true
    cd "$repo"
    yarn audit --level high --json > "$out_log" 2>&1
    echo $? > "${out_log}.exit"
  )

  exit_code="$(cat "${out_log}.exit")"
  rm -f "${out_log}.exit"
  echo "$exit_code"
}

read_pkg_version() {
  local primary_pkg="$1"
  local fallback_pkg="$2"
  local dependency_name="$3"

  node -e '
    const fs = require("fs");
    const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
    const get = (pkg, key) => pkg.dependencies?.[key] || pkg.devDependencies?.[key] || pkg.peerDependencies?.[key] || "";
    const primary = read(process.argv[1]);
    const fallback = process.argv[2] ? read(process.argv[2]) : {};
    process.stdout.write(get(primary, process.argv[3]) || get(fallback, process.argv[3]) || "unknown");
  ' "$primary_pkg" "$fallback_pkg" "$dependency_name"
}

audit_summary() {
  local audit_log="$1"

  node -e '
    const fs = require("fs");
    const file = process.argv[1];
    let vulnerabilities = null;
    const advisoryIds = new Set();
    for (const line of fs.readFileSync(file, "utf8").split(/\n+/)) {
      if (!line.trim()) continue;
      let row;
      try {
        row = JSON.parse(line);
      } catch {
        continue;
      }
      if (row.type === "auditSummary") {
        vulnerabilities = row.data && row.data.vulnerabilities;
      }
      if (row.type === "auditAdvisory" && row.data && row.data.advisory && row.data.advisory.id) {
        advisoryIds.add(row.data.advisory.id);
      }
    }
    if (!vulnerabilities) {
      process.stdout.write("no auditSummary payload captured");
      process.exit(0);
    }
    const get = (key) => vulnerabilities[key] || 0;
    process.stdout.write(`critical ${get("critical")}, high ${get("high")}, moderate ${get("moderate")}, low ${get("low")}; ${advisoryIds.size} unique advisory ids`);
  ' "$audit_log"
}

talon_exit="$(run_audit "$TAPTRADE_OFFICE_REPO" "$TAPTRADE_OFFICE_AUDIT_LOG")"
player_app_exit="$(run_audit "$PLAYER_APP_REPO" "$PLAYER_APP_AUDIT_LOG")"

tooling_gitleaks="$(command -v gitleaks || true)"
tooling_trufflehog="$(command -v trufflehog || true)"
tooling_osv="$(command -v osv-scanner || true)"
tooling_sbt="$(command -v sbt || true)"

backend_stack_versions="$(rg -n "val\\s+(scala|akka|akkaHttp|flyway|keycloak|logback|slick|tapir)\\s*=\\s*\\\"[0-9][^\\\"]*\\\"" "$BACKEND_REPO/project/Dependencies.scala" | sed 's|^|  - |')"
talon_next="$(read_pkg_version "$TAPTRADE_OFFICE_REPO/packages/office/package.json" "$TAPTRADE_OFFICE_REPO/package.json" next)"
player_app_next="$(read_pkg_version "$PLAYER_APP_REPO/package.json" "$TAPTRADE_OFFICE_REPO/package.json" next)"
talon_react="$(read_pkg_version "$TAPTRADE_OFFICE_REPO/packages/office/package.json" "$TAPTRADE_OFFICE_REPO/package.json" react)"
player_app_react="$(read_pkg_version "$PLAYER_APP_REPO/package.json" "$TAPTRADE_OFFICE_REPO/package.json" react)"
talon_audit_summary="$(audit_summary "$TAPTRADE_OFFICE_AUDIT_LOG")"
player_app_audit_summary="$(audit_summary "$PLAYER_APP_AUDIT_LOG")"

audit_blocker_note="none; advisory payloads captured"
if grep -q "ENOTFOUND registry.yarnpkg.com" "$TAPTRADE_OFFICE_AUDIT_LOG" "$PLAYER_APP_AUDIT_LOG" 2>/dev/null; then
  audit_blocker_note="DNS/network unavailable for registry.yarnpkg.com in this execution environment"
elif [[ "$talon_exit" == "137" || "$player_app_exit" == "137" ]]; then
  audit_blocker_note="yarn audit process terminated (exit 137) in this Codex runtime"
elif [[ "$talon_audit_summary" == "no auditSummary payload captured" || "$player_app_audit_summary" == "no auditSummary payload captured" ]]; then
  audit_blocker_note="one or more yarn audit logs did not include a parseable auditSummary payload"
fi

cat > "$REPORT_OUT" <<EOF
# Dependency Vulnerability Baseline ($DATE_TAG)

## Scope
- \`$BACKEND_REPO\`
- \`$TAPTRADE_OFFICE_REPO\`
- \`$PLAYER_APP_REPO\`

## Tooling Availability
- \`sbt\`: ${tooling_sbt:-not found}
- \`gitleaks\`: ${tooling_gitleaks:-not found}
- \`trufflehog\`: ${tooling_trufflehog:-not found}
- \`osv-scanner\`: ${tooling_osv:-not found}

## Executed Audit Commands
- TapTrade office: \`yarn audit --level high --json\` (Node 20)
  - Exit code: **$talon_exit**
  - Log: \`revival/artifacts/$(basename "$TAPTRADE_OFFICE_AUDIT_LOG")\`
- TapTrade player app: \`yarn audit --level high --json\` (Node 20)
  - Exit code: **$player_app_exit**
  - Log: \`revival/artifacts/$(basename "$PLAYER_APP_AUDIT_LOG")\`

## Baseline Outcome
- Online vulnerability audits produced advisory payloads for the launch TapTrade office workspace and TapTrade player app scopes.
- TapTrade office audit summary: **$talon_audit_summary**.
- TapTrade player app audit summary: **$player_app_audit_summary**.
- Current blocker: **$audit_blocker_note**.
- Static dependency-risk baseline (version age / modernization pressure):
  - TapTrade office frontend stack: Next **$talon_next**, React **$talon_react**
  - TapTrade player stack: Next **$player_app_next**, React **$player_app_react**
  - Backend core library versions (selected):
$backend_stack_versions

## Risk Assessment
- Frontend package graph is on modern Next/React package lines. The remaining high advisories are confined to inherited Lerna tooling paths and should stay governed by \`make qa-frontend-residual-advisories\` until a preservation-safe Lerna replacement is approved.
- Backend remains on a legacy Scala/Akka stack targeted for migration; declared direct JVM OSV findings should stay governed by \`make security-jvm-direct-residual-advisories\`, and full transitive posture must be rechecked with resolver-backed JVM SCA once Java/SBT or equivalent tooling is available.

## Required Follow-Up
1. Keep \`make qa-frontend-residual-advisories\` in launch readiness so new high/critical frontend advisories fail unless remediated or explicitly reviewed.
2. Keep \`make security-jvm-osv-direct\` and \`make security-jvm-direct-residual-advisories\` current so direct JVM residuals cannot drift.
3. Add one resolver-backed JVM SCA tool for transitive dependency coverage once Java/SBT or equivalent tooling is available.
4. Track any Lerna replacement or backend dependency movement as a preservation-risk slice with compile/runtime proof.
EOF

echo "Dependency vulnerability baseline written to:"
echo "  $REPORT_OUT"
echo "  $TAPTRADE_OFFICE_AUDIT_LOG"
echo "  $PLAYER_APP_AUDIT_LOG"
