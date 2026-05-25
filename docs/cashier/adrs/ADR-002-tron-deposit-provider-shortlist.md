# ADR-002: Tron Deposit Provider Shortlist

**Status:** Proposed.
**Date:** 2026-05-25.

## Decision Driver

Maria from Manila should be able to deposit TRC-20 USDT by sending to an address.
If she must understand TronLink approvals, bridge calldata, or multi-step signing,
the provider fails the V1 cashier UX.

## Current Recommendation

Shortlist **Relay deposit addresses first**. Keep Symbiosis, LI.FI, and deBridge
as fallback bridge infrastructure, not the default V1 cashier deposit UX.

Official provider docs show this split:

- Relay deposit addresses support sending funds to a deposit address with no wallet
  connection or signing, then tracking by deposit address or request id.
- Symbiosis API flow requires getting swap calldata, approving tokens when needed,
  signing with the user wallet, and submitting a source-chain transaction.
- LI.FI route execution retrieves transactions for route steps, which still implies
  wallet-driven execution.
- deBridge DLN creates orders through source-chain transactions; its API returns
  transaction data to sign and submit rather than a passive cashier address.

## Required Spike

1. Verify Relay supports TRON USDT origin to the selected EVM settlement asset in
   production, not only in docs marketing copy.
2. Confirm whether Relay's open deposit addresses can be scoped safely per user
   and route for repeat deposits.
3. Confirm refund semantics for CEX-origin deposits. Do not auto-refund to sender
   when sender may be an exchange hot wallet.
4. Build a sandbox request/response transcript for:
   - address creation
   - deposit status polling
   - child request handling after regenerated quotes
   - stuck deposit reindexing
5. Define recovery states for wrong token, wrong chain, under-minimum amount, and
   quote-expired fills.

## Rejection Notes

Symbiosis, LI.FI, and deBridge may be excellent for wallet-native power users or
later withdrawal/bridge flows. They are not the default V1 deposit rail unless they
can produce an equivalent passive TRC-20 USDT address flow.

## Source Evidence

- Relay deposit addresses: https://docs.relay.link/features/deposit-addresses
- Relay supported routes/chains: https://docs.relay.link/references/api/api_resources/supported-routes
- Symbiosis API workflow: https://docs.symbiosis.finance/developer-tools/symbiosis-api
- LI.FI routes API: https://docs.li.fi/api-reference/advanced/get-a-set-of-routes-for-a-request-that-describes-a-transfer-of-tokens
- deBridge DLN API response: https://docs.debridge.com/dln-details/integration-guidelines/order-creation/creating-order/api-parameters/response
- deBridge DLN protocol overview: https://docs.debridge.com/dln-details/overview/protocol-overview
