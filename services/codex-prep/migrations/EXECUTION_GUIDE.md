# Phoenix Platform Database Migration Execution Guide

## Quick Start

### Prerequisites
- PostgreSQL 12 or higher
- Database credentials with DDL permissions
- Migration tool (e.g., Flyway, Liquibase) or manual execution
- Database backup before running

### Apply All Migrations (In Order)

#### Option 1: Using psql (Manual)
```bash
#!/bin/bash
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="phoenix_platform"
DB_USER="postgres"

# Apply migrations in order
for migration in 001 002 003 004 005 006 007 008 009; do
    echo "Applying migration ${migration}..."
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
        -f migrations/${migration}_*.sql
    if [ $? -eq 0 ]; then
        echo "✓ Migration ${migration} applied successfully"
    else
        echo "✗ Migration ${migration} failed!"
        exit 1
    fi
done
```

#### Option 2: Using Flyway
```bash
# Configure flyway.conf
database.url=jdbc:postgresql://localhost:5432/phoenix_platform
database.user=postgres
database.password=your_password
locations=filesystem:/path/to/migrations

# Apply migrations
flyway migrate
```

#### Option 3: Using Liquibase
Create a master changelog and reference each migration:
```xml
<databaseChangeLog>
    <include file="migrations/001_create_extensions.sql" relativeToChangelogFile="false"/>
    <include file="migrations/002_create_users.sql" relativeToChangelogFile="false"/>
    <!-- ... continue for all migrations ... -->
</databaseChangeLog>
```

## Migration Details by Stage

### Stage 1: Foundation (001)
```sql
-- Apply extensions
psql -d phoenix_platform -f migrations/001_create_extensions.sql

-- Verify
\dx  -- Should show uuid-ossp and pgcrypto
```

**Expected Output:**
- uuid-ossp extension installed
- pgcrypto extension installed

### Stage 2: Core Users (002)
```sql
psql -d phoenix_platform -f migrations/002_create_users.sql

-- Verify
\d users  -- Show table structure
\dt+ users  -- Show table size
SELECT * FROM information_schema.tables WHERE table_name = 'users';
```

**Expected Tables:**
- `users` (with 21 columns)
- 5 indexes created

**Sample Insert:**
```sql
INSERT INTO users (email, username, password_hash, first_name, last_name)
VALUES ('user@example.com', 'testuser', 'hash123', 'John', 'Doe');
```

### Stage 3: Financial (003)
```sql
psql -d phoenix_platform -f migrations/003_create_wallets.sql

-- Verify
\d wallets
\d wallet_transactions
```

**Expected Tables:**
- `wallets` (financial accounts)
- `wallet_transactions` (transaction history)

**Sample Insert:**
```sql
-- Create wallet for user
INSERT INTO wallets (user_id, balance, currency)
SELECT id, 1000.00, 'USD' FROM users LIMIT 1;

-- Log transaction
INSERT INTO wallet_transactions
(wallet_id, type, amount, balance_before, balance_after, reference)
SELECT id, 'deposit', 1000.00, 0.00, 1000.00, 'INITIAL_DEPOSIT'
FROM wallets LIMIT 1;
```

### Stage 4: Referrals (004)
```sql
psql -d phoenix_platform -f migrations/004_create_referrals.sql

-- Verify
\d referral_codes
\d referral_relationships
\d referral_commissions
```

**Expected Tables:**
- `referral_codes` (promotional codes)
- `referral_relationships` (referrer-referred links)
- `referral_commissions` (commission tracking)

### Stage 5: Markets (005)
```sql
psql -d phoenix_platform -f migrations/005_create_markets.sql

-- Verify
\d events
\d markets
\d outcomes
```

**Expected Tables:**
- `events` (sports events)
- `markets` (betting markets)
- `outcomes` (possible results)

**Sample Insert:**
```sql
-- Create an event
INSERT INTO events (name, sport, league, start_time)
VALUES ('Manchester vs Liverpool', 'soccer', 'Premier League',
        CURRENT_TIMESTAMP + INTERVAL '7 days');

-- Create markets for event
INSERT INTO markets (event_id, name, type)
SELECT id, 'Match Winner', '1X2' FROM events WHERE name = 'Manchester vs Liverpool';

-- Create outcomes
INSERT INTO outcomes (market_id, name, odds)
SELECT id, 'Manchester Win', 2.50 FROM markets LIMIT 1;
```

### Stage 6: Bets (006)
```sql
psql -d phoenix_platform -f migrations/006_create_bets.sql

-- Verify
\d bets
\d bet_legs
```

**Expected Tables:**
- `bets` (bet placements)
- `bet_legs` (parlay components)

### Stage 7: Notifications (007)
```sql
psql -d phoenix_platform -f migrations/007_create_notifications.sql

-- Verify
\d notification_templates
\d notification_log
```

**Sample Insert:**
```sql
-- Create notification template
INSERT INTO notification_templates
(type, channel, subject_template, body_template)
VALUES ('bet_won', 'email', 'Congratulations! Your bet won',
        'Your bet of {{stake}} on {{event}} returned {{payout}}');
```

### Stage 8: Retention (008)
```sql
psql -d phoenix_platform -f migrations/008_create_retention.sql

-- Verify
\d achievements
\d user_achievements
\d leaderboards
\d leaderboard_entries
\d campaigns
```

**Expected Tables:**
- `achievements` (challenge definitions)
- `user_achievements` (progress tracking)
- `leaderboards` (ranking systems)
- `leaderboard_entries` (user positions)
- `campaigns` (marketing campaigns)

