# P2-4 — Non-Custodial On-Chain Settlement: Formal Descope

**Decision (founder, 2026-07-02):** FORMALLY DESCOPED. Settlement stays
off-chain in the existing idempotent settlement engine; customer money moves
via the custodial native-USDT rail being built in the cashier workstream.
This note is the spec-required record that the omission is a decision, not an
oversight. It gates ADR-0003/ADR-0004.

## What is descoped

The non-custodial on-chain settlement stack: settlement smart contracts, a
relayer, and a bridge — the "design seed" the PAM spec's §36 Progress Matrix
row "Custody / on-chain settlement" grades **Partial / design-seed** and §37
describes as "Custody is custodial off-chain today; the non-custodial
contracts/relayer [are] not runnable."

## Spec reconciliation

- **PAM spec §17 Settlement Operations** — fully satisfied by the existing
  off-chain engine: idempotent propose→challenge→finalize with disputes,
  listed in §37 as already built to spec. §17 does not require on-chain
  execution.
- **PAM spec §26 Integrations, APIs, and Webhooks** — the on-chain stack was
  an integration option, not a mandate; §37 explicitly frames it as a
  reconciliation delta ("does not change the requirements").
- **Tiangge launch spec §2 / §19** — hard-prohibit user-facing money paths at
  launch (no fiat, no crypto, no withdrawals, no cashout, no redeemable
  value). An on-chain settlement rail is the maximal violation of that
  posture; descoping it is the conservative reading of the Two-Spec
  Precedence Rule.
- **Launch policy** (crypto-native, outside-US, off-chain venue TBD): money
  movement is planned via a custodial USDT rail; positions settle off-chain.

## Consequences

1. ADR-0003 and ADR-0004 resolve as "off-chain settlement, custodial rail".
2. No contracts/relayer/bridge code is built, reviewed, or maintained; the
   protected settlement core is untouched.
3. The audit story for settlement remains the DB-trigger append-only audit +
   (post-P0-7) double-entry postings — auditor evidence is database-native.
4. The alpha cashier's wallet-address screening and the fail-closed
   `internal/payments/crypto_rail.go` seam remain as-is; they serve the
   custodial rail, not on-chain settlement.

## Revisit trigger

Only if the off-chain venue decision changes (launch policy's open item) or
a regulator/partner requires on-chain settlement finality. Revisit means a
full protected-core design review — never an autonomous build (the loop's
P2-4 guardrail: "⚑ major decision — never start").
