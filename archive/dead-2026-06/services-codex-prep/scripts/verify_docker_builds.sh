#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
services=(
  phoenix-gateway
  phoenix-user
  phoenix-wallet
  phoenix-market-engine
  phoenix-betting-engine
  phoenix-events
  phoenix-retention
  phoenix-social
  phoenix-compliance
  phoenix-analytics
  phoenix-settlement
  phoenix-notification
  phoenix-cms
  stella-engagement
  phoenix-prediction
  phoenix-audit
  phoenix-support-notes
  phoenix-config
)

shared_context_services=(
  phoenix-wallet
  phoenix-betting-engine
  phoenix-events
  phoenix-retention
  phoenix-social
  phoenix-compliance
  phoenix-analytics
  phoenix-settlement
  phoenix-notification
  phoenix-cms
  stella-engagement
  phoenix-prediction
  phoenix-audit
  phoenix-support-notes
  phoenix-config
)

uses_shared_context() {
  local svc="$1"
  local item
  for item in "${shared_context_services[@]}"; do
    if [[ "$item" == "$svc" ]]; then
      return 0
    fi
  done
  return 1
}

for svc in "${services[@]}"; do
  echo "==> building ${svc}"
  if uses_shared_context "$svc"; then
    docker build -t "phoenix/${svc}:verify" -f "$ROOT/${svc}/Dockerfile" "$ROOT"
  else
    docker build -t "phoenix/${svc}:verify" "$ROOT/${svc}"
  fi
done

echo "==> building phoenix-outbox-worker"
docker build -t "phoenix/phoenix-outbox-worker:verify" -f "$ROOT/phoenix-common/Dockerfile.outbox-worker" "$ROOT/phoenix-common"
