# TapTrade Cashier Contracts

> **THREE INTERFACE SKETCHES — NOTHING IS IMPLEMENTED OR DEPLOYED.** This
> directory holds `INVARIANTS.md` and three `.sol` files
> (`IHulaCashierCollateral`, `IHulaCashierRecovery`,
> `IHulaCashierTradeAuthorization`). Every one is an `interface` declaration
> carrying a "do not deploy" notice. There is no implementation contract, no
> `foundry.toml`, no `hardhat.config.*`, no `package.json` and no test — this
> code has never been compiled by any tool in the repository. No contract was
> ever deployed to any network, and none will be: the product moved to
> non-redeemable points and settles nothing on chain.
>
> **Why it is still in the repository.**
> `scripts/check-cashier-contracts.mjs` asserts these files stay interfaces,
> keep their no-deploy notices, and that `INVARIANTS.md` still states five named
> invariants. It runs under `scripts/check-cashier-all.sh`, which the
> `cashier-guards` job in `.github/workflows/test.yml` executes on every push
> and pull request to `main`. Deleting this directory breaks CI until that job
> and that script are removed with it.
>
> **What replaced it.** Non-redeemable points. The design record for this
> workstream is archived at `docs/archive/cashier/`. The `Hula` prefix on the
> interface names is also stale — it predates the TapTrade naming.

The rest of this file records the intended scope. It is not a work plan.

Planned scope (never built):

- USD collateral wrapper or onramp adapter.
- Smart-wallet/account factory integration if not fully vendor-managed.
- Market spend permissions compatible with ERC-1271 signatures.
- Recovery hooks for failed bridge/onramp routes.

Not in scope:

- Custodial treasury deposit addresses.
- KMS withdrawal signer contracts.
- Direct Tron settlement.

No contract in this directory should touch mainnet funds before external audit.

Artifacts in this directory:

- [Contract invariants](./INVARIANTS.md)
- `src/IHulaCashierCollateral.sol`
- `src/IHulaCashierRecovery.sol`
- `src/IHulaCashierTradeAuthorization.sol`
