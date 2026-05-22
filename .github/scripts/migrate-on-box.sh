#!/usr/bin/env bash
# One-shot DB migration runner for the Hetzner demo box.
#
# Invoked by .github/workflows/migrate-demo.yml over SSH as:
#   MIGRATE_CMD='up' bash -s < .github/scripts/migrate-on-box.sh
#
# deploy-demo.yml deliberately does NOT run migrations (one-time data ops), so
# this is the controlled path. It runs goose against the box's Postgres using
# the migration source already rsynced to /opt/phoenix by the last deploy, via a
# throwaway golang container on the same compose network as Postgres. The DSN is
# read from the running gateway container so we always target the right DB.
set -euo pipefail

case "${MIGRATE_CMD:-}" in
  status | up | down) ;;
  *)
    echo "::error::invalid migrate command: '${MIGRATE_CMD:-}' (expected status|up|down)"
    exit 1
    ;;
esac

cd /opt/phoenix
export JWT_SECRET=unused # required for docker compose env interpolation on this box
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.demo.yml"

# </dev/null so `docker compose exec` never reads the surrounding stdin.
DSN="$($COMPOSE exec -T gateway printenv GATEWAY_DB_DSN </dev/null | tr -d '\r')"
[ -n "$DSN" ] || {
  echo "::error::could not read GATEWAY_DB_DSN from the gateway container"
  exit 1
}

PG_CID="$($COMPOSE ps -q postgres)"
[ -n "$PG_CID" ] || {
  echo "::error::postgres container is not running"
  exit 1
}

NET="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}' "$PG_CID" | head -n1)"
[ -n "$NET" ] || {
  echo "::error::could not determine the postgres container network"
  exit 1
}

echo "Running goose '$MIGRATE_CMD' on network '$NET' (DSN read from the gateway container)"

# go.mod pins Go 1.25; golang:1.25 matches the gateway Dockerfile's builder.
docker run --rm --network "$NET" \
  -v /opt/phoenix/go-platform:/src -w /src/services/gateway \
  -e GATEWAY_DB_DSN="$DSN" \
  -e MIGRATIONS_DIR=/src/services/gateway/migrations \
  -e MIGRATE_CMD="$MIGRATE_CMD" \
  golang:1.25 sh -c '
    set -e
    echo "=== migrate status (before) ==="
    go run ./cmd/migrate status || true
    echo "=== migrate $MIGRATE_CMD ==="
    go run ./cmd/migrate "$MIGRATE_CMD"
    echo "=== migrate status (after) ==="
    go run ./cmd/migrate status
  '
