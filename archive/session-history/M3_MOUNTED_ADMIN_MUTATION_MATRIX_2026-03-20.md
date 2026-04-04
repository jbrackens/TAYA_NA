# M3 Mounted Admin Mutation Matrix

**Date:** 2026-03-20 (R3 session)

---

## Sportsbook / Trading Surfaces

| Surface | Mounted? | Backend Truthful? | Live Validated? | Role-Aligned? | Remaining Risk | Blocker? |
|---------|----------|-------------------|-----------------|---------------|----------------|----------|
| Market suspend/reopen | YES | YES — state machine + FOR UPDATE lock (M40-M42) | YES — Playwright evidence | YES — operator/admin only | NONE | NO |
| Market settle (single-winner) | YES | YES — open/suspended → settled, reason field (M43-M44) | YES — Playwright evidence | YES — operator/admin only | NONE | NO |
| Market cancel | NO — gated in detail container | N/A | N/A | N/A | LOW — utils allow cancel on settled states, but not mounted | NO |
| Market edit/rename | NO — gated | N/A | N/A | N/A | NONE | NO |
| Market history drawer | NO — gated | N/A | N/A | N/A | NONE | NO |
| Bet cancel (admin lifecycle) | YES | YES — validates pending/matched status | Code review | YES — operator/admin | NONE | NO |
| Bet refund (admin lifecycle) | YES | YES — validates open status, releases reservation | Code review | YES — operator/admin | NONE | NO |
| Bet settle (admin lifecycle) | YES | YES — validates open status + rejects multi-leg (M45) | Code review | YES — operator/admin | NONE | NO |
| Fixture freeze/unfreeze | NO — page 404 (route mismatch) | N/A | N/A | N/A | LOW — not reachable | NO |
| Fixture detail embedding | NO — page 404 | N/A | N/A | N/A | LOW | NO |

## Provider-Ops Surfaces

| Surface | Mounted? | Backend Truthful? | Live Validated? | Role-Aligned? | Remaining Risk | Blocker? |
|---------|----------|-------------------|-----------------|---------------|----------------|----------|
| Provider cancel | YES | YES — resolves against wallet transactions | Code review | YES — admin/operator/trader | NONE | NO |
| Feed health dashboard | YES (read-only) | YES | Code review | YES | NONE | NO |
| Stream acknowledgements | YES | YES — persisted ack/reassign/resolve/reopen | Code review | YES | NONE | NO |
| Acknowledgement SLA settings | YES | YES — persisted threshold updates | Code review | YES | NONE | NO |

## Cashier Review Surfaces

| Surface | Mounted? | Backend Truthful? | Live Validated? | Role-Aligned? | Remaining Risk | Blocker? |
|---------|----------|-------------------|-----------------|---------------|----------------|----------|
| Payment approve | YES | PARTIAL — no state validation in service layer | Code review | YES — admin | **CRITICAL** — buttons unconditional | NO (payment domain) |
| Payment decline | YES | PARTIAL — no state validation in service layer | Code review | YES — admin | **CRITICAL** | NO |
| Payment settle | YES | PARTIAL — no state validation | Code review | YES — admin | **CRITICAL** | NO |
| Payment refund | YES | PARTIAL — no state validation | Code review | YES — admin | **CRITICAL** | NO |
| Payment reverse | YES | PARTIAL — no state validation | Code review | YES — admin | **CRITICAL** | NO |
| Payment chargeback | YES | PARTIAL — no state validation | Code review | YES — admin | **CRITICAL** | NO |
| Payment retry | YES | PARTIAL — no state validation | Code review | YES — admin | **CRITICAL** | NO |

## Prediction-Ops Surfaces

| Surface | Mounted? | Backend Truthful? | Live Validated? | Role-Aligned? | Remaining Risk | Blocker? |
|---------|----------|-------------------|-----------------|---------------|----------------|----------|
| Prediction suspend/open | YES | PARTIAL — no state transition validation | Code review | YES — admin/trader | MEDIUM — UI gates correctly | NO |
| Prediction cancel | YES | PARTIAL — no state transition validation | Code review | YES — admin only | MEDIUM | NO |
| Prediction resolve | YES | PARTIAL — no state transition validation | Code review | YES — admin only | MEDIUM | NO |
| Prediction resettle | YES | PARTIAL — no state transition validation | Code review | YES — admin only | MEDIUM-HIGH | NO |

---

## Summary

| Domain | Total Actions | Mounted | Truthful | Live Validated | False Controls |
|--------|--------------|---------|----------|----------------|----------------|
| Sportsbook/Trading | 10 | 5 | 5/5 | 3/5 (Playwright) | 0 |
| Provider-Ops | 4 | 4 | 4/4 | 0/4 (code review) | 0 |
| Cashier | 7 | 7 | 0/7 (partial) | 0/7 | 7 |
| Prediction | 4 | 4 | 0/4 (partial) | 0/4 | 0 (UI gates correctly) |

**M3 sportsbook scope:** All 5 mounted actions are truthful. 3/5 have live Playwright evidence (M40-M44). 2/5 (bet cancel, bet refund) validated by code review only. Provider-ops bet settle validated with two-layer multi-leg guard but no live browser evidence. **Status: CODE-COMPLETE / LIVE-VALIDATION-PENDING.** Blocker: Talon `next build` fails with `ERR_OSSL_EVP_UNSUPPORTED` (Node v22.22.0 / OpenSSL 3.5.4 vs webpack MD4), preventing live admin surface validation.
