# PAM Open Questions

Unresolved questions carried out of the investigation. Each should be answered by product,
legal, or engineering before or during the corresponding build phase.

## Product Questions

1. **Market microstructure:** central limit order book, AMM, or both behind
   `Market.microstructure`? Drives the trading-core design.
2. **Outcome types in scope:** binary only, or categorical and scalar markets too?
3. **Wallet model:** single/seamless wallet vs product-segregated wallets; is a separate
   bonus wallet required?
4. **Bonus reframing:** are trading-credit / fee-rebate / deposit bonuses with
   trading-volume turnover the right v1 model, or is loyalty a later concern?
5. **Case management depth:** full structured ticketing in v1, or notes+tags first with
   casework added later (no vendor evidences a distinct case module)?
6. **Loyalty/rewards:** in or out for v1 (currently Defer/P2)?
7. **Managed-service vs self-serve:** is full self-serve back office required day one, or is
   a managed phase acceptable (Bragg/EveryMatrix offer managed ops)?

## Legal / Compliance Questions

1. **Regulatory regime:** prediction markets under a financial/CFTC-style regime vs a
   gambling license — this changes KYC/AML, eligibility, reporting, and settlement
   obligations fundamentally.
2. **Jurisdiction scope:** which markets/states define launch, and therefore which
   self-exclusion registers, taxation frameworks, and certifications apply?
3. **Native sanctions/PEP vs vendor:** build native screening (GamMatrix-style) or rely on
   integrated KYC/AML vendors?
4. **Retention vs erasure:** how to reconcile immutable financial/audit retention with
   data-subject erasure rights (pseudonymization policy)?
5. **Statutory reporting:** which regulator report formats replace the OMEGA "Nevada" suite,
   and must they be scheduled/filed?
6. **Settlement governance:** what approval/oversight is legally required for manual market
   resolution and re-resolution (voids)?

## Technical Architecture Questions

1. **Backend technology:** datastore(s) for the ledger and trading state (strong consistency
   requirements); matching-engine approach.
2. **Idefix backend location:** where is the absent `/api/v1` backend, and can its
   schema/ledger inform the design? (Idefix audit open question.)
3. **Is `idefix-backoffice` canonical?** It is v0.0.0 (~8 commits, migration branch) vs
   `gstech-backoffice` (active, v2.7.1). Confirm the go-forward frontend.
4. **Webhook/eventing layer:** event bus + outbound webhooks (a gap across all four vendors) —
   confirm downstream consumers and delivery guarantees.
5. **Sibling apps:** were `affmore`, `affmore-affiliate`, `campa` ever built; do they share
   reusable libs?
6. **HTTP client:** confirm replacement of the legacy global-singleton fetch wrapper with a
   configurable injectable client.

## Data Model Questions

1. **Ledger account chart:** exact account structure (player cash, margin, house, fees,
   settlement, suspense) and currency handling.
2. **Reserved margin semantics:** how margin is computed and reserved per order/position.
3. **Position/settlement schema:** how positions close and settle for each outcome type;
   partial settlement?
4. **Audit chain:** hash-chaining scheme and storage for tamper-evidence.
5. **Brand Registry catalog:** which config keys are required (OMEGA's master switchboard is
   undocumented publicly).

## Operational Questions

1. **AWA rule defaults:** cumulative limits, deposit thresholds, day schedule, and
   manual-review triggers for v1.
2. **Dual-approval thresholds:** monetary thresholds and which actions require maker-checker.
3. **Segregation of duties:** exact role boundaries for settlement, adjustments, and config.
4. **SLAs:** case-type SLAs and escalation paths.
5. **Seed/demo data:** scope of fixtures needed to exercise all 20 acceptance scenarios.

## Prediction Market Specific Questions

1. **Settlement source/oracle:** trusted data source(s) for resolving markets and the trust
   model; manual override governance.
2. **Market-integrity rules:** which patterns (wash, spoof, collusion, insider, abnormal) are
   in scope for v1 surveillance, and detection thresholds?
3. **Exposure/risk limits:** house exposure caps per market and per trader; auto-suspension
   triggers.
4. **Order/trade lifecycle edge cases:** partial fills, self-trade prevention, cancel-on-close,
   re-resolution handling.
5. **Fees:** fee model (maker/taker, settlement fee) and how it posts to the ledger.

## Questions Answered During Investigation

1. **Do `gstech-backoffice` and `idefix-backoffice` relate?** — Yes: two generations of the
   **same** iGaming PAM frontend (`gstech` legacy CRA; `idefix` Nx rewrite, migration branch).
   Same org, modules, endpoints. (Idefix audit)
2. **Does any source contain a prediction-market trading domain?** — No. None of the four
   vendors, and neither Idefix repo, has markets/orders/positions/settlement. The only analog
   is a fixed-odds sportsbook bet ticket (gstech only). The trading core is greenfield.
3. **Is there an existing ledger?** — No double-entry ledger in the Idefix code; balances are
   server-computed scalars; the real ledger (if any) lives in the absent backend.
4. **What is the existing RBAC?** — Coarse boolean access flags (administratorAccess,
   paymentAccess, riskManager, etc.), not a granular role/permission model — to be replaced.
5. **What does OMEGA's operating model look like?** — Twelve top-level sections; standout
   modules are AWA auto-withdrawal, Nevada compliance suite, Brand Registry, Engage
   gamification, Player Tags, and Core Users RBAC + Staff Change Log + Dual Approval.
6. **What is the enterprise PAM baseline?** — 32 capabilities; ~11 are High-evidence across
   all four vendors (registration, lifecycle, 360 view, multi-brand/jurisdiction, KYC, AML,
   responsible gaming, wallets, payments/withdrawals, bonus/loyalty, reporting, integrations).
