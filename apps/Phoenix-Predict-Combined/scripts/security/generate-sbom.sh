#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATE_TAG="$(date +%F)"
TS_TAG="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="$ROOT_DIR/revival/artifacts/sbom_${TS_TAG}"
SUMMARY_FILE="$OUT_DIR/summary.md"
REPORT_FILE="$ROOT_DIR/revival/21_SBOM_BASELINE.md"

mkdir -p "$OUT_DIR"

declare -a RESULTS

record_result() {
  local component="$1"
  local status="$2"
  local detail="$3"
  RESULTS+=("| $component | $status | $detail |")
}

run_npm_sbom() {
  local component="$1"
  local component_dir="$2"
  local output_file="$3"
  local error_file="$4"
  local cyclonedx_error_file="${output_file%.json}.cyclonedx-npm.error.log"

  if [[ ! -f "$component_dir/package.json" ]]; then
    record_result "$component" "blocked" "missing package.json in $component_dir"
    return
  fi

  local status=0
  if (
    cd "$component_dir"
    npm sbom --sbom-format cyclonedx --omit dev >"$output_file" 2>"$error_file"
  ); then
    status=0
  else
    status=$?
  fi

  if [[ $status -eq 0 ]]; then
    record_result "$component" "ok" "$output_file"
  else
    local cyclonedx_status=0
    if command -v npx >/dev/null 2>&1; then
      if (
        cd "$component_dir"
        npx -y @cyclonedx/cyclonedx-npm \
          --ignore-npm-errors \
          --output-format JSON \
          --output-file "$output_file" \
          --omit dev \
          --mc-type application \
          > /dev/null 2>"$cyclonedx_error_file"
      ); then
        cyclonedx_status=0
      else
        cyclonedx_status=$?
      fi
    else
      cyclonedx_status=127
    fi

    if [[ $cyclonedx_status -eq 0 ]] && [[ -s "$output_file" ]]; then
      record_result "$component" "ok" "$output_file (cyclonedx-npm fallback used; see $cyclonedx_error_file)"
      return
    fi

    local fallback_file="${output_file%.json}.fallback.yarn-list.jsonl"
    if [[ -f "$component_dir/yarn.lock" ]] && command -v yarn >/dev/null 2>&1; then
      local fallback_status=0
      if (
        cd "$component_dir"
        yarn list --production --json >"$fallback_file" 2>>"$error_file"
      ); then
        fallback_status=0
      else
        fallback_status=$?
      fi

      if [[ $fallback_status -eq 0 ]]; then
        record_result "$component" "partial" "$fallback_file (npm sbom failed: see $error_file; cyclonedx-npm failed: see $cyclonedx_error_file)"
        return
      fi
    fi
    record_result "$component" "blocked" "$error_file"
  fi
}

run_go_module_inventory() {
  local module_name="$1"
  local module_dir="$2"
  local output_file="$3"
  local error_file="$4"

  if [[ ! -f "$module_dir/go.mod" ]]; then
    record_result "$module_name" "blocked" "missing go.mod in $module_dir"
    return
  fi

  local status=0
  if (
    cd "$module_dir"
    go list -m -json all >"$output_file" 2>"$error_file"
  ); then
    status=0
  else
    status=$?
  fi

  if [[ $status -eq 0 ]]; then
    record_result "$module_name" "ok" "$output_file"
  else
    record_result "$module_name" "blocked" "$error_file"
  fi
}

run_backend_inventory() {
  local backend_dir="$ROOT_DIR/phoenix-backend"
  local classpath_file="$OUT_DIR/phoenix-backend_dependency-classpath.log"
  local classpath_err="$OUT_DIR/phoenix-backend_dependency-classpath.error.log"
  local declared_file="$OUT_DIR/phoenix-backend_declared-dependencies.txt"

  if [[ ! -d "$backend_dir" ]]; then
    record_result "phoenix-backend" "blocked" "missing backend directory"
    return
  fi

  local status=0
  if (
    cd "$backend_dir"
    export JAVA_HOME="${JAVA_HOME:-$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home -v 17 2>/dev/null || true)}"
    if [[ -z "${JAVA_HOME:-}" ]]; then
      exit 11
    fi
    sbt -Dsbt.log.noformat=true "show phoenix-backend / Compile / externalDependencyClasspath" >"$classpath_file" 2>"$classpath_err"
  ); then
    status=0
  else
    status=$?
  fi

  if [[ $status -eq 0 ]]; then
    record_result "phoenix-backend (resolved classpath)" "ok" "$classpath_file"
  else
    record_result "phoenix-backend (resolved classpath)" "blocked" "$classpath_err"
  fi

  (
    cd "$backend_dir"
    {
      echo "# Declared dependency lines from build.sbt"
      echo "# Generated on $(date -u +%FT%TZ)"
      echo
      rg -n "libraryDependencies|Dependencies\\.|%%|\\%\\%" build.sbt project/*.sbt project/project/*.sbt || true
    } >"$declared_file"
  )
  record_result "phoenix-backend (declared dependencies)" "ok" "$declared_file"
}

if ! command -v npm >/dev/null 2>&1; then
  echo "error: npm is required for sbom generation" >&2
  exit 1
fi

if ! command -v go >/dev/null 2>&1; then
  echo "warning: go binary not found; Go module inventory will be skipped"
fi

run_npm_sbom \
  "talon-backoffice" \
  "$ROOT_DIR/talon-backoffice" \
  "$OUT_DIR/talon-backoffice.cyclonedx.json" \
  "$OUT_DIR/talon-backoffice.cyclonedx.error.log"

run_npm_sbom \
  "phoenix-frontend-brand-viegg" \
  "$ROOT_DIR/phoenix-frontend-brand-viegg" \
  "$OUT_DIR/phoenix-frontend-brand-viegg.cyclonedx.json" \
  "$OUT_DIR/phoenix-frontend-brand-viegg.cyclonedx.error.log"

if command -v go >/dev/null 2>&1; then
  run_go_module_inventory \
    "go-platform/modules/platform" \
    "$ROOT_DIR/go-platform/modules/platform" \
    "$OUT_DIR/go-platform-modules-platform.modules.jsonl" \
    "$OUT_DIR/go-platform-modules-platform.modules.error.log"
  run_go_module_inventory \
    "go-platform/services/auth" \
    "$ROOT_DIR/go-platform/services/auth" \
    "$OUT_DIR/go-platform-services-auth.modules.jsonl" \
    "$OUT_DIR/go-platform-services-auth.modules.error.log"
  run_go_module_inventory \
    "go-platform/services/gateway" \
    "$ROOT_DIR/go-platform/services/gateway" \
    "$OUT_DIR/go-platform-services-gateway.modules.jsonl" \
    "$OUT_DIR/go-platform-services-gateway.modules.error.log"
else
  record_result "go-platform/modules/platform" "blocked" "go binary not available"
  record_result "go-platform/services/auth" "blocked" "go binary not available"
  record_result "go-platform/services/gateway" "blocked" "go binary not available"
fi

run_backend_inventory

{
  echo "# SBOM Baseline Artifact Summary ($DATE_TAG)"
  echo
  echo "Artifact directory: \`$OUT_DIR\`"
  echo
  echo "| Component | Status | Artifact |"
  echo "|---|---|---|"
  printf '%s\n' "${RESULTS[@]}"
} >"$SUMMARY_FILE"

{
  echo "# SBOM Baseline ($DATE_TAG)"
  echo
  echo "Command: \`make security-sbom\`"
  echo
  echo "Latest artifact directory: \`$OUT_DIR\`"
  echo
  echo "Summary artifact: \`$SUMMARY_FILE\`"
  echo
  echo "| Component | Status | Artifact |"
  echo "|---|---|---|"
  printf '%s\n' "${RESULTS[@]}"
} >"$REPORT_FILE"

echo "SBOM artifacts generated in: $OUT_DIR"
echo "Summary: $SUMMARY_FILE"
