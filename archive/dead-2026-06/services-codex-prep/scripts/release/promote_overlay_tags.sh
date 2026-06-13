#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat >&2 <<'EOF'
Usage: promote_overlay_tags.sh <staging|production> <image-tag>
EOF
}

if [[ $# -ne 2 ]]; then
  usage
  exit 1
fi

ENVIRONMENT="$1"
IMAGE_TAG="$2"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OVERLAY_FILE="$ROOT/deploy/k8s/overlays/${ENVIRONMENT}/kustomization.yaml"

case "$ENVIRONMENT" in
  staging|production)
    ;;
  *)
    usage
    exit 1
    ;;
esac

if [[ ! -f "$OVERLAY_FILE" ]]; then
  echo "error: overlay file not found: $OVERLAY_FILE" >&2
  exit 1
fi

tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

awk -v tag="$IMAGE_TAG" '
  /^[[:space:]]*newTag:/ {
    sub(/newTag:.*/, "newTag: " tag)
  }
  { print }
' "$OVERLAY_FILE" > "$tmp_file"

mv "$tmp_file" "$OVERLAY_FILE"

echo "updated ${ENVIRONMENT} overlay image tags to ${IMAGE_TAG}"
