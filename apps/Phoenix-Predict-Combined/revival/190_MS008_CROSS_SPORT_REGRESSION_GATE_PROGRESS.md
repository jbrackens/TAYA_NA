# MS-008 Cross-Sport Regression Gate Progress

Date: 2026-03-06  
Scope: Phase 9 item 8 (cross-sport replay/load/non-regression safety) by adding a repeatable runtime regression gate that layers lightweight load checks on top of per-sport smoke validation and esports compatibility.

## Delivered

1. Added a combined regression gate script:
   - `scripts/qa/sports-regression-gate.sh`
2. Gate flow now runs:
   - baseline `sports-route-smoke` checks (non-esports + esports compatibility wrapper parity)
   - iterative lightweight load loop across:
     - `GET /api/v1/sports/{sport}/events`
     - `GET /api/odds-feed/fixtures/?sport={sport}`
3. Added Make target:
   - `make qa-sports-regression`
4. Added `make help` discoverability entry.

## Files Changed

1. `scripts/qa/sports-regression-gate.sh`
2. `Makefile`

## Validation

1. Gate run against live local gateway + sportsbook:

```bash
FRONTEND_BASE_URL=http://127.0.0.1:3000 \
GATEWAY_BASE_URL=http://127.0.0.1:18080 \
ITERATIONS=3 \
bash ./scripts/qa/sports-regression-gate.sh
```

Result: pass.

2. Smoke script syntax guard (dependency of gate):

```bash
bash -n scripts/qa/sports-route-smoke.sh
```

Result: pass.

## Notes

1. This is the runtime/load gate foundation for MS-008; replay/non-regression logic remains covered by existing canonical/provider suites (`qa-regression-pack`, `qa-provider-conformance`, `qa-provider-chaos`).
2. Next step is to decide where to enforce this gate (manual release checklist vs automated launch-readiness pipeline with controlled local stack startup).
