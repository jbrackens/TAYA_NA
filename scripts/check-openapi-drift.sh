#!/usr/bin/env bash
# G-04 — OpenAPI drift check (improvement-plan guardrail).
#
# Keeps api/openapi.yaml honest against the gateway's registered routes for the
# surface the spec covers. The spec is a CURATED public/partner subset, so this
# does NOT demand that every internal/admin route be documented. It checks:
#
#   (1) STALE SPEC (hard fail): every path documented in openapi.yaml must map
#       to a route actually registered in internal/http. Catches a renamed or
#       removed route left behind in the spec.
#   (2) UNDOCUMENTED NEW PUBLIC SURFACE (hard fail): any registered top-level
#       public /api/v1 group that is neither in the spec nor in the explicit
#       allow-list below. Adding a new public route without documenting it (or
#       consciously allow-listing it) → red. Admin routes (/api/v1/admin/...)
#       are exempt by design.
#
# Verify: add `mux.Handle("/api/v1/newpublic", …)` without documenting it → red.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GW="$ROOT/apps/Phoenix-Predict-Combined/go-platform/services/gateway"
SPEC="$GW/api/openapi.yaml"
HTTP_DIR="$GW/internal/http"

[ -f "$SPEC" ] || { echo "::error::openapi spec not found at $SPEC"; exit 1; }

# Public groups that exist on purpose but are intentionally NOT in the partner
# spec. Adding a group here is a conscious "won't document" decision.
ALLOWLIST_GROUPS=" banners bonuses content discover disputes leaderboards live-markets loyalty me punters referrals users wallet "

fail=0

# --- Documented paths (keys under `paths:` — two-space indented `/...:`). ---
docpaths="$(awk '
  /^paths:/        {inp=1; next}
  inp && /^[^[:space:]#]/ {inp=0}
  inp && /^  \// {
    line=$0; sub(/:[[:space:]]*$/,"",line); gsub(/[[:space:]]/,"",line); print line
  }' "$SPEC")"

# --- Registered routes (mux.Handle / HandleFunc string literals). ---
routes="$(grep -rhoE 'mux\.Handle(Func)?\("[^"]+"' "$HTTP_DIR" \
  | sed -E 's/.*Handle(Func)?\("//; s/"$//' | sed -E 's#/+$##' | sort -u)"

# (1) every documented path must be covered by some registered route prefix.
echo "== (1) documented paths must map to a registered route =="
while IFS= read -r d; do
  [ -z "$d" ] && continue
  matched=0
  while IFS= read -r r; do
    [ -z "$r" ] && continue
    if [ "$d" = "$r" ] || [ "${d#${r}/}" != "$d" ]; then matched=1; break; fi
  done <<< "$routes"
  if [ "$matched" -eq 0 ]; then
    echo "::error::documented path '$d' has no registered route (stale spec)"
    fail=1
  fi
done <<< "$docpaths"
[ "$fail" -eq 0 ] && echo "  ok — all documented paths resolve to a route"

# (2) new top-level public groups must be documented or allow-listed.
echo "== (2) registered public groups must be documented or allow-listed =="
documented_groups="$(echo "$docpaths" | awk -F/ '/^\/api\/v1\//{print $4}' | sort -u)"
registered_groups="$(echo "$routes" | awk -F/ '/^\/api\/v1\//{print $4}' | sort -u)"
while IFS= read -r g; do
  [ -z "$g" ] && continue
  [ "$g" = "admin" ] && continue                               # admin exempt
  echo "$documented_groups" | grep -qx "$g" && continue        # documented
  [[ "$ALLOWLIST_GROUPS" == *" $g "* ]] && continue            # allow-listed
  echo "::error::public route group '/api/v1/$g' is registered but undocumented (add to the spec, or to the allow-list if intentional)"
  fail=1
done <<< "$registered_groups"
[ "$fail" -eq 0 ] && echo "  ok — no undocumented public groups"

if [ "$fail" -ne 0 ]; then
  echo "OpenAPI drift detected."
  exit 1
fi
echo "OpenAPI spec in sync with registered routes."
