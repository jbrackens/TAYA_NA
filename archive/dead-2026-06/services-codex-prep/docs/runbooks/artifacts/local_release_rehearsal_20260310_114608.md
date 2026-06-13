# Local Release Rehearsal

- Generated: 2026-03-10T11:46:08+01:00
- Root: /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep
- Skip overlays: 0
- Skip docker: 1
- Skip compose: 0

## Validate Kubernetes Overlays

```bash
/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/validate_k8s_overlays.sh 
```

==> validating overlay: local
==> validating overlay: staging
==> validating overlay: production
overlay validation passed

Result: PASS

## Run Compose Integration

```bash
/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-gateway/scripts/run_compose_integration.sh 
```

 Network phoenix-it-1773139569_phoenix-net Creating 
 Network phoenix-it-1773139569_phoenix-net Created 
 Volume phoenix-it-1773139569_redis_data Creating 
 Volume phoenix-it-1773139569_redis_data Created 
 Volume phoenix-it-1773139569_postgres_data Creating 
 Volume phoenix-it-1773139569_postgres_data Created 
 Volume phoenix-it-1773139569_kafka_data Creating 
 Volume phoenix-it-1773139569_kafka_data Created 
 Container phoenix-it-1773139569-postgres Creating 
 Container phoenix-it-1773139569-postgres Created 
 Container phoenix-it-1773139569-redis Creating 
 Container phoenix-it-1773139569-kafka Creating 
 Container phoenix-it-1773139569-kafka Created 
 Container phoenix-it-1773139569-kafka-init Creating 
 redis The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8) and no specific platform was requested 
 Container phoenix-it-1773139569-redis Created 
 Container phoenix-it-1773139569-kafka-init Created 
 Container phoenix-it-1773139569-postgres Starting 
 Container phoenix-it-1773139569-postgres Started 
 Container phoenix-it-1773139569-postgres Waiting 
 Container phoenix-it-1773139569-postgres Waiting 
 Container phoenix-it-1773139569-postgres Healthy 
 Container phoenix-it-1773139569-redis Starting 
 Container phoenix-it-1773139569-postgres Healthy 
 Container phoenix-it-1773139569-kafka Starting 
 Container phoenix-it-1773139569-kafka Started 
 Container phoenix-it-1773139569-kafka Waiting 
 Container phoenix-it-1773139569-redis Started 
 Container phoenix-it-1773139569-kafka Healthy 
 Container phoenix-it-1773139569-kafka-init Starting 
 Container phoenix-it-1773139569-kafka-init Started 
=== RUN   TestComposeSettlementFailuresDoNotPersistState
--- PASS: TestComposeSettlementFailuresDoNotPersistState (7.70s)
=== RUN   TestComposeBetPlacementWalletFailureDoesNotPersistBet
--- PASS: TestComposeBetPlacementWalletFailureDoesNotPersistBet (4.59s)
=== RUN   TestComposeCashoutWalletFailureKeepsBetPending
--- PASS: TestComposeCashoutWalletFailureKeepsBetPending (4.38s)
=== RUN   TestComposeSettlementRollsBackWhenLaterWalletWriteFails
--- PASS: TestComposeSettlementRollsBackWhenLaterWalletWriteFails (5.12s)
=== RUN   TestComposeWithdrawalBlockedByReservedFundsLeavesWalletUntouched
--- PASS: TestComposeWithdrawalBlockedByReservedFundsLeavesWalletUntouched (4.16s)
=== RUN   TestComposeGatewayUserWalletBettingFlow
--- PASS: TestComposeGatewayUserWalletBettingFlow (9.86s)
=== RUN   TestComposeGatewayAuthRateLimitRecovery
--- PASS: TestComposeGatewayAuthRateLimitRecovery (2.42s)
=== RUN   TestComposeGatewayDownstreamRecovery
--- PASS: TestComposeGatewayDownstreamRecovery (2.95s)
PASS
ok  	github.com/phoenixbot/phoenix-gateway/integration	41.777s
=== RUN   TestProcessBatchRetriesAndPublishesRecoveredRows
%3|1773139641.249|FAIL|phoenix-producer#producer-1| [thrd:127.0.0.1:1/bootstrap]: 127.0.0.1:1/bootstrap: Connect to ipv4#127.0.0.1:1 failed: Connection refused (after 0ms in state CONNECT)
%3|1773139642.254|FAIL|phoenix-producer#producer-1| [thrd:127.0.0.1:1/bootstrap]: 127.0.0.1:1/bootstrap: Connect to ipv4#127.0.0.1:1 failed: Connection refused (after 0ms in state CONNECT, 1 identical error(s) suppressed)
--- PASS: TestProcessBatchRetriesAndPublishesRecoveredRows (2.33s)
=== RUN   TestProcessBatchBackpressureRetriesAcrossMultipleRows
%3|1773139643.596|FAIL|phoenix-producer#producer-3| [thrd:127.0.0.1:1/bootstrap]: 127.0.0.1:1/bootstrap: Connect to ipv4#127.0.0.1:1 failed: Connection refused (after 0ms in state CONNECT)
%3|1773139644.597|FAIL|phoenix-producer#producer-3| [thrd:127.0.0.1:1/bootstrap]: 127.0.0.1:1/bootstrap: Connect to ipv4#127.0.0.1:1 failed: Connection refused (after 0ms in state CONNECT, 1 identical error(s) suppressed)
--- PASS: TestProcessBatchBackpressureRetriesAcrossMultipleRows (5.37s)
PASS
ok  	github.com/phoenixbot/phoenix-common/pkg/outbox	8.410s

Result: PASS

## Final Status

Rehearsal completed successfully.

