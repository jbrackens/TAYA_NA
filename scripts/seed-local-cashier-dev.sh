#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required"
  exit 1
fi

psql "$DATABASE_URL" -f "$ROOT/services/cashier-api/migrations/001_cashier_core.sql"
psql "$DATABASE_URL" -f "$ROOT/services/cashier-api/seeds/local_cashier_seed.sql"
