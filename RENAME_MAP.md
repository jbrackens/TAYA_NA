# TapTrade Rename Map (old → new; every entry must trace to inventory)

## Frozen token scheme
See CURRENT_STATE.md table. Entries below are CONCRETE artifacts as they are planned/executed.

## Planned (Phase 2 — not yet executed)
- brand.ts default: "Tiangge" → "TapTrade"; support/privacy/legal emails @tiangge.com → @taptrade.com
- BrandMark/wordmark strings, layout titles, locale files (7 locales × ~30 namespaces)
- public/brand/* asset filenames containing tiangge
- @phoenix-ui/* → @taptrade-ui/* (packages: app, office, api-client, utils, design-system, mock-server)
- Go module phoenix-revival/gateway → taptrade/gateway (+ all internal imports)
- docker images phoenix-gateway → taptrade-gateway, phoenix-auth → taptrade-auth,
  predict-frontend (no legacy token — keep)
- seed users *@phoenix.local → *@taptrade.local (auth service seeds + docs + tests)
- dirs (LAST): Phoenix-Predict-Combined → taptrade-platform; talon-backoffice → frontend

## Executed
- Batch A (iteration 2): tiangge→taptrade all case variants, CONTENT ONLY, scope =
  talon-backoffice/packages/{app,office,api-client} (76 files). Includes
  TianggeApiClient→TapTradeApiClient identifier + test assertions; brand.ts defaults;
  support/privacy/legal emails @tiangge.com→@taptrade.com; 7-locale display strings.
