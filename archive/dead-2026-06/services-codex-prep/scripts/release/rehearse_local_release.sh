#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
REPORT_DIR="$ROOT/docs/runbooks/artifacts"
REPORT_FILE="$REPORT_DIR/local_release_rehearsal_${TIMESTAMP}.md"

mkdir -p "$REPORT_DIR"

run_step() {
  local name="$1"
  shift

  {
    echo "## $name"
    echo
    echo '```bash'
    printf '%q ' "$@"
    echo
    echo '```'
    echo
  } >>"$REPORT_FILE"

  if "$@" >>"$REPORT_FILE" 2>&1; then
    {
      echo
      echo "Result: PASS"
      echo
    } >>"$REPORT_FILE"
  else
    {
      echo
      echo "Result: FAIL"
      echo
    } >>"$REPORT_FILE"
    return 1
  fi
}

{
  echo "# Local Release Rehearsal"
  echo
  echo "- Generated: $(date -Iseconds)"
  echo "- Root: $ROOT"
  echo "- Skip overlays: ${SKIP_OVERLAYS:-0}"
  echo "- Skip docker: ${SKIP_DOCKER:-0}"
  echo "- Skip compose: ${SKIP_COMPOSE:-0}"
  echo
} >"$REPORT_FILE"

if [[ "${SKIP_OVERLAYS:-0}" != "1" ]]; then
  run_step "Validate Kubernetes Overlays" "$ROOT/scripts/validate_k8s_overlays.sh"
fi

if [[ "${SKIP_DOCKER:-0}" != "1" ]]; then
  run_step "Verify Docker Builds" "$ROOT/scripts/verify_docker_builds.sh"
fi

if [[ "${SKIP_COMPOSE:-0}" != "1" ]]; then
  run_step "Run Compose Integration" "$ROOT/phoenix-gateway/scripts/run_compose_integration.sh"
fi

{
  echo "## Final Status"
  echo
  echo "Rehearsal completed successfully."
  echo
} >>"$REPORT_FILE"

echo "rehearsal report: $REPORT_FILE"
