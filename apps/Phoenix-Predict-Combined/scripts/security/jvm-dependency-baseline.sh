#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKEND_DIR="$ROOT/phoenix-backend"
REVIVAL_DIR="$ROOT/revival"
ARTIFACTS_DIR="$REVIVAL_DIR/artifacts"

mkdir -p "$ARTIFACTS_DIR"

RUN_DATE_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
RUN_DATE_LOCAL="$(date +"%Y-%m-%d")"
SBT_LOG="$ARTIFACTS_DIR/backend_sbt_update_${RUN_DATE_LOCAL}.log"
REPORT="$REVIVAL_DIR/12_JVM_DEPENDENCY_BASELINE.md"

JAVA_HOME_CANDIDATE="${JAVA_HOME:-}"
if [[ -z "$JAVA_HOME_CANDIDATE" ]]; then
  JAVA_HOME_CANDIDATE="$(/usr/libexec/java_home -v 21 2>/dev/null || /usr/libexec/java_home -v 17 2>/dev/null || true)"
fi

STATUS="success"
SUMMARY="SBT dependency baseline executed."
BLOCKER="none"
EXIT_CODE=0

if [[ ! -d "$BACKEND_DIR" ]]; then
  STATUS="failed"
  SUMMARY="Backend directory not found."
  BLOCKER="missing_backend_dir"
else
  {
    echo "# JVM baseline preflight"
    echo "run_date_utc=$RUN_DATE_UTC"
    echo "backend_dir=$BACKEND_DIR"
    echo "java_home_candidate=${JAVA_HOME_CANDIDATE:-<empty>}"
    echo "path=$PATH"
    echo
    echo "## command checks"
    if command -v java >/dev/null 2>&1; then
      echo "java=$(command -v java)"
      java -version
    else
      echo "java=not_found"
    fi
    if command -v sbt >/dev/null 2>&1; then
      echo "sbt=$(command -v sbt)"
      sbt --script-version
      sbt --version
    else
      echo "sbt=not_found"
    fi
    echo
    echo "## sbt baseline output"
  } >"$SBT_LOG" 2>&1

  if ! command -v sbt >/dev/null 2>&1; then
    STATUS="failed"
    SUMMARY="SBT binary not found in PATH."
    BLOCKER="sbt_not_found"
    EXIT_CODE=127
  elif [[ -z "$JAVA_HOME_CANDIDATE" ]]; then
    STATUS="failed"
    SUMMARY="No compatible JAVA_HOME candidate found (requires Java 17+)."
    BLOCKER="java_home_not_found"
    EXIT_CODE=127
  else
    set +e
    (
      cd "$BACKEND_DIR"
      export JAVA_HOME="$JAVA_HOME_CANDIDATE"
      sbt \
        -batch \
        -v \
        -Dsbt.log.noformat=true \
        -Dsbt.color=false \
        -Dsbt.supershell=false \
        "phoenix-backend/update" \
        "phoenix-backend/evicted"
    ) >>"$SBT_LOG" 2>&1
    EXIT_CODE=$?
    set -e
  fi

  if [[ $EXIT_CODE -ne 0 ]]; then
    STATUS="failed"
    SUMMARY="SBT dependency baseline command failed with exit code $EXIT_CODE (see artifact log)."
    BLOCKER="sbt_execution_failed"

    if rg -qi "sbt(\\:|\\s).*command not found|sbt=not_found" "$SBT_LOG"; then
      BLOCKER="sbt_not_found"
      SUMMARY="SBT binary not found in PATH."
    elif rg -qi "java=not_found|unable to locate a java runtime|java_home.*unable to find|no compatible java" "$SBT_LOG"; then
      BLOCKER="java_home_not_found"
      SUMMARY="Java runtime not available for SBT execution."
    elif rg -qi "unknownhostexception|temporary failure in name resolution|name or service not known|nodename nor servname provided" "$SBT_LOG"; then
      BLOCKER="dependency_repository_network_failure"
      SUMMARY="Dependency resolution failed due to repository network/DNS issues."
    elif rg -qi "outofmemoryerror|java heap space" "$SBT_LOG"; then
      BLOCKER="sbt_oom"
      SUMMARY="SBT failed due to JVM memory limits."
    elif rg -qi "## sbt baseline output|# Executing command line:" "$SBT_LOG" && ! rg -qi "welcome to sbt|loading settings for project|set current project to" "$SBT_LOG"; then
      BLOCKER="sbt_launcher_exit_no_output"
      SUMMARY="SBT launcher exited before build bootstrap logs were emitted."
    fi
  else
    if rg -q "\[warn\].*evicted|evicted by" "$SBT_LOG"; then
      SUMMARY="SBT baseline succeeded with eviction warnings (review artifact log)."
      BLOCKER="dependency_evictions_detected"
    fi
  fi

  set +e
  sbt_version_check="$(sbt --version 2>&1)"
  version_rc=$?
  set -e
  {
    echo
    echo "## postflight"
    echo "baseline_exit_code=$EXIT_CODE"
    echo "sbt_version_check_exit_code=$version_rc"
    echo "$sbt_version_check"
  } >>"$SBT_LOG"

  if [[ ! -s "$SBT_LOG" ]]; then
    echo "sbt exited with code $EXIT_CODE and produced no stdout/stderr output." >>"$SBT_LOG"
  fi
fi

{
  echo "# JVM Dependency Baseline (SBT)"
  echo
  echo "Date (UTC): $RUN_DATE_UTC"
  echo
  echo "## Scope"
  echo "- Backend: \`$BACKEND_DIR\`"
  echo "- Command: \`sbt -batch -v -Dsbt.log.noformat=true -Dsbt.color=false -Dsbt.supershell=false \"phoenix-backend/update\" \"phoenix-backend/evicted\"\`"
  echo
  echo "## Result"
  echo "- Status: **$STATUS**"
  echo "- Summary: $SUMMARY"
  echo "- Blocker: $BLOCKER"
  echo "- Exit code: $EXIT_CODE"
  echo
  echo "## Artifact"
  echo "- \`$SBT_LOG\`"
  echo
  echo "## Notes"
  echo "- This baseline does not yet include CVE resolution; it captures dependency graph/eviction visibility for follow-up SCA gating."
  if [[ "$STATUS" == "failed" ]]; then
    echo "- If failure is network related, rerun once connectivity to artifact repositories is available."
  fi
} >"$REPORT"

echo "Wrote report: $REPORT"
echo "Wrote log:    $SBT_LOG"
