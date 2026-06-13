#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ARTIFACT_DIR="$ROOT/docs/runbooks/artifacts"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
ARTIFACT_PATH="${ARTIFACT_PATH:-$ARTIFACT_DIR/realtime_rehearsal_${STAMP}.md}"

mkdir -p "$ARTIFACT_DIR"

cd "$ROOT/phoenix-realtime"
go run ./cmd/rehearsal --artifact-path "$ARTIFACT_PATH" "$@"
