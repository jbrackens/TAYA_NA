# GAP-47 — Fiat Multi-PSP Connectors: Formal Descope

**Decision basis (founder, 2026-07-02 DECISION ROUND):** the launch is
**crypto-native** — customer money moves via the **custodial native-USDT rail**
being built in the cashier workstream (P1-1), and non-custodial on-chain
settlement was formally descoped (`docs/pam/designs/p2-4-descope.md`). This note
is the spec-required record that the *absence of fiat payment-service-provider
connectors* is a deliberate scope decision, not an oversight. §22/§26.

## What is descoped

Fiat multi-PSP integration: card acquirers (Stripe/Adyen/Checkout-style),
bank-transfer / open-banking rails, e-wallet and local-APM connectors, and the
multi-PSP routing/failover layer that a fiat-enabled operator would need. None
of these are built, and none are planned for launch.

What is **retained** (not descoped) is the money-movement *back office* itself —
the withdrawals queue, the AWA (auto-withdrawal-approval) rules engine, and the
deposits view — built launch-safe and flag-gated OFF (P1-1,
`docs/pam/designs/p1-1-awa-auto-approval.md`; `internal/alphacashier`). Those
operate over the custodial USDT rail, not fiat PSPs. The rail itself
(`internal/payments/crypto_rail.go`) stays fail-closed until configured.

## Spec reconciliation

- **PAM spec §22 Payments, Deposits, and Withdrawals** — the *capability* (a
  cashier with deposits, a withdrawals queue, and auto-approval rules) is
  satisfied launch-safe by P1-1 over the USDT rail. The specific requirement for
  **fiat** deposit/withdrawal PSP connectors is the descoped part: there is no
  fiat on/off-ramp at launch.
- **PAM spec §26 Integrations, APIs, and Webhooks** — fiat PSP connectors are an
  integration *option*, not a mandate; §26's required integration surface (HMAC
  webhooks + the scoped partner API) is already built and unaffected.

## Two-Spec Precedence Rule

The Tiangge launch spec (§2, §19) hard-prohibits user-facing money paths in
launch mode (no fiat, no crypto, no withdrawals, no cashout, no redeemable
value). Per the Precedence Rule the PAM §22 capability is built launch-safe
(flag-gated OFF, no launch navigation, unreachability test — P1-1), and fiat PSP
connectors specifically are descoped because they inherently presuppose a fiat
money path the launch product does not have.

## Revisit criteria

Reopen this GAP as a normal backlog item if and when the operator adds a **fiat
on/off-ramp** (regulated fiat deposits/withdrawals). At that point a PSP vendor
selection (⚑) and connector build, routed through the existing cashier back
office and the compliance gates (KYC, sanctions screening, AML monitoring),
become in scope. Until then the crypto-native custodial USDT rail is the sole
money path and this omission is intentional.
