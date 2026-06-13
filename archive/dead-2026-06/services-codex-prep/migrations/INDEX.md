# Phoenix Platform Database Migrations - Complete Index

## Migration Files Overview

This directory contains all PostgreSQL database migrations for the Phoenix betting platform.

### Quick Access

| File | Purpose | Tables Created | Status |
|------|---------|-----------------|--------|
| [001_create_extensions.sql](001_create_extensions.sql) | PostgreSQL extensions | (none) | Foundation |
| [002_create_users.sql](002_create_users.sql) | User authentication & KYC | users | Core |
| [003_create_wallets.sql](003_create_wallets.sql) | Financial management | wallets, wallet_transactions | Core |
| [004_create_referrals.sql](004_create_referrals.sql) | Referral program | referral_codes, referral_relationships, referral_commissions | Feature |
| [005_create_markets.sql](005_create_markets.sql) | Sports betting | events, markets, outcomes | Core |
| [006_create_bets.sql](006_create_bets.sql) | Bet placement & tracking | bets, bet_legs | Core |
| [007_create_notifications.sql](007_create_notifications.sql) | User communications | notification_templates, notification_log | Feature |
| [008_create_retention.sql](008_create_retention.sql) | Engagement & gamification | achievements, user_achievements, leaderboards, leaderboard_entries, campaigns | Feature |
| [009_create_audit_log.sql](009_create_audit_log.sql) | Compliance & audit | audit_log (partitioned) | Infrastructure |

## Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Migration overview and design decisions |
| [EXECUTION_GUIDE.md](EXECUTION_GUIDE.md) | Step-by-step deployment instructions |
| [SCHEMA_RELATIONSHIPS.md](SCHEMA_RELATIONSHIPS.md) | ER diagrams and relationship patterns |
| [INDEX.md](INDEX.md) | This file - quick navigation guide |

## Total Statistics

- **SQL Migration Files:** 9
- **Total Tables:** 18 (plus audit_log partitions)
- **Total Enums:** 16
- **Total Indexes:** 50+
- **Foreign Key Constraints:** 25+
- **Migration Size:** ~20KB SQL code

## By Category

### User Management (Migration 002)
- `users` table with role-based access and KYC verification
- 5 indexes for efficient lookups
- Supports multi-factor authentication setup

### Financial (Migrations 003-004)
- Wallet accounts with NUMERIC(18,2) precision
- Complete transaction history with audit trail
- Referral rewards and commission tracking
- 3 separate commission status states

### Betting Platform (Migrations 005-006)
- Sports events with external system integration
- Multiple betting markets per event
- Single and parlay bet support
- Real-time odds capture at bet placement

### Engagement (Migration 008)
- Achievement system with progress tracking
- Multiple simultaneous leaderboards
- Seasonal and alltime competitions
- Campaign-based reward distribution

### Compliance (Migrations 007, 009)
- Notification audit trail
- Complete operation audit log
- Monthly partitioning for retention policies
- Automatic partition creation

## Data Volume Considerations

### Small Platform (100K users)
```
users:                    ~100K rows (50MB)
wallets:                  ~150K rows (30MB)
wallet_transactions:      ~10M rows (4GB)
bets:                     ~5M rows (2.5GB)
audit_log:               ~10M rows (10GB)
```
**Total:** ~17GB

### Medium Platform (1M users)
```
users:                    ~1M rows (500MB)
wallets:                  ~1.5M rows (300MB)
wallet_transactions:      ~100M rows (40GB)
bets:                     ~50M rows (25GB)
audit_log:               ~100M rows (100GB)
```
**Total:** ~170GB

### Large Platform (10M users)
```
users:                    ~10M rows (5GB)
wallets:                  ~15M rows (3GB)
wallet_transactions:      ~1B rows (400GB)
bets:                     ~500M rows (250GB)
audit_log:               ~1B rows (1TB)
```
**Total:** ~1.7TB

Consider sharding by user_id for table_transaction and bets at this scale.

## Migration Execution Checklist

- [ ] Review all 9 migration files
- [ ] Backup production database
- [ ] Apply migrations in numerical order
- [ ] Verify all tables created successfully
- [ ] Verify all indexes created
- [ ] Run comprehensive validation SQL
- [ ] Load initial data if needed
- [ ] Monitor performance baselines
- [ ] Update application to expect new schema
- [ ] Archive migration files safely

## Rollback Checklist

- [ ] Identify which migrations to rollback
- [ ] Backup current data
- [ ] Execute DOWN sections in reverse order
- [ ] Verify rollback completed
- [ ] Validate database state matches previous
- [ ] Restore application to previous code version
- [ ] Document incident for team

## Performance Tuning After Migration

1. **Analyze statistics after data load:**
   ```sql
   ANALYZE;
   ```

2. **Monitor index usage:**
   ```sql
   SELECT * FROM pg_stat_user_indexes
   WHERE idx_scan = 0;
   ```

3. **Identify missing indexes:**
   ```sql
   SELECT * FROM pg_stat_user_tables
   WHERE seq_scan > 1000 AND idx_scan = 0;
   ```

4. **Archive old audit logs:**
   ```sql
   DROP TABLE audit_log_2024_01;
   ```

## Related Resources

- **Phoenix User Service:** Uses migrations 002 (users)
- **Phoenix Wallet Service:** Uses migrations 003-004 (wallets, referrals)
- **Phoenix Market Engine:** Uses migrations 005-006 (events, markets, bets)
- **Phoenix Retention Service:** Uses migrations 008 (engagement)
- **Phoenix Audit Service:** Uses migration 009 (audit_log)

## Support & Questions

For questions about:
- **Schema design:** See SCHEMA_RELATIONSHIPS.md
- **Deployment:** See EXECUTION_GUIDE.md
- **Individual migrations:** See respective .sql file comments
- **Performance tuning:** See README.md maintenance section

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-03-07 | Initial complete schema for Phoenix platform |

---

**Last Updated:** 2026-03-07
**Status:** Production Ready
**Tested On:** PostgreSQL 12+
