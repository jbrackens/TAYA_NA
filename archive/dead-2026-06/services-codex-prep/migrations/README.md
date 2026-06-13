# Phoenix Platform Database Migrations

This directory contains PostgreSQL migrations for the Phoenix betting platform, supporting users, wallets, markets, bets, engagement features, and audit logging.

## Migration Files

### 001_create_extensions.sql
Creates required PostgreSQL extensions:
- `uuid-ossp` - UUID generation functions
- `pgcrypto` - Cryptographic functions for hashing

**Status:** Foundation

### 002_create_users.sql
Creates the users table with authentication and KYC fields.

**Tables:**
- `users` - User accounts with verification and KYC status

**Enums:**
- `user_role` - admin, moderator, user, guest
- `kyc_status` - pending, verified, rejected, expired

**Key Fields:**
- UUID primary key with auto-generation
- Unique email and username
- KYC compliance tracking
- Email verification timestamp
- Active status flag

**Indexes:**
- `email`, `username` (unique constraints)
- `kyc_status`, `is_active`, `created_at`

### 003_create_wallets.sql
Creates wallet and transaction management tables.

**Tables:**
- `wallets` - User account balances by currency
- `wallet_transactions` - Complete transaction history

**Enums:**
- `wallet_status` - active, suspended, closed, pending_verification
- `transaction_type` - deposit, withdrawal, bet_place, bet_win, bet_refund, bonus, referral_reward, transfer

**Key Fields:**
- Numeric(18,2) precision for financial accuracy
- Balance before/after for audit trail
- JSONB metadata for extensibility
- Reference field for cross-system tracking

**Indexes:**
- Wallet lookups by user and status
- Transaction filtering by type, creation date, reference

### 004_create_referrals.sql
Creates referral program infrastructure.

**Tables:**
- `referral_codes` - Promotional codes with usage limits
- `referral_relationships` - Referrer-referred links
- `referral_commissions` - Commission tracking and payments

**Enums:**
- `referral_commission_type` - fixed, percentage, bonus_points
- `referral_commission_status` - pending, paid, cancelled, expired

**Key Features:**
- Unique constraint on referral pairs (prevents duplicate referrals)
- Max uses enforcement on codes
- Bonus tracking per relationship
- Commission lifecycle management

**Indexes:**
- Code lookups and activity status
- User referral network queries
- Commission payment tracking

### 005_create_markets.sql
Creates sports events, betting markets, and outcomes.

**Tables:**
- `events` - Sports events with scheduling and status
- `markets` - Betting markets within events
- `outcomes` - Potential results with odds

**Enums:**
- `event_status` - scheduled, live, postponed, cancelled, completed
- `market_status` - open, suspended, closed, settled, voided
- `outcome_result` - pending, win, lose, void

**Key Features:**
- External ID support for third-party system integration
- JSONB metadata for extensible sports data
- Hierarchical relationships (Event → Markets → Outcomes)

**Indexes:**
- Event filtering by sport, league, status, timing
- Market status and type queries
- Outcome result tracking

### 006_create_bets.sql
Creates single and parlay bet infrastructure.

**Tables:**
- `bets` - Individual or parlay bet placements
- `bet_legs` - Individual legs within parlay bets

**Enums:**
- `bet_status` - pending, won, lost, voided, cashed_out, settled
- `bet_leg_status` - pending, won, lost, voided

**Key Features:**
- Odds locked at placement time
- Potential payout pre-calculation
- Settlement timestamp tracking
- Parlay support via bet_legs

**Indexes:**
- User bet history and status
- Market and outcome lookups
- Settlement tracking
- Bet lifecycle queries

### 007_create_notifications.sql
Creates notification template and delivery logging.

**Tables:**
- `notification_templates` - Reusable notification definitions
- `notification_log` - Delivery history and status

**Enums:**
- `notification_channel` - email, push, sms, in_app
- `notification_status` - sent, failed, pending, bounced, unsubscribed

**Key Features:**
- Multi-channel support with template overrides
- Status tracking for delivery monitoring
- Metadata capture for personalization
- Active/inactive template management

**Indexes:**
- Template lookups by type and status
- User notification history
- Status and timing queries

### 008_create_retention.sql
Creates engagement and retention features.

**Tables:**
- `achievements` - Challenge definitions with criteria
- `user_achievements` - User progress and completion tracking
- `leaderboards` - Multiple leaderboard definitions
- `leaderboard_entries` - User rankings with scores
- `campaigns` - Marketing campaigns with targeting

**Enums:**
- `leaderboard_period` - daily, weekly, monthly, alltime
- `campaign_type` - promotional, seasonal, loyalty, retention
- `campaign_status` - draft, active, paused, completed, cancelled

**Key Features:**
- Achievement progress tracking with reward claiming
- Time-period based leaderboards with ranking
- JSONB targeting rules for campaign segmentation
- Campaign reward configuration flexibility

**Indexes:**
- Achievement lookup and activity tracking
- User achievement progress queries
- Leaderboard ranking queries (by rank and score)
- Campaign scheduling and status filters

### 009_create_audit_log.sql
Creates partitioned audit logging for compliance.

**Table:**
- `audit_log` - Operational audit trail (partitioned monthly)

**Partitioning:**
- Range partitioning by `created_at` (monthly)
- Pre-created partitions for 2026
- Automatic partition creation function

**Key Features:**
- Tracks all data mutations (old_value → new_value)
- IP address logging for security
- User action attribution
- Entity type and ID for cross-referencing
- Monthly partitions for performance and archival

**Indexes:**
- User action tracking
- Entity change history
- Action type and timestamp queries

## Migration Execution Order

Migrations should be applied in numerical order:

1. **001** - Extensions (no dependencies)
2. **002** - Users (foundation for all other tables)
3. **003** - Wallets (depends on users)
4. **004** - Referrals (depends on users)
5. **005** - Markets (no dependencies)
6. **006** - Bets (depends on users and markets)
7. **007** - Notifications (depends on users)
8. **008** - Retention (depends on users)
9. **009** - Audit Log (depends on users)

## Idempotency

All migrations include rollback (-- Down) sections for testing and emergency recovery:

- CREATE TABLE uses implicit existence checks
- CREATE TYPE uses explicit CREATE TYPE IF NOT EXISTS
- CREATE EXTENSION uses IF NOT EXISTS
- DROP statements cascade to clean dependent objects

## Data Types & Constraints

### Numeric Precision
- **NUMERIC(18,2)** for financial values (supports up to 999,999,999,999,999.99)
- Ensures accurate currency calculations without floating-point errors

### UUID vs. Surrogate Keys
- All tables use UUID primary keys with `gen_random_uuid()` defaults
- Provides database-agnostic identifiers
- Enables multi-database replication

### Enums
- Defined as CREATE TYPE for referential integrity
- Enforces valid values at database level
- Used throughout for status tracking

### Foreign Keys
- ON DELETE CASCADE - removes dependent records (e.g., user deletion removes bets)
- ON DELETE RESTRICT - prevents deletion if dependencies exist (prevents orphaned data)
- ON DELETE SET NULL - allows cascading deletes (e.g., deleted referral codes)

## Indexes Strategy

### B-tree Indexes (default)
- Single column lookups: `email`, `username`, `user_id`
- Foreign key columns for join performance
- Status and type columns for filtering

### Composite Indexes
- `leaderboard_entries(score DESC)` for ranking queries
- Ordering included in index for efficient SORT operations

### Partitioning
- `audit_log` uses RANGE partitioning for maintenance
- Monthly partitions enable efficient purging and archival
- Reduces table lock contention

## Performance Considerations

### Wallet Transactions
- Index on `wallet_id`, `type`, `created_at` supports filtered range queries
- Numeric precision ensures accurate balance calculations
- JSONB metadata avoids schema bloat

### Leaderboard Queries
- Separate `leaderboard_entries` table enables efficient ranking
- Score index with DESC ordering optimizes "top N" queries
- Periodic refresh can be controlled via campaigns

### User Lookups
- Email and username unique indexes ensure fast authentication
- Created_at index supports user growth analytics

## Maintenance Windows

### Monthly Partition Maintenance
```sql
-- Create next month's partition (automated via trigger)
SELECT audit_log_create_partition();

-- Archive/purge old partitions (example: drop 2 years old)
DROP TABLE audit_log_2024_01;
```

### Index Maintenance
```sql
-- Periodic index maintenance
REINDEX INDEX idx_leaderboard_entries_score;
ANALYZE leaderboard_entries;
```

## Migration Safety

### Testing Before Production
1. Apply migrations to staging database matching production schema
2. Verify no errors or performance degradation
3. Validate application startup with new schema
4. Test referential integrity constraints

### Rollback Strategy
- All migrations include complete DOWN sections
- Test rollback in staging environment
- Maintain database backup before applying migrations
- Have rollback plan ready for critical migrations

### Deployment Checklist
- [ ] Database backup created
- [ ] Migrations tested in staging
- [ ] Application version ready
- [ ] Rollback procedures validated
- [ ] Monitoring configured for new tables
- [ ] Stakeholders notified of maintenance window

## Schema Evolution

As the Phoenix platform evolves:

1. **Add Columns** - Use ALTER TABLE ADD COLUMN with DEFAULT values
2. **Add Constraints** - Add NOT NULL only with default values to avoid NULL violations
3. **Create New Tables** - Follow numbered migration pattern
4. **Deprecate Fields** - Mark with comments before removal in major versions

## Documentation

Each table and enum documents:
- Business purpose
- Data relationships
- Key constraints
- Performance characteristics
- Typical query patterns

For schema updates, maintain this pattern for consistency.

---

**Last Updated:** 2026-03-07
**Version:** 1.0
**Database:** PostgreSQL 12+
