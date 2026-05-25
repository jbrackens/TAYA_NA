# ADR-003: Embedded Wallet and Smart Account Shortlist

**Status:** Proposed.
**Date:** 2026-05-25.

## Decision Driver

The cashier should feel like a normal account to Maria while remaining
non-custodial. Login, recovery, trading, and withdrawals must not require seed
phrases, native gas, or browser-extension wallet knowledge.

## Current Recommendation

Evaluate **Privy + ERC-4337 smart wallets** and **thirdweb embedded wallets/smart
accounts** first.

Selection criteria:

- Non-custodial embedded user wallets.
- Email/social login with cross-device recovery.
- User export or credible portability story.
- Smart-account support with gas sponsorship.
- ERC-1271 signature compatibility for market/order flows.
- Server-side policy controls for relayer permissions without taking custody.
- Clear audit posture and incident response process.

## Why These Two First

Privy official docs describe self-custodial embedded wallets and native smart
wallet integrations controlled by embedded signers. thirdweb official docs classify
user wallets and ecosystem wallets as non-custodial and positioned for
frictionless app onboarding.

## Open Questions

1. Which provider can cleanly support the mobile web flows most common in the
   Philippines, Vietnam, and Indonesia?
2. Which provider gives the cleanest account-abstraction stack on the final
   settlement chain?
3. Can we keep market-order signing portable enough to swap providers later?
4. What transaction policy surface is available before a relayer submits trades or
   withdrawals?

## Source Evidence

- Privy embedded wallets: https://docs.privy.io/wallets/overview/embedded
- Privy smart wallets: https://docs.privy.io/wallets/using-wallets/evm-smart-wallets/overview
- thirdweb wallet types: https://portal.thirdweb.com/wallets/wallet-types
