#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GO_DIR="$ROOT_DIR/go-platform"
ARTIFACT_DIR="$ROOT_DIR/revival/artifacts"
REPORT_FILE="$ROOT_DIR/revival/34_ABUSE_BOUNDARY_PROOF.md"

DATE_TAG="$(date -u +%F)"
TS_TAG="$(date -u +%Y%m%d_%H%M%S)"
RESULT_FILE="$ARTIFACT_DIR/abuse_boundary_${TS_TAG}.md"

mkdir -p "$ARTIFACT_DIR"

run_step() {
  local name="$1"
  shift
  local slug
  slug="$(echo "$name" | tr ' ' '_' | tr -cd '[:alnum:]_')"
  local log_file="$ARTIFACT_DIR/abuse_boundary_${TS_TAG}_${slug}.log"

  if "$@" >"$log_file" 2>&1; then
    echo "| $name | pass | \`$log_file\` |" >>"$RESULT_FILE"
    return 0
  fi

  echo "| $name | fail | \`$log_file\` |" >>"$RESULT_FILE"
  return 1
}

run_db_reward_cluster_step() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "error: docker is required for DB-backed multi-instance abuse proof"
    return 1
  fi

  local container="taptrade-abuse-boundary-pg-${TS_TAG}"
  trap "docker rm -f '$container' >/dev/null 2>&1 || true" RETURN

  docker run -d --rm \
    --name "$container" \
    -e POSTGRES_PASSWORD=postgres \
    -p 127.0.0.1::5432 \
    postgres:16-alpine

  local port=""
  for _ in $(seq 1 30); do
    port="$(docker port "$container" 5432/tcp 2>/dev/null | sed -E 's/.*:([0-9]+)$/\1/' | tail -n 1)"
    if [[ -n "$port" ]] && docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if [[ -z "$port" ]]; then
    echo "error: postgres test container did not publish a port"
    return 1
  fi
  docker exec "$container" pg_isready -U postgres

  local dsn="postgres://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable"
  (
    cd "$GO_DIR"
    WALLET_DB_DSN="$dsn" go test ./services/gateway/internal/wallet -run 'TestRewardClusterDBStoreBlocksAcrossServiceInstances' -count=1
  )
}

run_db_social_graph_step() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "error: docker is required for DB-backed multi-instance social graph proof"
    return 1
  fi

  local container="taptrade-social-boundary-pg-${TS_TAG}"
  trap "docker rm -f '$container' >/dev/null 2>&1 || true" RETURN

  docker run -d --rm \
    --name "$container" \
    -e POSTGRES_PASSWORD=postgres \
    -p 127.0.0.1::5432 \
    postgres:16-alpine

  local port=""
  for _ in $(seq 1 30); do
    port="$(docker port "$container" 5432/tcp 2>/dev/null | sed -E 's/.*:([0-9]+)$/\1/' | tail -n 1)"
    if [[ -n "$port" ]] && docker exec "$container" pg_isready -U postgres >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if [[ -z "$port" ]]; then
    echo "error: postgres test container did not publish a port"
    return 1
  fi
  docker exec "$container" pg_isready -U postgres

  local dsn="postgres://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable"
  (
    cd "$GO_DIR"
    GATEWAY_DB_DSN="$dsn" go test ./services/gateway/internal/http -run 'TestMarketSocialSQLStorePersistsAcrossServiceInstances|TestMarketSocialSQLWriteLimiterBlocksAcrossRouteInstances' -count=1
  )
}

{
  echo "# Abuse Boundary Proof ($DATE_TAG)"
  echo
  echo "| Suite | Result | Log |"
  echo "|---|---|---|"
} >"$RESULT_FILE"

overall=0

run_step "reward cluster migration ownership" \
  bash -lc "cd \"$GO_DIR\" && go test ./services/gateway/internal/wallet -run 'TestRewardClusterMigrationOwnsPersistentStore' -count=1" || overall=1

run_step "social write limiter migration ownership" \
  bash -lc "cd \"$GO_DIR\" && go test ./services/gateway/internal/http -run 'TestSocialWriteLimiterMigrationOwnsPersistentStore' -count=1" || overall=1

run_step "db-backed multi-instance reward cluster controls" \
  run_db_reward_cluster_step || overall=1

run_step "db-backed multi-instance social graph controls" \
  run_db_social_graph_step || overall=1

run_step "reward cluster and social multi-account controls" \
  bash -lc "cd \"$GO_DIR\" && go test ./services/gateway/internal/http -run 'TestWalletDailyClaimDeviceClusterLimitBlocksSecondUser|TestWalletDailyClaimDeviceClusterLimitPersistsAcrossRouteRestart|TestAdminWalletRewardClustersReturnsHashedReviewEvidence|TestWalletPointPackIPClusterLimitBlocksSecondUser|TestMarketSocialCommentRateLimitBlocksBurst|TestMarketSocialIPRateLimitBlocksMultiAccountBurst|TestMarketSocialIPRateLimitBlocksMultiAccountReports|TestMarketSocialIPRateLimitBlocksMultiAccountReactions|TestMarketSocialIPRateLimitBlocksMultiAccountFollows' -count=1" || overall=1

result="pass"
if [[ $overall -ne 0 ]]; then
  result="fail"
fi

{
  echo "# Abuse Boundary Proof ($DATE_TAG)"
  echo
  echo "Command: \`make qa-abuse-boundary\`"
  echo
  echo "- Result: **$result**"
  echo "- Artifact: \`$RESULT_FILE\`"
  echo
  echo "## Scope"
  echo
  echo "1. Reward cluster migration ownership for persistent hashed abuse-control state."
  echo "2. Social write limiter migration ownership for persistent shared token-bucket state."
  echo "3. DB-backed multi-instance reward-cluster blocking through two wallet service instances sharing one Postgres store."
  echo "4. DB-backed multi-instance social graph persistence and idempotency for comments, reactions, reports, follows, profiles, and activity."
  echo "5. DB-backed cross-instance social write limiter blocking for same-user and same-IP comment bursts across separate route instances."
  echo "6. Device-cluster daily-claim blocking for a second account, while allowing same-user idempotent retry."
  echo "7. Route-restart persistence of hashed reward-cluster evidence."
  echo "8. Admin reward-cluster review/export with hashed signals, sorted user IDs, PTS units, and no raw device IDs."
  echo "9. IP-cluster point-pack blocking for a second account."
  echo "10. Social write rate limits for same-user comment bursts."
  echo "11. Same-IP multi-account throttles for comments, reports, reactions, and follows."
  echo
  echo "## Gate Policy"
  echo
  echo "1. Blocked reward claims must not write point-ledger rows."
  echo "2. Abuse-control evidence must remain outside the point ledger and expose hashed review data only."
  echo "3. Blocked social writes must not persist the blocked comment, report, reaction, or follow."
  echo "4. DB-backed reward-cluster proof must block across separate service instances, not only across one in-memory router."
  echo "5. DB-backed social graph proof must preserve shared state across separate store instances."
  echo "6. DB-backed social write limiter proof must block same-user and same-IP bursts across separate route instances, not only one in-memory router."
  echo "7. This proof strengthens Scenario 12 but does not replace the deployed-like authenticated canonical journey."
} >"$REPORT_FILE"

echo "Abuse boundary artifact: $RESULT_FILE"
if [[ $overall -ne 0 ]]; then
  exit 1
fi
