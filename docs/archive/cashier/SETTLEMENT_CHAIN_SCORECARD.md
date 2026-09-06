> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> A blank scorecard for a settlement-chain selection that never took place.
> See `CLAUDE.md` for current architecture.

# Settlement Chain Scorecard

**Status:** SUPERSEDED 2026-09-06 — abandoned workstream (was: "Template.").
**Date:** 2026-05-25.

Use this for Polygon, BSC, Base, and Arbitrum. Scores are 0-3.

| Criterion | Weight | Score | Evidence |
|---|---:|---:|---|
| TRC-20 USDT bridge route quality | 5 |  |  |
| Stablecoin liquidity and asset fit | 5 |  |  |
| Account abstraction/paymaster maturity | 5 |  |  |
| Direct exchange withdrawal familiarity in SEA | 4 |  |  |
| RPC/indexer reliability | 4 |  |  |
| Compliance/sanctions tooling coverage | 4 |  |  |
| Contract audit ecosystem maturity | 3 |  |  |
| User support burden | 3 |  |  |
| Gas economics during volatility | 3 |  |  |
| Polymarket-like market infra fit | 3 |  |  |
| Provider route availability | 3 |  |  |
| Operational monitoring quality | 2 |  |  |

## Hard Fails

- No reliable bridge route from TRC-20 USDT into user smart wallet/collateral.
- No viable gas sponsorship path.
- No acceptable RPC/indexer redundancy.
- No compliance tooling coverage.
- Requires Maria to manage native gas for normal trading/withdrawal.

## Decision

- Chain:
- Total weighted score:
- Pass/fail:
- Required follow-ups:
