# Geofencing & KYC — scaffolding + open legal decisions

**Status:** Built and **fail-closed in deployed environments** (boot policy
below). Local dev / the demo box (ENVIRONMENT unset) keep the gates off by
default. Country list pending legal sign-off.
**Date:** 2026-05-22 (boot policy + money-surface coverage added 2026-06-10)
**Related:** ADR-0003/0004 (resolution + disputes), launch policy (crypto-native, outside-US).

Path shorthand: `gateway` = `apps/Phoenix-Predict-Combined/go-platform/services/gateway`.

## What ships now

The confirmed launch posture is **crypto-native, outside-US only**. The exact
jurisdiction list is **legal's to choose**, not engineering's — but defaulting
to "everything off" in a deployed environment proved too easy to ship by
accident (audit blocker #3). So the posture is now **deny-by-default in
production/staging** (see boot policy), while local dev keeps the convenient
defaults.

Two seams exist:

1. **Geofencing** (`gateway/internal/compliance/geo_gate.go`, `GeoGate`).
   Pure `Evaluate(country) -> (allowed, reason)`. Enforced in
   `gateway/internal/http/pretrade_gate.go` (`checkComplianceGates(r, userID,
   surface)`) on three surfaces:
   - `trade` — `POST /api/v1/orders` (order placement)
   - `deposit` — alpha-cashier deposit-intent create + submit-tx, legacy
     `POST /api/v1/payments/deposit`
   - `withdraw` — alpha-cashier withdrawal-request create, legacy
     `POST /api/v1/payments/withdraw`

   **Registration is deliberately un-gated**: creating an account is fine
   anywhere; trading and money movement are not. This keeps support/test
   accounts usable from anywhere without weakening the money path.
2. **Trading KYC** (same `pretrade_gate.go`, `trade` surface only). Reuses the
   existing `compliance.KYCService` (the same service that already gates
   *withdrawals* just-in-time via `payments.KYCGate`).

## Boot policy (deny-by-default, `cmd/gateway/main.go`)

When `ENVIRONMENT` is `production` or `staging`, `validateGatewayRuntimeConfig`
**refuses to boot** unless:

- `GEO_GATE_ENABLED=true` **and** `GEO_ALLOWED_COUNTRIES` is non-empty —
  allowlist mode is mandatory for launch (a blocklist is too easy to
  under-specify), **and**
- `KYC_ENFORCEMENT` and `KYC_REQUIRED_FOR_TRADING` are each explicitly `true`
  or explicitly acknowledged off via `<VAR>_ACK_DISABLED=true` — no silent-off.

Exception: `BETA_COMPLIANCE_MODE=permissive` with `COMPLIANCE_STARTUP_ACK=true`
skips the gate requirements on **staging/demo only**. Permissive mode is
**invalid in production** (boot error, ack or no ack).

The geo signal is read from an upstream edge/CDN header (Cloudflare's
`CF-IPCountry` by default) — the gateway does not do IP geolocation itself.
An **enabled** geo gate with **no** geo signal **fails closed** (an enabled gate
must not be silently bypassable by a missing header).

## Configuration (defaults are for local dev; prod/staging boot demands the posture above)

| Env var | Default | Meaning |
|---|---|---|
| `GEO_GATE_ENABLED` | `false` | Master switch for the jurisdiction gate (trade + deposit + withdraw). |
| `GEO_BLOCKED_COUNTRIES` | `US` | Comma-separated ISO-3166 alpha-2 deny list (used when no allowlist). |
| `GEO_ALLOWED_COUNTRIES` | *(empty)* | If non-empty, switch to **allowlist** mode (deny anything not listed). Required in prod/staging. |
| `GEO_COUNTRY_HEADER` | `CF-IPCountry` | Request header carrying the caller's country. |
| `KYC_REQUIRED_FOR_TRADING` | `false` | Require an `approved` KYC status before placing an order. |
| `KYC_ENFORCEMENT` | `false` | Gate withdrawals above `KYC_WITHDRAWAL_THRESHOLD_CENTS` (beta default `0` in the demo compose = every withdrawal). |
| `KYC_ENFORCEMENT_ACK_DISABLED` | *(unset)* | Prod/staging: explicit acknowledgment that withdrawal KYC is off. |
| `KYC_REQUIRED_FOR_TRADING_ACK_DISABLED` | *(unset)* | Prod/staging: explicit acknowledgment that trading KYC is off. |

On a KYC-backend error the trading gate fails **closed** in production/staging
and **open** in development — the same posture as the withdrawal KYC gate.

Visibility: an admin can read resolution-source health at
`GET /api/v1/admin/resolution-sources`; geo/KYC denials are logged with the
user id and reason.

## Open decisions for legal / compliance (engineering is blocked on these)

1. **Jurisdiction list.** "Outside-US" — is that a single US block, or a
   positive allowlist of permitted countries? Which states/territories? Any
   sanctioned-country blocks (OFAC) beyond US (e.g. CU/IR/KP/RU/SY)?
2. **Geo source of truth.** Is edge IP-country (CF-IPCountry) sufficient, or is
   declared residence / document-derived country required? VPN/proxy tolerance?
3. **KYC trigger & depth.** Is KYC required to **trade**, only to **withdraw**
   (current), or above a **cumulative threshold**? What tiers (email-only →
   doc-verified)? Which provider? Data-retention obligations?
4. **Crypto-native nuance.** Does "value-bearing virtual currency, not fiat
   real-money" change the KYC/AML obligation vs. fiat? (Likely AML/travel-rule
   implications — needs counsel.)
5. **Records & reporting.** Suspicious-activity / transaction-reporting duties
   for the chosen jurisdictions; how long to retain geo/KYC decisions.

Until 1–5 are answered, deployed environments run **staging-only acked
permissive mode** (production cannot boot ungated). When answered: set the env
vars above (and, for KYC depth beyond a binary approved-check, extend
`checkComplianceGates` / the `KYCService` accordingly).
