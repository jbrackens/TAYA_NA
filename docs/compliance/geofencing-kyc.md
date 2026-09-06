# Geofencing & KYC — scaffolding + open legal decisions

**Status:** Built and **fail-closed in deployed environments** (boot policy
below). Local dev / the demo box (ENVIRONMENT unset) keep the gates off by
default. Country list pending legal sign-off.
**Date:** 2026-05-22 (boot policy + money-surface coverage added 2026-06-10; launch-posture
correction 2026-09-06)
**Related:** ADR-0003/0004 (resolution + disputes); `docs/taptrade-economy-rules.md` (launch model).

Path shorthand: `gateway` = `apps/taptrade-platform/go-platform/services/gateway`;
`scripts/` = `apps/taptrade-platform/scripts/`.

> **Launch-posture correction (2026-09-06).** This document was written against a
> "crypto-native, outside-US" launch. **That posture was reversed.** Since
> 2026-07-07 the launch model is a **non-redeemable Points economy** — see
> `docs/taptrade-economy-rules.md` and migration `050_points_unit_model.sql`.
> There is **no crypto rail, no withdrawal and no redemption of any kind**; the
> gateway refuses to boot in production/staging with
> `TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED=true` or `ALPHA_CASHIER_ENABLED=true`,
> and `internal/compliance/launch_safety.go` redacts "crypto", "deposit",
> "withdraw", "cash", "payout", "money" and "redeem" from user-visible copy.
>
> One money-in path does exist and is live: the **point store**
> (`/api/v1/store/*`, `STORE_ENABLED`, migration `051_store_point_packs.sql`,
> landed 2026-07-12) sells point packs for a USD price. It is closed-loop —
> money in, non-redeemable points out, no cash-out ever — and is a route tree
> entirely separate from the retired cashier. See `STORE_AND_PAYMENTS.md`.
> Its checkout is guarded by the same jurisdiction gate under the `deposit`
> surface.
>
> **The geo-gate and boot-policy machinery described below is real, current and
> load-bearing.** What has changed is which surfaces it guards (see below) and
> the framing of the open legal questions at the end.

## What ships now

The exact jurisdiction list is **legal's to choose**, not engineering's — but
defaulting to "everything off" in a deployed environment proved too easy to ship
by accident (audit blocker #3). So the posture is **deny-by-default in
production/staging** (see boot policy), while local dev keeps the convenient
defaults.

Two seams exist:

1. **Geofencing** (`gateway/internal/compliance/geo_gate.go`, `GeoGate`).
   Pure `Evaluate(country) -> (allowed, reason)`. Enforced in
   `gateway/internal/http/pretrade_gate.go` (`checkComplianceGates(r, userID,
   surface)`). The three surfaces are declared in
   `internal/compliance/gate_surface.go`:
   - `trade` — **live.** Order placement (`internal/http/prediction_handlers.go`)
     and the bot order path (`internal/http/bot_handlers.go`).
   - `deposit` — **live for one route only:** point-pack checkout
     (`POST /api/v1/store/checkout`, `internal/store/handlers.go` — "purchases
     are value-in: guarded by the same jurisdiction gate as the legacy deposit
     surface", owner decision 2026-07-12). The alpha-cashier deposit-intent and
     legacy `POST /api/v1/payments/deposit` call sites still carry the gate in
     source, but those route trees are **not registered** at launch —
     `internal/http/launch_boundary_test.go` asserts every one of them returns
     404 by default.
   - `withdraw` — **not reachable at launch.** The gate call sites exist in
     `internal/alphacashier/handlers.go` and `internal/payments/handlers.go`;
     both route trees are off, and the same boundary test pins them at 404.

   **Registration is deliberately un-gated**: creating an account is fine
   anywhere; trading and value-in are not.
2. **Trading KYC** (same `pretrade_gate.go`, `trade` surface only). Reuses the
   existing `compliance.KYCService`. The withdrawal-side KYC gate
   (`payments.KYCGate`) sits on a route tree that is off at launch.

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
| `KYC_ENFORCEMENT` | `false` | Gate withdrawals above `KYC_WITHDRAWAL_THRESHOLD_CENTS` (`internal/payments/handlers.go`; beta default `0` in the demo compose = every withdrawal). Dormant at launch — the withdrawal routes are not registered. The env name kept its `_CENTS` suffix through migration 050 because those legacy cashier amounts were genuinely cash cents. |
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

## Open decisions for legal / compliance

Re-scoped 2026-09-06 against the points-only launch. Decisions 1 and 2 still
block enabling the gate; 3, 4 and 5 are deferred until (and unless) a real-money
rail is reintroduced, which is itself an owner + counsel decision.

**Still blocking — needed before `GEO_GATE_ENABLED=true` in production:**

1. **Jurisdiction list.** A positive allowlist of permitted countries
   (allowlist mode is mandatory in production/staging — the gateway will not
   boot on a blocklist). Which states/territories? Any sanctioned-country
   blocks (OFAC, e.g. CU/IR/KP/RU/SY)?
2. **Geo source of truth.** Is edge IP-country (`CF-IPCountry`) sufficient, or
   is declared residence / document-derived country required? VPN/proxy
   tolerance?

**Deferred until a redemption path exists — not launch blockers:**

3. **KYC trigger & depth.** Tiers (email-only → doc-verified), provider,
   data-retention. `KYC_REQUIRED_FOR_TRADING` is the only KYC flag that has a
   live surface at launch; the withdrawal gate has no reachable route. Whether
   point-pack purchases above some cumulative spend should trigger KYC is a
   separate question that the store raises and this document does not answer.
4. **Virtual-currency nuance.** Whether a non-redeemable in-app unit changes the
   KYC/AML picture. With no withdrawal and no redemption, the travel-rule and
   money-transmission questions that prompted this item do not arise in the same
   form — the point store is closed-loop, value-in only. They return the moment
   value can leave. Needs counsel *before* any such change, not after.
5. **Records & reporting.** Suspicious-activity and transaction-reporting duties
   for the chosen jurisdictions; retention period for geo/KYC decisions.

Until 1 and 2 are answered, deployed environments run **staging-only acked
permissive mode** (production cannot boot ungated). When answered: set the env
vars above. For KYC depth beyond a binary approved-check, extend
`checkComplianceGates` / the `KYCService`.
