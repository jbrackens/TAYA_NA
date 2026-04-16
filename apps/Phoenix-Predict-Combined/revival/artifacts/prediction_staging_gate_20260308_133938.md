# Prediction Market Staging Gate (2026-03-08)

API base: `http://127.0.0.1:13551`

| Check | Result | Detail |
|---|---|---|
| login punter/operator/trader/admin | pass | all required staging identities authenticated |
| list prediction markets | pass | market catalog reachable |
| select mutable markets | pass | reversible=`pm-fed-cut-july-2026`, settlement=`pm-solana-etf-2026`, cancel=`pm-jon-jones-return-2026` |
| operator prediction summary | pass | operator can view prediction oversight |
| operator order flow blocked | pass | operator cannot inspect punter prediction order flow |
| operator audit pivot blocked | pass | operator cannot open prediction-scoped audit trail |
| trader prediction summary | pass | trader can view prediction oversight |
| trader order flow | pass | trader can inspect prediction order flow |
| trader audit pivot | pass | trader can inspect prediction audit trail |
| admin prediction summary | pass | admin can view prediction oversight |
| admin order flow | pass | admin can inspect prediction order flow |
| admin audit pivot | pass | admin can inspect prediction audit trail |
| punter wallet balance before order | pass | wallet balance endpoint reachable |
| place prediction order | pass | punter can place prediction order on `pm-solana-etf-2026` |
| punter wallet balance after place | pass | wallet balance reachable after reservation |
| wallet reservation after place | pass | balance moved from `971.00` to `960.00` |
| trader suspend market | pass | trader can suspend `pm-fed-cut-july-2026` |
| trader reopen market | pass | trader can reopen `pm-fed-cut-july-2026` |
| trader resolve blocked | pass | trader cannot settle markets |
| admin cancel market | pass | admin can cancel `pm-jon-jones-return-2026` |
| admin resolve market | pass | admin can resolve `pm-solana-etf-2026` |
| admin resettle market | pass | admin can resettle `pm-solana-etf-2026` |
| list punter prediction orders | pass | player order activity endpoint reachable |
| order resettlement context | pass | order `po-1cf52274-e408-4da7-a7df-caca2d60e521` moved to `resettled` with previous status `won` |
| punter wallet balance after resettle | pass | wallet balance reachable after settlement correction |
| wallet reconciliation after resettle | fail | expected corrected balance `960.00`, got `969.00` |
