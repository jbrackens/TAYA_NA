# SB-503 Provider Chaos Suite Report (2026-03-05)

Command: `make qa-provider-chaos`

- Result: **pass**
- Artifact: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/provider_chaos_suite_20260305_183130.md`
- JSON log: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/provider_chaos_suite_20260305_183130.json`
- stderr log: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/provider_chaos_suite_20260305_183130.log`

## Thresholds

1. Minimum executed chaos scenarios: `4`.
2. Maximum failed chaos scenarios: `0`.

## Covered Scenarios

1. Reconnect replay with checkpoint deduplication.
2. Reordered stream delivery and duplicate telemetry.
3. Dropped revision detection with gap telemetry.
4. Stream error propagation and error telemetry.
