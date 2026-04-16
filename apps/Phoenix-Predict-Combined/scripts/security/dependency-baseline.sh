#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REVIVAL_DIR="$ROOT_DIR/revival"
ARTIFACT_DIR="$REVIVAL_DIR/artifacts"
REPORT_OUT="$REVIVAL_DIR/06_DEPENDENCY_VULNERABILITY_BASELINE.md"

BACKEND_REPO="$ROOT_DIR/phoenix-backend"
TALON_REPO="$ROOT_DIR/talon-backoffice"
SPORTSBOOK_REPO="$ROOT_DIR/phoenix-frontend-brand-viegg"

mkdir -p "$ARTIFACT_DIR"

TALON_AUDIT_LOG="$ARTIFACT_DIR/talon_yarn_audit_2026-03-02.log"
SPORTSBOOK_AUDIT_LOG="$ARTIFACT_DIR/sportsbook_yarn_audit_2026-03-02.log"

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

talon_exit="$(run_audit "$TALON_REPO" "$TALON_AUDIT_LOG")"
sportsbook_exit="$(run_audit "$SPORTSBOOK_REPO" "$SPORTSBOOK_AUDIT_LOG")"

tooling_gitleaks="$(command -v gitleaks || true)"
tooling_trufflehog="$(command -v trufflehog || true)"
tooling_osv="$(command -v osv-scanner || true)"
tooling_sbt="$(command -v sbt || true)"

backend_stack_versions="$(rg -n "val\\s+(scala|akka|akkaHttp|flyway|keycloak|logback|slick|tapir)\\s*=\\s*\\\"[0-9][^\\\"]*\\\"" "$BACKEND_REPO/project/Dependencies.scala" | sed 's|^|  - |')"
talon_next="$(node -e "const p=require('$TALON_REPO/packages/office/package.json'); process.stdout.write(p.dependencies.next || 'unknown');")"
sportsbook_next="$(node -e "const p=require('$SPORTSBOOK_REPO/packages/app/package.json'); process.stdout.write(p.dependencies.next || 'unknown');")"
talon_react="$(node -e "const p=require('$TALON_REPO/packages/office/package.json'); process.stdout.write(p.dependencies.react || 'unknown');")"
sportsbook_react="$(node -e "const p=require('$SPORTSBOOK_REPO/packages/app/package.json'); process.stdout.write(p.dependencies.react || 'unknown');")"

audit_blocker_note="none"
if grep -q "ENOTFOUND registry.yarnpkg.com" "$TALON_AUDIT_LOG" "$SPORTSBOOK_AUDIT_LOG" 2>/dev/null; then
  audit_blocker_note="DNS/network unavailable for registry.yarnpkg.com in this execution environment"
elif [[ "$talon_exit" == "137" || "$sportsbook_exit" == "137" ]]; then
  audit_blocker_note="yarn audit process terminated (exit 137) in this Codex runtime"
fi

cat > "$REPORT_OUT" <<EOF
# Dependency Vulnerability Baseline (2026-03-02)

## Scope
- \`$BACKEND_REPO\`
- \`$TALON_REPO\`
- \`$SPORTSBOOK_REPO\`

## Tooling Availability
- \`sbt\`: ${tooling_sbt:-not found}
- \`gitleaks\`: ${tooling_gitleaks:-not found}
- \`trufflehog\`: ${tooling_trufflehog:-not found}
- \`osv-scanner\`: ${tooling_osv:-not found}

## Executed Audit Commands
- Talon: \`yarn audit --level high --json\` (Node 20)
  - Exit code: **$talon_exit**
  - Log: \`revival/artifacts/$(basename "$TALON_AUDIT_LOG")\`
- Sportsbook: \`yarn audit --level high --json\` (Node 20)
  - Exit code: **$sportsbook_exit**
  - Log: \`revival/artifacts/$(basename "$SPORTSBOOK_AUDIT_LOG")\`

## Baseline Outcome
- Online vulnerability audits are currently **not producing advisory payloads** in this execution environment.
- Current blocker: **$audit_blocker_note**.
- Static dependency-risk baseline (version age / modernization pressure):
  - Talon frontend stack: Next **$talon_next**, React **$talon_react**
  - Sportsbook frontend stack: Next **$sportsbook_next**, React **$sportsbook_react**
  - Backend core library versions (selected):
$backend_stack_versions

## Risk Assessment (Initial)
- Frontend ecosystem is on legacy major lines (Next 11 / React 17 / Jest 25 era), which likely increases vulnerability and maintenance risk.
- Backend remains on legacy Scala/Akka stack targeted for migration; vulnerability posture must be rechecked with a dedicated SCA tool once available.

## Required Follow-Up
1. Re-run \`yarn audit --level high --json\` directly in host terminals (outside Codex runtime limits) and capture advisory counts by severity.
2. Add one dedicated SCA tool for JVM dependencies (for example OWASP Dependency-Check or Snyk CLI) and publish a backend report artifact.
3. Track remediation in backlog items B022/B023 (frontend upgrades) and Go-migration milestones for backend replacement.
EOF

echo "Dependency vulnerability baseline written to:"
echo "  $REPORT_OUT"
echo "  $TALON_AUDIT_LOG"
echo "  $SPORTSBOOK_AUDIT_LOG"
