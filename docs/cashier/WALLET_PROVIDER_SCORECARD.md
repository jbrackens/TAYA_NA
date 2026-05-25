# Wallet Provider and Smart Account Scorecard

**Status:** Template.
**Date:** 2026-05-25.

Use this for Privy, thirdweb, Web3Auth, Safe, ERC-4337 providers, and any
Polymarket-style proxy fork. Scores are 0-3.

| Criterion | Weight | Score | Evidence |
|---|---:|---:|---|
| Email/mobile login quality for Maria | 5 |  |  |
| Non-custodial key control and exportability | 5 |  |  |
| Smart-account integration maturity | 5 |  |  |
| Gas sponsorship/paymaster support | 5 |  |  |
| ERC-1271/order-signing compatibility | 4 |  |  |
| Deterministic address before deployment | 4 |  |  |
| Cross-device recovery UX | 4 |  |  |
| Regional reliability in PH/VN/ID | 3 |  |  |
| Security/audit posture | 3 |  |  |
| Vendor lock-in and portability | 3 |  |  |
| Pricing at beta and scale | 2 |  |  |
| Operational support/SLA | 2 |  |  |

## Hard Fails

- Custodial-only key model.
- No credible recovery/export story.
- User needs seed phrases or native gas for normal V1 actions.
- Cannot sign or validate market/order flows.
- Relayer cannot enforce policy before submission.

## Decision

- Provider/account pattern:
- Total weighted score:
- Pass/fail:
- Required follow-ups:
