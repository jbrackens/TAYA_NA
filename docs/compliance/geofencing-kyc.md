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
| `GEO_TRUSTED_PROXY_MODE` | *(unset)* | `require` = the deploy declares a trusted edge that always sets the country header; missing-signal denials then log at Error with a running counter (`missing_signal_denials_total`) so a broken edge is visible in minutes. |

## Edge geo signal (decision: Cloudflare proxy)

The gateway never geolocates IPs itself — it trusts `GEO_COUNTRY_HEADER`. The
chosen edge is **Cloudflare** (plan option (a)): demo/beta DNS is **proxied
(orange-cloud)** through Cloudflare (switched 2026-06-23), so Cloudflare sets
`CF-IPCountry` on every request with no code or image changes. CF SSL/TLS is
Full (Strict); ACME HTTP-01 challenges pass through CF to Caddy. The alternative (b) — a custom Caddy build with
`caddy-maxmind-geolocation` plus a GeoLite2 database and a MaxMind license to
keep it updated — adds an image build + data pipeline for no extra fidelity.

**Spoofing model and controls:**

1. **Through Cloudflare:** CF strips/overwrites any client-supplied
   `CF-IPCountry`; the value is trustworthy.
2. **At Caddy:** the Caddyfile deletes inbound `X-Geo-Country` toward the
   gateway (nothing legitimate sets it in this topology), so a stray
   `GEO_COUNTRY_HEADER=X-Geo-Country` misconfiguration cannot be spoofed
   through. `CF-IPCountry` is deliberately forwarded — Cloudflare is the one
   who sets it.
3. **Direct-to-origin bypass:** an attacker hitting the box IP directly can
   forge `CF-IPCountry`. Closing this is an on-box firewall step, part of
   enabling the gate (below).
4. **Defense in depth:** `GEO_TRUSTED_PROXY_MODE=require` makes
   missing-header denials loud (Error log + counter), so an edge break —
   misconfigured DNS, dropped header, traffic bypassing CF — surfaces in
   minutes instead of silently denying everyone (the gate fails closed
   either way).

**Runbook — enabling the geo gate on the demo/beta box:**

1. ~~Cloudflare DNS: flip to proxied (orange cloud).~~ **DONE** (2026-06-23).
2. ~~Firewall origin to CF IPs.~~ **DONE** — `scripts/security/cf-firewall.sh`
   runs automatically on every deploy (iptables, restricts `:80/:443` to
   Cloudflare IP ranges). `EDGE_SHARED_SECRET` anti-spoof also active.
3. Gateway env: `GEO_GATE_ENABLED=true`, `GEO_ALLOWED_COUNTRIES=<legal list>`,
   `GEO_TRUSTED_PROXY_MODE=require` (and drop `BETA_COMPLIANCE_MODE`).
4. **Manual spoof check** (from a host outside Cloudflare):
   - `curl -H "CF-IPCountry: SG" https://<origin-ip>/api/v1/...` must NOT
     reach the gateway (firewall drops it). If it does reach it, the
     firewall step failed — fix before launch.
   - A normal request through the domain from a non-allowlisted country (or
     `curl -H "CF-IPCountry: US"` via the domain — CF overwrites it) gets
     403 with the user-facing jurisdiction reason.
   - `docker logs predict_gateway | grep missing_signal_denials_total`
     stays flat while real traffic flows.

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
