# Phoenix Sportsbook: Operational Runbooks

Step-by-step procedures for common operational tasks and incident response.

## Table of Contents

1. [Market Settlement](#market-settlement)
2. [User Account Suspension](#user-account-suspension)
3. [Stuck Bet Recovery](#stuck-bet-recovery)
4. [Database Recovery](#database-recovery)
5. [Redis Cache Flush](#redis-cache-flush)
6. [WebSocket Connection Spike](#websocket-connection-spike)
7. [Provider Feed Outage](#provider-feed-outage)
8. [Emergency Market Suspension](#emergency-market-suspension)

---

## Market Settlement

### Scenario
A fixture has completed and you need to settle all bets placed on markets for that fixture. This is typically done manually via the Backoffice when automatic settlement fails.

### Prerequisites
- Access to Backoffice admin panel (http://admin.example.com)
- Admin account with market settlement permissions
- Fixture ID and market IDs to settle

### Step-by-Step Procedure

#### 1. Verify Fixture Status

```bash
# Login to PostgreSQL
psql -h prod-db.example.com -U phoenix -d phoenix_sportsbook

# Check fixture status
SELECT id, team_a, team_b, scheduled_at, status
FROM fixtures
WHERE id = 'fix-xxxxx';

# Expected: status = 'completed'
```

#### 2. Review Markets Before Settlement

```sql
-- Check markets for this fixture
SELECT id, market_type, status, settlement_type
FROM markets
WHERE fixture_id = 'fix-xxxxx';

-- Count pending bets
SELECT COUNT(*) as pending_bets
FROM bets
WHERE selection_id IN (
  SELECT id FROM selections WHERE market_id IN (
    SELECT id FROM markets WHERE fixture_id = 'fix-xxxxx'
  )
) AND status = 'pending';

-- Check for conflicting bets (should be zero)
SELECT COUNT(*) as conflicting_bets
FROM bets
WHERE fixture_id = 'fix-xxxxx'
AND (status = 'won' OR status = 'lost' OR status = 'settled');
```

#### 3. Suspend All Markets (Safety Precaution)

In Backoffice:
1. Navigate to Fixtures > [Fixture Name]
2. Click "Suspend All Markets" button
3. Verify all markets show status "SUSPENDED"

Wait 2-3 minutes for any in-flight bets to complete.

#### 4. Settle Individual Markets

In Backoffice:
1. Go to Markets for the fixture
2. For each market:
   - Click "Settle Market"
   - Select result (e.g., "Team A Wins" for moneyline)
   - Verify pending bets count matches what you saw in SQL
   - Click "Confirm Settlement"

**Expected result:** Each market transitions to SETTLED status.

#### 5. Verify Settlement in Database

```sql
-- Verify markets are settled
SELECT id, status FROM markets WHERE fixture_id = 'fix-xxxxx';
-- All should be 'settled'

-- Verify bets are resolved
SELECT status, COUNT(*) as count
FROM bets
WHERE fixture_id = 'fix-xxxxx'
GROUP BY status;
-- No 'pending' status bets should remain

-- Check if winning bets created wallet transactions
SELECT COUNT(*) as winning_bets FROM bets
WHERE fixture_id = 'fix-xxxxx' AND status = 'won';

SELECT COUNT(*) as settlement_ledger_entries
FROM ledger_entries
WHERE created_at > NOW() - INTERVAL '30 minutes'
AND transaction_type = 'settlement';
```

#### 6. Verify User Account Balances

```bash
# Select a few winning users and verify their balance increased
psql -h prod-db.example.com -U phoenix -d phoenix_sportsbook

SELECT p.email, w.balance,
  (SELECT amount FROM ledger_entries
   WHERE wallet_id = w.id
   AND transaction_type = 'settlement'
   ORDER BY created_at DESC LIMIT 1) as latest_settlement
FROM punters p
JOIN wallets w ON p.id = w.punter_id
WHERE p.id IN (
  SELECT DISTINCT punter_id FROM bets
  WHERE fixture_id = 'fix-xxxxx' AND status = 'won'
)
LIMIT 5;
```

#### 7. Notify Users (if applicable)

Send notification to affected users:
```
Subject: Market Settlement Completed

The market for [Fixture Name] has been settled.
- Winning bets: [count] payouts processed
- Total payouts: $[amount]

Your account has been credited. Check your account for details.
```

#### 8. Post-Settlement Verification

- [ ] All markets show SETTLED status
- [ ] No pending bets remain
- [ ] User balances updated correctly
- [ ] Ledger entries created for all settlements
- [ ] No errors in Gateway logs (`kubectl logs -f deployment/gateway`)
- [ ] Users can view settlement in their account history

### Troubleshooting

**Problem:** "Conflict error: market already partially settled"
- **Cause:** Some bets were manually settled
- **Solution:** Revert unsettled bets, then settle all together
  ```sql
  UPDATE bets SET status = 'pending'
  WHERE fixture_id = 'fix-xxxxx'
  AND (status = 'won' OR status = 'lost');
  ```

**Problem:** "User balance decreased instead of increased"
- **Cause:** Ledger entry had wrong sign
- **Solution:** Check the ledger entry, correct if needed
  ```sql
  SELECT * FROM ledger_entries
  WHERE wallet_id = 'wallet-xxxxx'
  ORDER BY created_at DESC LIMIT 5;
  ```

---

## User Account Suspension

### Scenario
A user has violated terms of service, committed fraud, or engaged in prohibited activity. You need to suspend their account immediately.

### Prerequisites
- Backoffice access
- User email or ID
- Reason for suspension (for audit log)

### Step-by-Step Procedure

#### 1. Identify the User

```sql
-- Find user by email
SELECT id, email, status, kyc_status, created_at
FROM punters
WHERE email = 'user@example.com';

-- Or by ID
SELECT id, email, status, kyc_status, created_at
FROM punters
WHERE id = 'user-xxxxx';
```

#### 2. Review User Activity (Optional)

```sql
-- Check recent bets
SELECT id, stake, odds, status, placed_at
FROM bets
WHERE punter_id = 'user-xxxxx'
ORDER BY placed_at DESC
LIMIT 10;

-- Check wallet transactions
SELECT transaction_type, amount, created_at
FROM ledger_entries
JOIN wallets ON ledger_entries.wallet_id = wallets.id
WHERE wallets.punter_id = 'user-xxxxx'
ORDER BY created_at DESC
LIMIT 20;

-- Check audit log for suspicious activity
SELECT action_type, details, created_at
FROM audit_logs
WHERE punter_id = 'user-xxxxx'
ORDER BY created_at DESC
LIMIT 50;
```

#### 3. Check Outstanding Bets

```sql
-- Find any pending bets
SELECT id, fixture_id, stake, placed_at
FROM bets
WHERE punter_id = 'user-xxxxx'
AND status = 'pending'
ORDER BY placed_at DESC;
```

**Decision:** Do you want to void outstanding bets before suspension?
- **Option A:** Void all pending bets and refund stake
- **Option B:** Let bets settle naturally, then suspend

#### 4. Suspend Account in Backoffice

In Backoffice:
1. Navigate to Users > [User Email]
2. Click "Suspend Account" button
3. Select suspension reason from dropdown (fraud, tos-violation, etc.)
4. Enter description: "Player engaged in [describe violation]"
5. Click "Confirm Suspension"

#### 5. Verify Suspension in Database

```sql
-- Check account status
SELECT id, email, status FROM punters WHERE id = 'user-xxxxx';
-- Status should be 'suspended'

-- Verify audit log entry created
SELECT action_type, details, created_at
FROM audit_logs
WHERE punter_id = 'user-xxxxx'
AND action_type = 'account_suspended'
ORDER BY created_at DESC LIMIT 1;
```

#### 6. Verify Account Cannot Log In

Test login in Player App:
1. Try to log in with suspended user's email
2. Expected error: "Account suspended. Please contact support."

**Verify in Auth Service logs:**
```bash
kubectl logs -f deployment/auth | grep 'account_suspended'
```

#### 7. Optionally: Void Outstanding Bets

If you decided to void pending bets:

```sql
BEGIN;

-- Find pending bets
SELECT id, punter_id, stake FROM bets
WHERE punter_id = 'user-xxxxx'
AND status = 'pending';

-- Void them
UPDATE bets SET status = 'void'
WHERE punter_id = 'user-xxxxx'
AND status = 'pending';

-- Refund stakes
UPDATE wallets SET balance = balance + [total_stake]
WHERE punter_id = 'user-xxxxx';

-- Create ledger entries for refunds
INSERT INTO ledger_entries (wallet_id, transaction_type, amount, previous_balance, new_balance, created_at)
SELECT w.id, 'void_refund', [stake], w.balance - [stake], w.balance, NOW()
FROM wallets w
WHERE w.punter_id = 'user-xxxxx';

COMMIT;
```

#### 8. Create Audit Trail

```sql
-- Log suspension reason in audit logs
INSERT INTO audit_logs (punter_id, action_type, details, created_at)
VALUES (
  'user-xxxxx',
  'account_suspended',
  jsonb_build_object(
    'reason', 'fraud',
    'description', 'Player engaged in [specific violation]',
    'admin_id', '[your-admin-id]',
    'timestamp', NOW()::text
  ),
  NOW()
);
```

#### 9. Notify User (if applicable)

Send email:
```
Subject: Account Suspended

Your Phoenix Sportsbook account has been suspended due to:
[violation reason]

If you believe this is an error, please contact support@example.com

For details, please reply to this email.
```

### Troubleshooting

**Problem:** "Cannot suspend account: user has pending settlement"
- **Solution:** Wait for pending bets to settle, or manually void them first

**Problem:** "User can still log in after suspension"
- **Cause:** Auth service cache not cleared
- **Solution:** Clear user session from Redis
  ```bash
  redis-cli DEL "session:user-xxxxx:*"
  ```

---

## Stuck Bet Recovery

### Scenario
A user placed a bet, but it wasn't reflected in their account or market exposure. The bet may be stuck in the database in an inconsistent state, or the placement failed partway through.

### Prerequisites
- Backoffice access or direct database access
- User email/ID and bet details
- Time when the bet was supposedly placed

### Step-by-Step Procedure

#### 1. Find the Stuck Bet

```sql
-- Search for bet by email and approximate time
SELECT b.id, b.punter_id, b.selection_id, b.stake, b.status,
       b.placed_at, p.email
FROM bets b
JOIN punters p ON b.punter_id = p.id
WHERE p.email = 'user@example.com'
AND b.placed_at > NOW() - INTERVAL '1 hour'
ORDER BY b.placed_at DESC;
```

#### 2. Determine the Issue

```sql
-- Case 1: Bet exists but status is 'pending' (correct state)
-- Check if wallet was debited correctly
SELECT b.id, b.stake,
       (SELECT balance FROM wallets WHERE punter_id = b.punter_id) as current_balance,
       (SELECT SUM(amount) FROM ledger_entries
        WHERE wallet_id IN (SELECT id FROM wallets WHERE punter_id = b.punter_id)
        AND created_at > b.placed_at - INTERVAL '1 minute'
        ORDER BY created_at DESC LIMIT 1) as last_transaction
FROM bets b
WHERE b.id = 'bet-xxxxx';

-- Case 2: Wallet not debited (stake not removed)
SELECT w.balance, b.stake, (w.balance - b.stake) as balance_after_bet
FROM wallets w
JOIN bets b ON w.punter_id = b.punter_id
WHERE b.id = 'bet-xxxxx';

-- Case 3: Ledger entry missing
SELECT COUNT(*) as ledger_entries
FROM ledger_entries
WHERE created_at > (SELECT placed_at FROM bets WHERE id = 'bet-xxxxx') - INTERVAL '10 seconds'
AND wallet_id = (SELECT id FROM wallets WHERE punter_id = (SELECT punter_id FROM bets WHERE id = 'bet-xxxxx'));
```

#### 3. Resolve Each Case

**Case A: Bet exists, wallet debited correctly - No action needed**

The bet is actually fine. Verify in the Player App or wait for settlement.

**Case B: Bet exists, wallet NOT debited**

```sql
BEGIN;

SELECT INTO user_id punter_id FROM bets WHERE id = 'bet-xxxxx';
SELECT INTO bet_stake stake FROM bets WHERE id = 'bet-xxxxx';
SELECT INTO wallet_id id FROM wallets WHERE punter_id = user_id;

-- Update wallet
UPDATE wallets SET balance = balance - bet_stake WHERE id = wallet_id;

-- Create ledger entry
INSERT INTO ledger_entries (wallet_id, transaction_type, amount, created_at)
VALUES (wallet_id, 'bet_placement', -bet_stake, NOW());

COMMIT;

-- Verify
SELECT balance FROM wallets WHERE id = wallet_id;
```

**Case C: Bet missing, but wallet debited**

This indicates the bet placement failed after the wallet debit.

```sql
BEGIN;

SELECT INTO wallet_id id FROM wallets WHERE punter_id = 'user-xxxxx';
SELECT INTO refund_amount ABS(amount) FROM ledger_entries
WHERE wallet_id = wallet_id
AND transaction_type = 'bet_placement'
ORDER BY created_at DESC LIMIT 1;

-- Refund the player
UPDATE wallets SET balance = balance + refund_amount WHERE id = wallet_id;

-- Create reversal ledger entry
INSERT INTO ledger_entries (wallet_id, transaction_type, amount, created_at)
VALUES (wallet_id, 'bet_placement_reversal', refund_amount, NOW());

COMMIT;
```

#### 4. Verify Resolution

```sql
-- Verify bet status is correct
SELECT id, status FROM bets WHERE id = 'bet-xxxxx';
-- Should be 'pending' (if not settled yet)

-- Verify wallet balance is correct
SELECT balance FROM wallets WHERE punter_id = 'user-xxxxx';

-- Verify ledger is complete
SELECT transaction_type, amount, created_at
FROM ledger_entries
WHERE wallet_id IN (SELECT id FROM wallets WHERE punter_id = 'user-xxxxx')
ORDER BY created_at DESC LIMIT 5;
```

#### 5. Notify User (if refund was given)

```
Subject: Bet Placement Issue - Refund Applied

We detected an issue with your bet placement. Your stake has been refunded to your account.

If you'd like to place the bet again, please try again.
Amount refunded: $[amount]
```

### Troubleshooting

**Problem:** "Cannot find the bet or ledger entry"
- **Solution:** Check if the transaction was actually submitted
  - Check user's browser console for network errors
  - Check Gateway logs: `kubectl logs -f deployment/gateway | grep 'bet.*placement'`

**Problem:** "Multiple ledger entries but only one bet"
- **Cause:** Duplicate submission or race condition
- **Solution:**
  ```sql
  -- Find extra ledger entries
  SELECT * FROM ledger_entries
  WHERE wallet_id = 'wallet-xxxxx'
  ORDER BY created_at DESC LIMIT 10;

  -- Delete duplicates (if transaction_type is identical)
  DELETE FROM ledger_entries
  WHERE wallet_id = 'wallet-xxxxx'
  AND created_at > NOW() - INTERVAL '5 minutes'
  AND (SELECT COUNT(*) FROM ledger_entries le2
       WHERE le2.wallet_id = 'wallet-xxxxx'
       AND le2.transaction_type = ledger_entries.transaction_type) > 1;
  ```

---

## Database Recovery

### Scenario
Database connection is lost, corrupted, or needs to be restored from backup.

### Prerequisites
- SSH access to database server or Cloud SQL console
- Backup files available
- Kubernetes access for restarting services

### Step-by-Step Procedure

#### 1. Check Database Status

```bash
# Test connection
psql -h prod-db.example.com -U phoenix -d phoenix_sportsbook -c "SELECT 1;"

# Check replication status (if replica)
psql -h prod-db.example.com -U phoenix -d postgres -c "SELECT * FROM pg_stat_replication;"

# Check database size
psql -h prod-db.example.com -U phoenix -d postgres -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) FROM pg_database ORDER BY pg_database_size(datname) DESC;"
```

#### 2. If Connection is Lost

**Option A: Automatic Failover (if using managed service with replication)**

```bash
# For Google Cloud SQL:
gcloud sql instances failover prod-db

# Wait for failover to complete (~5 minutes)
gcloud sql instances describe prod-db

# Verify connection restored
psql -h prod-db.example.com -U phoenix -d phoenix_sportsbook -c "SELECT 1;"
```

**Option B: Restart Database Service**

```bash
# For self-managed PostgreSQL:
systemctl restart postgresql

# Or in Docker:
docker restart phoenix_postgres

# Or in Kubernetes:
kubectl delete pod postgres-0 -n databases
# Statefulset will recreate it

# Wait and verify
sleep 30
psql -h prod-db.example.com -U phoenix -d phoenix_sportsbook -c "SELECT 1;"
```

#### 3. If Database is Corrupted

**Run integrity check:**
```bash
# Connect as superuser
psql -h prod-db.example.com -U postgres -d postgres

-- Check for corruption
REINDEX DATABASE phoenix_sportsbook;

-- Analyze tables
ANALYZE;

-- Check constraints
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY'
AND table_name IN ('bets', 'wallets', 'markets');

-- If found issues, vacuum
VACUUM FULL;
```

#### 4. Restore from Backup (if needed)

**List available backups:**
```bash
# For Google Cloud SQL:
gcloud sql backups list --instance=prod-db

# Get backup metadata:
gcloud sql backups describe <backup-id> --instance=prod-db
```

**Restore from backup:**
```bash
# Create a new instance from backup
gcloud sql backups restore <backup-id> \
  --backup-instance=prod-db \
  --target-instance=prod-db-restore

# Or restore into existing instance (destructive)
gcloud sql backups restore <backup-id> \
  --backup-instance=prod-db \
  --target-instance=prod-db

# Wait for restore to complete
gcloud sql operations describe <operation-id>
```

**Manual restoration from SQL dump:**
```bash
# Drop and recreate database (DESTRUCTIVE)
psql -h prod-db.example.com -U postgres -c "DROP DATABASE IF EXISTS phoenix_sportsbook;"
psql -h prod-db.example.com -U postgres -c "CREATE DATABASE phoenix_sportsbook OWNER phoenix;"

# Restore from dump
psql -h prod-db.example.com -U phoenix -d phoenix_sportsbook < backup-20240115-140000.sql

# Verify
psql -h prod-db.example.com -U phoenix -d phoenix_sportsbook -c "SELECT COUNT(*) FROM bets;"
```

#### 5. Restart Services

Once database is restored:

```bash
# Restart Gateway
kubectl rollout restart deployment/gateway -n phoenix-sportsbook

# Restart Auth Service
kubectl rollout restart deployment/auth -n phoenix-sportsbook

# Monitor startup
kubectl rollout status deployment/gateway -n phoenix-sportsbook
```

#### 6. Verify Recovery

```bash
# Check service status
make status

# Test API
curl https://api.example.com/api/v1/status

# Check logs for errors
kubectl logs -f deployment/gateway -n phoenix-sportsbook | head -50
```

### Troubleshooting

**Problem:** "Cannot connect: too many connections"
- **Solution:** Increase max connections and restart
  ```bash
  # For Cloud SQL, update flags:
  gcloud sql instances patch prod-db \
    --database-flags=max_connections=500

  # Or directly in postgresql.conf:
  max_connections = 500
  # Then: SELECT pg_reload_conf();
  ```

**Problem:** "Replication lag too high"
- **Solution:** Check replica status
  ```bash
  psql -h replica-db -U postgres -c "SELECT slot_name, restart_lsn, confirmed_flush_lsn FROM pg_replication_slots;"
  ```

---

## Redis Cache Flush

### Scenario
Cache is corrupted, stale, or causing issues. Need to flush and regenerate.

### Prerequisites
- Redis CLI access or kubectl access
- Understanding of what will be affected (session loss, temporary slowness)

### Step-by-Step Procedure

#### 1. Notify Stakeholders

Before flushing, notify users of brief session disruption:

```
Subject: Scheduled Maintenance - Brief Service Interruption

We're performing cache maintenance starting at [time] UTC.
This may cause:
- Users to be logged out (will need to re-login)
- Temporary slow performance (~5 minutes)

Expected duration: 10 minutes
```

#### 2. Check What's in Redis

```bash
# Connect to Redis
redis-cli -h redis.example.com

# Get information about memory usage
INFO memory

# Get database size
DBSIZE

# List all keys (careful on production!)
KEYS *

# Get TTL for a specific key
TTL session:user-12345
```

#### 3. Flush Specific Namespace (Safer)

Instead of flushing all, flush only what's needed:

```bash
redis-cli -h redis.example.com

# Flush only sessions (won't affect market cache)
EVAL "for _, k in ipairs(redis.call('keys', 'session:*')) do redis.call('del', k) end" 0

# Or for a specific pattern
DEL session:user-12345:*
```

#### 4. Full Redis Flush (if necessary)

```bash
redis-cli -h redis.example.com

# Check before flushing
INFO stats  # Check expired_keys_count, evicted_keys_count

# Flush everything (DESTRUCTIVE)
FLUSHALL

# Verify it's empty
DBSIZE
```

#### 5. Regenerate Cache (if applicable)

```bash
# For session cache: Users will recreate on re-login
# For market data: Gateway will repopulate from database

# Optional: Pre-warm cache by fetching popular markets
curl https://api.example.com/api/v1/fixtures/popular
```

#### 6. Monitor Services

```bash
# Watch Gateway for spike in database queries
kubectl logs -f deployment/gateway -n phoenix-sportsbook | grep "query_duration"

# Monitor error rates
# Gateway metrics: rate(http_requests_total{status=~"5.."}[1m])

# Check user complaints in support system
```

#### 7. Verify Normal Operation

```bash
# Check Redis is healthy
redis-cli -h redis.example.com PING
# Should return: PONG

# Verify Gateway is still responsive
curl https://api.example.com/api/v1/status

# Check typical response times are back to normal
# Should be < 100ms for API calls
```

### Troubleshooting

**Problem:** "Cache won't clear: Redis is locked"
- **Solution:** Restart Redis
  ```bash
  docker restart phoenix_redis
  # Or:
  kubectl delete pod redis-0 -n databases
  ```

**Problem:** "After flush, getting 'cache miss' errors everywhere"
- **Cause:** Cache invalidation but data layer not responding
- **Solution:**
  ```bash
  # Verify database is up
  make status

  # Restart Gateway to force fresh data fetch
  kubectl rollout restart deployment/gateway
  ```

---

## WebSocket Connection Spike

### Scenario
Sudden spike in WebSocket connections causing performance degradation or connection rejections.

### Prerequisites
- Kubectl access
- Prometheus/Grafana for metrics
- Understanding of normal connection baseline

### Step-by-Step Procedure

#### 1. Verify the Spike is Real

```bash
# Check current active connections
redis-cli -h redis.example.com INFO stats | grep connected_clients

# Check Gateway WebSocket metrics
curl http://gateway:18080/metrics | grep websocket_connections

# Query Prometheus
curl 'http://prometheus:9090/api/v1/query?query=gateway_websocket_connections'
```

#### 2. Identify Root Cause

**Check if it's legitimate traffic:**
```bash
# Monitor connection IPs to see if it's bot/attack traffic
kubectl logs -f deployment/gateway -n phoenix-sportsbook | grep "WebSocket" | tail -100 | cut -d' ' -f4 | sort | uniq -c | sort -rn
```

**Check if it's a broadcast storm:**
```bash
# Monitor Redis pub/sub activity
redis-cli -h redis.example.com PUBSUB CHANNELS

redis-cli -h redis.example.com PUBSUB NUMSUB market:*/odds

# If seeing huge numbers, a broadcast is creating infinite loop
redis-cli -h redis.example.com INFO stats | grep pubsub_patterns
```

#### 3. If It's a Legitimate Spike

**Auto-scaling will handle this automatically:**
```bash
# Check HPA status
kubectl get hpa gateway-hpa -n phoenix-sportsbook

# Monitor pod creation
kubectl get pods -n phoenix-sportsbook -w

# Check autoscaler events
kubectl describe hpa gateway-hpa -n phoenix-sportsbook
```

**Manual scaling if needed:**
```bash
# Scale to more replicas
kubectl scale deployment gateway --replicas=10 -n phoenix-sportsbook

# Wait for new pods to be ready
kubectl rollout status deployment/gateway -n phoenix-sportsbook
```

#### 4. If It's a Bot/Attack

**Rate limiting triggers:**
```bash
# Check if rate limiter is active
kubectl logs deployment/gateway -n phoenix-sportsbook | grep "rate.*limit"

# View rate limit configuration
kubectl describe configmap gateway-config -n phoenix-sportsbook | grep RATE_LIMIT
```

**Block suspicious IPs:**
```bash
# Using Kubernetes NetworkPolicy
kubectl apply -f - << 'EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: block-bad-ips
  namespace: phoenix-sportsbook
spec:
  podSelector:
    matchLabels:
      app: gateway
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 18080
EOF
```

**Or block at WAF level (cloud-provider specific):**
```bash
# Google Cloud Armor example:
gcloud compute security-policies create block-bots --region=global

gcloud compute security-policies rules create 100 \
  --action deny-429 \
  --security-policy=block-bots \
  --expression="origin.region_code == 'XX' || origin.ip in ['1.2.3.4']"
```

#### 5. If It's a Broadcast Storm (Redis Issue)

```bash
# Stop the broadcast immediately
# Find the source process
ps aux | grep 'redis\|gateway' | grep -v grep

# Kill the problematic service
kubectl delete pod gateway-xxxxx -n phoenix-sportsbook

# Or restart all gateways
kubectl rollout restart deployment/gateway -n phoenix-sportsbook

# Clear the Redis pub/sub
redis-cli -h redis.example.com FLUSHDB
```

#### 6. Monitor Recovery

```bash
# Watch connection count decrease
watch 'redis-cli -h redis.example.com INFO stats | grep connected_clients'

# Monitor latency return to normal
kubectl logs -f deployment/gateway -n phoenix-sportsbook | grep "request_duration" | tail -20
```

### Troubleshooting

**Problem:** "Connections keep spiking even after scaling"
- **Cause:** Likely a malicious bot
- **Solution:** Enable stricter rate limiting or WAF rules

**Problem:** "Gateway pods are not scaling despite high CPU"
- **Cause:** HPA might not be working
- **Solution:**
  ```bash
  # Check HPA status
  kubectl get hpa -A

  # Check metrics server is installed
  kubectl get deployment metrics-server -n kube-system

  # View current resource usage
  kubectl top pods -n phoenix-sportsbook
  ```

---

## Provider Feed Outage

### Scenario
Odds or fixture data feed from an external provider is down or delayed, affecting market updates.

### Prerequisites
- Backoffice access
- Communication with provider support
- Manual odds entry capability

### Step-by-Step Procedure

#### 1. Detect the Outage

```bash
# Check last successful feed update
SELECT source, MAX(received_at) as last_update, NOW() - MAX(received_at) as age
FROM odds_updates
GROUP BY source
ORDER BY age DESC;

# Check for errors in application logs
kubectl logs deployment/gateway -n phoenix-sportsbook | grep -i "provider\|feed\|error" | tail -50
```

#### 2. Notify Users & Stakeholders

Post status update:
```
Subject: Service Disruption - Odds Feed Delay

We are experiencing a delay with odds provider updates.
- Markets are SUSPENDED for new bets
- Existing bets will settle as normal
- Our team is investigating

Updates every 15 minutes.
```

#### 3. Suspend Affected Markets

In Backoffice:
1. Go to Settings > Market Control
2. Select "Suspend All Markets"
3. Reason: "External provider feed outage"

Or via API:
```bash
curl -X POST https://api.example.com/api/v1/admin/markets/suspend-all \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"reason": "provider_outage"}'
```

#### 4. Disable Automatic Odds Updates (optional)

```bash
# Set environment variable to disable auto-updates
kubectl set env deployment/gateway \
  DISABLE_ODDS_UPDATES=true \
  -n phoenix-sportsbook

# Or via ConfigMap
kubectl patch configmap gateway-config -n phoenix-sportsbook --type merge \
  -p '{"data":{"DISABLE_ODDS_UPDATES":"true"}}'
```

#### 5. Contact Provider Support

```bash
# Create incident ticket with provider
# Document:
- Time outage started
- Affected markets/sports
- Error messages if available
- Number of affected bets
```

#### 6. Manual Odds Entry (if needed for critical markets)

In Backoffice, for each market:
1. Navigate to Market > Edit
2. Manually enter current odds for each selection
3. Click "Update Odds"
4. Save changes

#### 7. Monitor Feed Recovery

```bash
# Check if provider is responding
curl https://provider-api.example.com/status

# Query application logs for successful feed ingestion
kubectl logs deployment/gateway -n phoenix-sportsbook --since=5m | grep "feed.*success"

# Check latest update timestamp
SELECT source, received_at FROM odds_updates
WHERE source = 'provider_name'
ORDER BY received_at DESC LIMIT 1;
```

#### 8. Resume Markets When Feed is Healthy

Once feed is confirmed stable for 30 minutes:

In Backoffice:
1. Go to Markets, check feed timestamps are updating
2. Click "Resume Markets"
3. Verify odds are changing naturally

Or via API:
```bash
curl -X POST https://api.example.com/api/v1/admin/markets/resume-all \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### 9. Post-Incident Review

```sql
-- Document impact
SELECT COUNT(*) as suspended_markets
FROM markets
WHERE status = 'suspended'
AND suspended_reason = 'provider_outage';

-- Count affected bets
SELECT COUNT(*) as affected_bets, SUM(stake) as affected_stake
FROM bets
WHERE fixture_id IN (
  SELECT id FROM fixtures WHERE status IN ('in_progress', 'completed')
  AND updated_at > NOW() - INTERVAL '1 hour'
);

-- Create incident report
INSERT INTO incident_reports (
  incident_type, start_time, end_time, duration_minutes,
  affected_markets, affected_bets, root_cause
)
VALUES (
  'provider_outage',
  '2024-01-15 14:30:00',
  '2024-01-15 15:45:00',
  75,
  (SELECT COUNT(*) FROM markets WHERE status = 'suspended'),
  (SELECT COUNT(*) FROM bets WHERE placed_at > ...),
  'Provider API timeout'
);
```

### Troubleshooting

**Problem:** "Markets are suspended but odds keep updating"
- **Cause:** Disable odds updates didn't take effect
- **Solution:** Restart Gateway pods
  ```bash
  kubectl rollout restart deployment/gateway -n phoenix-sportsbook
  ```

**Problem:** "Provider came back but we're seeing stale data"
- **Cause:** Cache not cleared
- **Solution:** Flush odds cache
  ```bash
  redis-cli -h redis.example.com EVAL "return redis.call('del', unpack(redis.call('keys', 'odds:*')))" 0
  ```

---

## Emergency Market Suspension

### Scenario
Critical system issue, security breach, or regulatory action requires immediate suspension of all markets for safety.

### Prerequisites
- Backoffice access (or direct database access for faster execution)
- Clear business reason for suspension
- Communication plan ready

### Step-by-Step Procedure

#### 1. Declare Emergency

Decision makers must approve. Document decision:
```
Subject: Emergency Market Suspension Decision

Reason: [describe critical issue]
Approved by: [name/title]
Time approved: [time]
Expected duration: [estimate]
```

#### 2. Suspend All Markets Immediately

**Via Backoffice (fastest for UI):**

In Backoffice:
1. Click "Emergency Suspend" button (if available)
2. Select reason: "System emergency" / "Security" / "Regulatory"
3. Click "Suspend All Markets Now"
4. Confirm dialog

**Via Database (faster for direct access):**

```sql
BEGIN;

-- Suspend all markets
UPDATE markets SET status = 'suspended'
WHERE status IN ('open', 'in_progress');

-- Log the suspension
INSERT INTO audit_logs (action_type, details, created_at)
VALUES (
  'emergency_market_suspension',
  jsonb_build_object(
    'reason', '[reason]',
    'suspended_count', (SELECT COUNT(*) FROM markets WHERE status = 'suspended'),
    'timestamp', NOW()::text,
    'triggered_by', '[admin_id]'
  ),
  NOW()
);

COMMIT;
```

**Via API (for automated systems):**

```bash
curl -X POST https://api.example.com/api/v1/admin/emergency-suspend \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "system_emergency",
    "description": "[detailed reason]"
  }'
```

#### 3. Verify Suspension

```sql
-- Check all markets are suspended
SELECT status, COUNT(*) as count
FROM markets
GROUP BY status;
-- Should show 0 'open' or 'in_progress' markets

-- Verify no new bets can be placed (check application code blocks this)
SELECT COUNT(*) as bets_placed_after_suspension
FROM bets
WHERE placed_at > (
  SELECT created_at FROM audit_logs
  WHERE action_type = 'emergency_market_suspension'
  ORDER BY created_at DESC LIMIT 1
);
-- Should be 0
```

#### 4. Notify Users

Send emergency notification:

```
Subject: URGENT: Phoenix Sportsbook Service Suspension

Phoenix Sportsbook has been temporarily suspended due to:
[reason]

What happens now:
- All markets are closed
- No new bets can be placed
- Pending bets will remain pending
- Your account and balance are secure

Timeline: [expected resumption time]

We apologize for the disruption.
```

#### 5. Investigate Root Cause

Assign incident team to:
- Identify the critical issue
- Determine severity (data loss risk, financial impact, security breach)
- Document findings
- Create remediation plan

#### 6. Resume Services When Safe

Once issue is resolved and verified safe:

**Via Backoffice:**

1. Click "Resume Markets"
2. Select affected sports/fixtures
3. Click "Resume"

**Via Database:**

```sql
-- Resume specific sport
UPDATE markets SET status = 'open'
WHERE status = 'suspended'
AND fixture_id IN (
  SELECT id FROM fixtures WHERE tournament_id IN (
    SELECT id FROM tournaments WHERE sport_id = (
      SELECT id FROM sports WHERE name = 'Football'
    )
  )
);

-- Or resume all
UPDATE markets SET status = 'open'
WHERE status = 'suspended';

-- Log the resumption
INSERT INTO audit_logs (action_type, details, created_at)
VALUES (
  'market_resumption',
  jsonb_build_object(
    'reason', 'emergency_resolved',
    'resumed_count', (SELECT COUNT(*) FROM markets WHERE status = 'open'),
    'timestamp', NOW()::text
  ),
  NOW()
);
```

#### 7. Post-Incident Communication

```
Subject: Phoenix Sportsbook Restored - Incident Report

Markets have been restored. Here's what happened:

Issue: [technical description]
Duration: [start time] to [end time]
Impact: [# of affected bets, sports, markets]

Actions taken: [list]
Next steps: [preventive measures]

Thank you for your patience.
```

#### 8. Create Post-Mortem

```markdown
# Incident Post-Mortem: [Date]

## Summary
- Duration: XX minutes
- Root cause: [cause]
- Impact: [metrics]

## Timeline
- 14:30 UTC: Issue detected
- 14:32 UTC: Emergency suspension triggered
- 14:50 UTC: Root cause identified
- 15:15 UTC: Issue resolved
- 15:20 UTC: Markets resumed

## Lessons Learned
- [learning #1]
- [learning #2]
- [learning #3]

## Action Items
- [ ] Implement [fix #1] - Owner: [person], Due: [date]
- [ ] Add [monitoring] - Owner: [person], Due: [date]
- [ ] Update [docs] - Owner: [person], Due: [date]
```

### Troubleshooting

**Problem:** "Can't suspend markets: getting database lock"
- **Solution:** Kill long-running queries
  ```sql
  SELECT pid FROM pg_stat_activity WHERE state = 'active' AND query LIKE '%UPDATE%';
  SELECT pg_terminate_backend(pid);
  ```

**Problem:** "Markets suspended but users still showing as placing bets"
- **Cause:** Frontend cache or WebSocket not updated
- **Solution:** Force refresh
  ```bash
  # Restart all Gateway and frontend pods
  kubectl rollout restart deployment/gateway -n phoenix-sportsbook
  kubectl rollout restart deployment/player-app -n phoenix-sportsbook
  ```

---

## References

- See [DEPLOYMENT.md](./DEPLOYMENT.md) for infrastructure details
- See [DEVELOPMENT.md](./DEVELOPMENT.md) for database connection setup
- See database schema: `go-platform/services/gateway/migrations/`
- PostgreSQL documentation: https://www.postgresql.org/docs/16/
- Redis documentation: https://redis.io/docs/
