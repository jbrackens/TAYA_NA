# ADR-004: Settlement Chain Shortlist

**Status:** Proposed.
**Date:** 2026-05-25.

## Decision Driver

Tron is the intake rail, not the market execution layer. Settlement needs mature
EVM tooling, stablecoin liquidity, account abstraction, monitoring, and audit
support.

## Current Recommendation

Keep **Polygon** and **BSC** as the V1 finalists. Treat **Base/Arbitrum** as
backup chains if bridge UX or account-abstraction economics beat both finalists.

## Polygon

Pros:

- Closest mental model to Polymarket.
- Mature prediction-market precedent.
- Strong USDC/USDC.e ecosystem and EVM tooling.

Concerns:

- Maria may not already hold Polygon assets.
- TRC-20 USDT into Polygon collateral must be excellent or the chain choice leaks
  into support burden.

## BSC

Pros:

- Familiar to Binance/OKX-heavy users.
- Strong USDT liquidity and direct exchange withdrawal support.
- Low fees and broad EVM compatibility.

Concerns:

- Less Polymarket-like.
- Risk/compliance signal can be noisier than Polygon/Base.
- Existing custodial BSC prototype creates product confusion, so naming and module
  boundaries must be crisp.

## Exit Criteria

1. 10/10 test deposits from TRC-20 USDT complete into destination collateral.
2. Gas-sponsored wrap/trade/redeem/withdraw flows work without native-token prompts.
3. RPC/indexing stack handles reorgs, delayed finality, and duplicate callbacks.
4. Chain analytics/sanctions tooling covers inbound and outbound addresses.
5. Withdrawal UX supports the expected destinations for SEA users.
