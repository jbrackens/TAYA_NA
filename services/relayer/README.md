# Tiangge Relayer

Gas sponsorship and user-operation submission boundary.

Responsibilities:

- Submit user-authorized wallet operations.
- Enforce policy before sending transactions.
- Keep provider API keys and paymaster credentials server-side.
- Record every submitted operation and final chain result.

Required controls:

- Domain-separated user signatures.
- Nonce and replay protection.
- Per-user, per-market, and per-withdrawal limits.
- Allowlisted contracts and calldata policies.

The relayer must never create a transaction that moves user funds without a
verifiable user authorization or an explicit recovery/admin workflow.

Additional design docs:

- [Policy](./POLICY.md)
- `fixtures/policy-approved-withdrawal.json`
- `fixtures/policy-approved-market-trade.json`
