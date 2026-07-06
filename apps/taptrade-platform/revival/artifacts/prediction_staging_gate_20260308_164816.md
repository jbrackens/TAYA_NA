# Prediction Market Staging Gate (2026-03-08)

API base: `http://127.0.0.1:13551`
Reset prediction state: `1`

| Check | Result | Detail |
|---|---|---|
| reset local prediction state | pass | prediction tables and audit rows were cleared and reseeded before validation |
| login punter/operator/trader/admin | pass | all required staging identities authenticated |
| list prediction markets | pass | market catalog reachable |
| list punter orders before staging picks | pass | player order activity reachable before market selection |
| select mutable markets | pass | reversible=`pm-btc-120k-2026`, settlement=`pm-fed-cut-july-2026`, cancel=`pm-openai-gpt6-2026` |
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
| place prediction order | pass | punter can place prediction order on `pm-fed-cut-july-2026` |
| punter wallet balance after place | pass | wallet balance reachable after reservation |
| wallet reservation after place | pass | balance moved from `947.00` to `936.00` |
| trader suspend market | pass | trader can suspend `pm-btc-120k-2026` |
| trader reopen market | pass | trader can reopen `pm-btc-120k-2026` |
| trader resolve blocked | pass | trader cannot settle markets |
| admin cancel market | pass | admin can cancel `pm-openai-gpt6-2026` |
| admin resolve market | pass | admin can resolve `pm-fed-cut-july-2026` |
| admin resettle market | pass | admin can resettle `pm-fed-cut-july-2026` |
| list punter prediction orders | pass | player order activity endpoint reachable |
| order resettlement context | pass | order `po-e07aefe3-ca65-4590-9d82-a1f494c84b66` moved to `resettled` with previous status `won` |
| punter wallet balance after resettle | pass | wallet balance reachable after settlement correction |
| wallet reconciliation after resettle | pass | balance corrected to `936.00` after resettlement |
| punter wallet history | pass | wallet transaction history reachable |
| punter wallet history | pass | wallet transaction history reachable |
| prediction wallet descriptors | pass | wallet history carries product and prior-settlement context for `po-e07aefe3-ca65-4590-9d82-a1f494c84b66` |
| place cancellable prediction order | pass | created a second prediction order to validate cancel path |
| cancel open prediction order | pass | punter can cancel an open prediction order |
| cancel non-open prediction order rejected | pass | second cancel is rejected cleanly |
| audit filter suspended action | pass | prediction audit filter reachable for suspended action |
| audit suspended entry present | pass | found `1` suspended audit entries for `pm-btc-120k-2026` |
| audit filter resettled action | pass | prediction audit filter reachable for resettled action |
| audit resettled entry present | pass | found `1` resettled audit entries for `pm-fed-cut-july-2026` |
| prediction lifecycle history endpoint | pass | lifecycle history reachable for `pm-btc-120k-2026` |
| prediction lifecycle history contents | pass | captured `2` lifecycle entries for `pm-btc-120k-2026` |
