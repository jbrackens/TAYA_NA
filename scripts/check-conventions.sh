#!/usr/bin/env bash
# G-01: repo-wide CLAUDE.md convention gate.
#
# Fails if a banned pattern appears in production code. Each ban mirrors a
# "Never Do These" / Quality-Standards rule in CLAUDE.md, scoped to where that
# rule actually holds (the App Router production tree + the prediction Go
# domain). The external-symlink guard already runs in the Tests workflow
# (scripts/check-no-external-symlinks.sh); the "no raw fetch outside api-client"
# ban is deferred until P2-08 removes the existing raw fetches.
#
# Verify it works: introduce one violation on a branch -> this script exits 1.
#
# grep + exit codes: grep returns 1 when it finds NO matches, which for a BAN
# is success. So we never `set -e`; we collect matches and decide. `set -f`
# disables globbing so the literal --include=*.ts patterns reach grep intact.
set -uo pipefail
set -f

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

APP="apps/Phoenix-Predict-Combined/talon-backoffice/packages/app/app"
APIC="apps/Phoenix-Predict-Combined/talon-backoffice/packages/api-client/src"
PRED="apps/Phoenix-Predict-Combined/go-platform/services/gateway/internal/prediction"
TS="--include=*.ts --include=*.tsx"
TEST_RE="\.test\.|\.spec\.|__tests__|/tests/"

fails=0

report() { # $1=label  $2=matches
  if [ -n "$2" ]; then
    echo "::error::convention gate FAILED — $1"
    printf '%s\n' "$2" | sed 's/^/    /' | head -30
    fails=$((fails + 1))
  else
    echo "  ok  — $1"
  fi
}

echo "== G-01 repo-wide convention gate =="

# 1. No @ts-nocheck / @ts-ignore in App Router production (fix types, don't suppress).
report "no @ts-nocheck/@ts-ignore in app/" \
  "$(grep -rnE "@ts-(nocheck|ignore)" $TS "$APP" 2>/dev/null | grep -viE "$TEST_RE")"

# 2. No @taptrade-ui/design-system imports in app/ (styled-components -> webpack hang).
report "no @taptrade-ui/design-system import in app/" \
  "$(grep -rn "@taptrade-ui/design-system" $TS "$APP" 2>/dev/null)"

# 3. No console.* in app/ production (use the structured logger in lib/logger).
report "no console.* in app/ production" \
  "$(grep -rnE "console\.(log|warn|error|debug|info)" $TS "$APP" 2>/dev/null | grep -viE "$TEST_RE|lib/logger")"

# 4. No `any` type in app/ production (use unknown / proper interfaces).
report "no \`any\` type in app/ production" \
  "$(grep -rnE ":[[:space:]]*any([^A-Za-z0-9_]|$)|[^A-Za-z0-9_]as[[:space:]]+any([^A-Za-z0-9_]|$)|<any>|any\[\]" $TS "$APP" 2>/dev/null | grep -viE "$TEST_RE")"

# 5. No reintroduced sportsbook concepts in prediction Go (this is a prediction
#    market). Comment lines are excluded so legacy-explaining comments are fine;
#    real code referencing the banned tokens fails.
report "no sportsbook concepts in prediction Go" \
  "$(grep -rnE "fixtures|selections|betslip|sport_key|punter_bets|freebets|odds_boosts|match_tracker" "$PRED" --include="*.go" 2>/dev/null | grep -v "_test.go" | grep -vE "^[^:]+:[0-9]+:[[:space:]]*(//|\*)")"

# 6. No sportsbook concepts in the TS app + api-client production trees. Scoped to
#    UNAMBIGUOUS sportsbook tokens only: `fixtures`/`selections` are intentionally
#    NOT banned here because in the prediction app they are legitimate vocabulary
#    (a market "selection" is the user's YES/NO pick; "fixture" is test infra).
report "no sportsbook concepts in app/ + api-client/" \
  "$(grep -rnE "betslip|sport_key|punter_bets|freebets|odds_boosts|match_tracker" $TS "$APP" "$APIC" 2>/dev/null | grep -viE "$TEST_RE")"

echo "== convention gate: $fails ban(s) failed =="
[ "$fails" -eq 0 ] || exit 1
