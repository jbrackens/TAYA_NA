#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OVERLAYS=(
  local
  staging
  production
)

render_overlay() {
  local overlay_path="$1"
  if command -v kubectl >/dev/null 2>&1; then
    kubectl kustomize "$overlay_path" >/dev/null
    return 0
  fi
  if command -v kustomize >/dev/null 2>&1; then
    kustomize build "$overlay_path" >/dev/null
    return 0
  fi
  echo "error: kubectl or kustomize is required to validate overlays" >&2
  return 1
}

for overlay in "${OVERLAYS[@]}"; do
  echo "==> validating overlay: ${overlay}"
  render_overlay "$ROOT/deploy/k8s/overlays/${overlay}"
done

echo "overlay validation passed"