### Stage 9: Audit Log (009)
```sql
psql -d phoenix_platform -f migrations/009_create_audit_log.sql

-- Verify partitions
SELECT schemaname, tablename FROM pg_tables
WHERE tablename LIKE 'audit_log%';

-- Should show audit_log parent + 12 monthly partitions
```

## Post-Migration Verification

### Comprehensive Validation Script
```sql
-- Count all tables
SELECT COUNT(*) as total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';
-- Expected: 18 tables (includes partitions)

-- Count all indexes
SELECT COUNT(*) as total_indexes
FROM information_schema.statistics
WHERE table_schema = 'public';

-- List all enums
SELECT t.typname FROM pg_type t
WHERE t.typtype = 'e' AND t.typnamespace =
(SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Expected enums: user_role, kyc_status, wallet_status, transaction_type,
--                  referral_commission_type, referral_commission_status,
--                  event_status, market_status, outcome_result,
--                  bet_status, bet_leg_status, notification_channel,
--                  notification_status, leaderboard_period,
--                  campaign_type, campaign_status

-- Verify foreign key constraints
SELECT constraint_name FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
AND table_schema = 'public'
ORDER BY table_name;

-- Check index usage (after data loads)
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## Rollback Procedures

### Rollback Complete Schema (Emergency)
```bash
#!/bin/bash
# Rollback migrations in reverse order
for migration in 009 008 007 006 005 004 003 002 001; do
    echo "Rolling back migration ${migration}..."
    psql -d phoenix_platform -c "
    -- Read migration file and execute DOWN section
    " || echo "Failed to rollback ${migration}"
done
```

### Manual Rollback of Specific Migration
```sql
-- Rollback migration 008 (retention)
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS leaderboard_entries CASCADE;
DROP TABLE IF EXISTS leaderboards CASCADE;
DROP TABLE IF EXISTS user_achievements CASCADE;
DROP TABLE IF EXISTS achievements CASCADE;
DROP TYPE IF EXISTS campaign_status CASCADE;
DROP TYPE IF EXISTS campaign_type CASCADE;
DROP TYPE IF EXISTS leaderboard_period CASCADE;
```

## Performance Optimization Post-Migration

### Analyze Query Plans
```sql
-- After initial data load, analyze all tables
ANALYZE;

-- Check specific index usage
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'test@example.com';

EXPLAIN ANALYZE
SELECT * FROM leaderboard_entries
WHERE leaderboard_id = '...'
ORDER BY rank LIMIT 10;
```

### Vacuum and Cleanup
```sql
-- Clean up after large data loads
VACUUM FULL ANALYZE;

-- Check table bloat
SELECT schemaname, tablename,
  ROUND(100 * (CASE WHEN otta>0 THEN sml.relpages-otta ELSE 0 END) /
    sml.relpages, 2) AS ratio
FROM pg_class sml
WHERE sml.schemaname = 'public';
```

## Capacity Planning

### Storage Estimation

**Typical Record Sizes:**
- User: ~500 bytes
- Wallet: ~200 bytes
- Wallet Transaction: ~400 bytes
- Event: ~800 bytes (with metadata)
- Bet: ~500 bytes
- Audit Log: ~1KB (with values)

**Growth Estimates (per 1M users):**
- Users table: ~500MB
- Wallets: ~200MB
- Wallet transactions: ~40GB (assuming 10 transactions/user)
- Audit logs: ~100GB/year (assuming 1 write per user action)

### Partitioning Strategy
Audit log automatically partitions by month. Consider additional partitioning for high-volume tables:

```sql
-- Future: Partition wallet_transactions by user_id for sharding
ALTER TABLE wallet_transactions
  ADD COLUMN created_month DATE DEFAULT DATE_TRUNC('month', created_at);
```

## Monitoring & Alerts

### Key Metrics
```sql
-- Monitor table growth
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Monitor index bloat
SELECT schemaname, tablename, indexname,
    ROUND(100.0 * idx_scan / (idx_scan + idx_tup_read), 2) as hit_ratio
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY (idx_scan + idx_tup_read) DESC;

-- Monitor slow queries
SELECT mean_time, calls, query
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;
```

### Alert Thresholds
- Table size > 10GB: Consider partitioning
- Index scan ratio < 10%: Consider dropping unused index
- Transaction duration > 5 seconds: Log for optimization

## Troubleshooting

### Common Issues

**Issue: Extension not found**
```sql
-- Verify PostgreSQL version supports extension
SELECT version();

-- Install from contrib
sudo apt-get install postgresql-contrib-12
CREATE EXTENSION uuid-ossp;
```

**Issue: Foreign key constraint violation**
```sql
-- Check orphaned records
SELECT * FROM wallet_transactions
WHERE wallet_id NOT IN (SELECT id FROM wallets);

-- Solution: Either delete orphans or adjust ON DELETE behavior
DELETE FROM wallet_transactions
WHERE wallet_id NOT IN (SELECT id FROM wallets);
```

**Issue: Partition creation fails**
```sql
-- Verify partition function
SELECT audit_log_create_partition();

-- Manual partition creation
CREATE TABLE audit_log_2026_05 PARTITION OF audit_log
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
```

## Maintenance Schedule

### Weekly
- Monitor index bloat: `REINDEX INDEX CONCURRENTLY idx_name;`
- Analyze statistics: `ANALYZE;`

### Monthly
- Vacuum full: `VACUUM FULL;`
- Review audit log partitions
- Verify backup integrity

### Quarterly
- Review table growth rates
- Optimize slow queries
- Test rollback procedures

### Annually
- Archive old audit log partitions
- Update capacity planning
- Review schema evolution needs

---

**Version:** 1.0
**Last Updated:** 2026-03-07
**Contact:** Phoenix Database Team
