# Geofencing & KYC — scaffolding + open legal decisions

**Status:** Scaffolding shipped, **DISABLED by default**. Depth pending legal sign-off.
**Date:** 2026-05-22
**Related:** ADR-0003/0004 (resolution + disputes), launch policy (crypto-native, outside-US).

Path shorthand: `gateway` = `apps/Phoenix-Predict-Combined/go-platform/services/gateway`.

## What ships now (and why it's off)

The confirmed launch posture is **crypto-native, outside-US only**. Enforcing a
jurisdiction/identity policy in code requires decisions that are **legal's to
make**, not engineering's. So the gates are built and wired but ship **off**:
flipping an env var turns them on with no code change. With the flags unset,
behavior is unchanged.

Two seams exist:

1. **Geofencing** (`gateway/internal/compliance/geo_gate.go`, `GeoGate`).
   Pure `Evaluate(country) -> (allowed, reason)`. Enforced on the trading path in
   `gateway/internal/http/pretrade_gate.go` (`checkPreTradeCompliance`, called
   from the `POST /api/v1/orders` handler).
2. **Trading KYC** (same `pretrade_gate.go`). Reuses the existing
   `compliance.KYCService` (the same service that already gates *withdrawals*
   just-in-time via `payments.KYCGate`).

The geo signal is read from an upstream edge/CDN header (Cloudflare's
`CF-IPCountry` by default) — the gateway does not do IP geolocation itself.
An **enabled** geo gate with **no** geo signal **fails closed** (an enabled gate
must not be silently bypassable by a missing header).

## Configuration (all default to off / no-op)

| Env var | Default | Meaning |
|---|---|---|
| `GEO_GATE_ENABLED` | `false` | Master switch for the jurisdiction gate. |
| `GEO_BLOCKED_COUNTRIES` | `US` | Comma-separated ISO-3166 alpha-2 deny list (used when no allowlist). |
| `GEO_ALLOWED_COUNTRIES` | *(empty)* | If non-empty, switch to **allowlist** mode (deny anything not listed). |
| `GEO_COUNTRY_HEADER` | `CF-IPCountry` | Request header carrying the caller's country. |
| `KYC_REQUIRED_FOR_TRADING` | `false` | Require an `approved` KYC status before placing an order. |

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

Until 1–5 are answered, the gates stay **off**. When answered: set the env vars
above (and, for KYC depth beyond a binary approved-check, extend
`checkPreTradeCompliance` / the `KYCService` accordingly).
