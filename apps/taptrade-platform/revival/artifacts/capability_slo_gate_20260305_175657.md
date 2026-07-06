# Capability SLO Gate (2026-03-05)

Samples: `10`

Concurrency: `5`

| Capability | P95 (s) | P99 (s) | Throughput (rps) | Success Rate | Thresholds | Result |
|---|---|---|---|---|---|---|
| placement | 0.000829 | 0.000829 | 1448.23 | 1.0000 | p95<=0.30, p99<=0.60, rps>=15, success>=0.98 | pass |
| cashout_quote | 0.001062 | 0.001062 | 1198.32 | 1.0000 | p95<=0.30, p99<=0.60, rps>=15, success>=0.98 | pass |
| realtime_match_tracker | 0.000662 | 0.000662 | 1761.49 | 1.0000 | p95<=0.20, p99<=0.40, rps>=40, success>=0.99 | pass |
