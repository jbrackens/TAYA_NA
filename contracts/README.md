# Hula Na! Cashier Contracts

Non-custodial contract boundary for the real cashier.

Planned scope:

- USD collateral wrapper or onramp adapter.
- Smart-wallet/account factory integration if not fully vendor-managed.
- Market spend permissions compatible with ERC-1271 signatures.
- Recovery hooks for failed bridge/onramp routes.

Not in scope:

- Custodial treasury deposit addresses.
- KMS withdrawal signer contracts.
- Direct Tron settlement.

No contract in this directory should touch mainnet funds before external audit.

Current artifacts:

- [Contract invariants](./INVARIANTS.md)
- `src/IHulaCashierCollateral.sol`
- `src/IHulaCashierRecovery.sol`
- `src/IHulaCashierTradeAuthorization.sol`
