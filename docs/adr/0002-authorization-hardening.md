# ADR-0002: Authorization hardening for admin + wallet mutations (P0)

**Status:** Proposed
**Date:** 2026-05-22
**Deciders:** Eng lead, John (CEO), security reviewer

> Source: production-readiness audit (2026-05-22). **P0 — ship this week.** See [README](./README.md).

## Context

Two confirmed, independently catastrophic holes plus one footgun, in a **value-bearing** system (internal wallet balances back real positions):

- **Wallet mint/burn:** `gateway/internal/http/wallet_handlers.go:22–72` — `POST /api/v1/wallet/credit` and `/debit` read `userId` + `amountCents` from the **request body** and mutate with **no role and no ownership check**. (The sibling GET handler at `:90–94` *does* enforce ownership — proving the omission is an oversight.) Any authenticated user can credit any account arbitrary amounts.
- **Admin escalation:** `gateway/internal/http/admin_handlers.go:1762–1779` — `requireAdminRole` grants admin if the request carries header `X-Admin-Role: admin` and *any* session is present (`:1773–1776`). This fallback is **not** environment-gated (only the separate `GATEWAY_ALLOW_ADMIN_ANON` dev bypass is). Any logged-in user can create/halt/void/**settle** markets (deciding winners and triggering payouts).
- **Kill switch:** `gateway/cmd/gateway/main.go:116–118` — `GATEWAY_AUTH_ENABLED=false` disables all auth middleware.

`RoleFromContext` is set from the validated session (auth service); the header fallback bypasses that source of truth.

Path shorthand: `gateway` = `apps/Phoenix-Predict-Combined/go-platform/services/gateway`.

## Decision

**Authorization derives only from the validated session role.** Remove header trust, restrict wallet-mutation HTTP endpoints to admin (or remove them — the trading/settlement paths use the in-process `WalletAdapter`, not these routes), and fail-closed in production.

## Options Considered — admin role source

### Option A: Session-role-only (delete the `X-Admin-Role` branch) *(Recommended)*
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low |
| Cost | ~1 day + test refactor |
| Security | Strong (single source of truth) |
| Team familiarity | High |

**Pros:** simplest, closes the hole completely.
**Cons:** tests/tools that set the header must switch to a seeded admin session.

### Option B: Signed service token / mTLS for internal callers
**Pros:** supports service-to-service auth.
**Cons:** infra overhead not needed today; larger surface. *Defer until a real internal caller exists.*

### Option C: Gate the header behind non-prod env only
**Pros:** minimal change, preserves test convenience.
**Cons:** still a staging footgun; header is already marked "deprecated, will be removed." *Acceptable 1-day interim, not the target.*

## Options Considered — wallet mutation endpoints

### Option A: Remove `/credit` & `/debit` from the public mux *(Recommended)*
Keep money movement on the **in-process adapter** that order/settlement already use; expose admin adjustments only via an explicit admin-gated, audited route.
**Pros:** smallest attack surface.
**Cons:** must confirm no frontend caller depends on them (*assumption: the order path uses the internal adapter — verify with a grep of the app/office API clients*).

### Option B: Keep endpoints, add `requireAdminRole` + ownership + audit
**Pros:** preserves an HTTP money API.
**Cons:** keeps a high-value endpoint exposed; only do this if a real consumer exists.

## Trade-off Analysis

A + A is the most secure with the least surface and is shippable as a **P0 hotfix this week**. The only cost is refactoring header-based tests to session-based — a one-time, healthy change.

## Consequences

- **Easier:** value integrity; a single auditable authorization path.
- **Harder:** tests/tooling must carry real admin sessions.
- **Revisit:** service-to-service auth (Option B) when an internal caller appears.

## Action Items

1. [ ] **Delete** the `X-Admin-Role` fallback (`admin_handlers.go:1773–1776`); keep `RoleFromContext`; keep/remove `GATEWAY_ALLOW_ADMIN_ANON` as dev-only.
2. [ ] **Remove** `/api/v1/wallet/credit|debit` from public registration (`wallet_handlers.go:21`), or wrap with `requireAdminRole` + ownership + amount sanity; **retain** the GET ownership check (`:90–94`).
3. [ ] `main.go`: **refuse to boot** when `GATEWAY_AUTH_ENABLED=false` and `ENVIRONMENT ∈ {production, staging}`.
4. [ ] **Regression tests:** non-admin + `X-Admin-Role: admin` → 403; player cannot credit any account; admin via session → 200; settle requires session admin.
5. [ ] **Audit log** every privileged wallet mutation and settlement (actor, target, amount, idempotency key).
6. [ ] **Sweep** all `requireAdminRole` / `RoleFromContext` call sites and `publicPrefixes` (`main.go`) for the same pattern.
7. [ ] Follow-on: review the public payments HMAC webhook (`PAYMENTS_WEBHOOK_SECRET`) trust model.
