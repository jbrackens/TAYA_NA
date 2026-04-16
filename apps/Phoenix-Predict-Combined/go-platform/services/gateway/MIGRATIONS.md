# Database Migrations Guide

## Overview

This guide covers the database migration framework for the Phoenix Sportsbook Gateway service. We use [Goose](https://github.com/pressly/goose) as our migration tool, which provides:

- Version-controlled SQL migrations with up/down support
- Automatic migration tracking via schema_migrations table
- Safety checks to prevent duplicate migrations
- Support for multiple database drivers (PostgreSQL, MySQL, SQLite)

## Architecture

### Migration Files Location

```
services/gateway/
├── migrations/
│   ├── 001_punters.sql
│   ├── 002_sports_tournaments.sql
│   ├── 003_fixtures.sql
│   ├── 004_markets_selections.sql
│   ├── 005_bets.sql
│   ├── 006_wallets_ledger.sql
│   ├── 007_freebets_oddsboosts.sql
│   ├── 008_match_timelines.sql
│   ├── 009_audit_logs.sql
│   ├── 010_indexes.sql
│   ├── seed.sql
│   └── README.md
└── cmd/migrate/
    └── main.go
```

### Database Schema Overview

#### User & Authentication (Migration 001)

**Table: punters**
- Primary users/accounts table
- Fields: id, email, username, password_hash, status, country_code
- Timestamps: created_at, last_login_at, updated_at
- Indexes: email (unique), status, created_at

#### Sports Data (Migration 002)

**Table: sports**
- Sport types: football, basketball, tennis, etc.
- Fields: id, key, name, active

**Table: tournaments**
- Leagues/tournaments: Premier League, NBA, Wimbledon, etc.
- Relationships: Belongs to sports table
- Fields: id, sport_id, key, name, country_code, active

#### Fixtures (Migration 003)

**Table: fixtures**
- Individual matches/games
- Fields: id, sport_key, league_key, season_key, event_key, tournament, home_team, away_team, status, starts_at
- Status values: pending, scheduled, in_progress, completed
- Indexes: tournament, status, starts_at, event_key

#### Markets & Selections (Migration 004)

**Table: markets**
- Betting markets for fixtures: Match Winner, Over/Under Goals, Point Spread, etc.
- Relationship: Belongs to fixtures
- Fields: id, fixture_id, name, status, starts_at, min_stake_cents, max_stake_cents
- Status values: open, closed, suspended

**Table: selections**
- Individual outcomes within a market: Arsenal Win, Draw, Manchester United Win
- Relationship: Belongs to markets
- Fields: id, market_id, name, odds (as decimal), active

#### Bets (Migration 005)

**Table: bets**
- User-placed bets on selections
- Relationships: punters, selections, markets, fixtures
- Fields: stake_cents, odds_taken, status, result, potential_payout_cents, actual_payout_cents
- Timestamps: placed_at, settled_at
- Status values: pending, won, lost, void, cancelled

#### Financial (Migration 006)

**Table: wallets**
- User account balances
- Relationship: One-to-one with punters
- Fields: punter_id, balance_cents, bonus_balance_cents, currency_code
- All amounts stored in cents for precision

**Table: ledger_entries**
- Complete transaction audit trail
- Relationships: wallets, punters
- Transaction types: deposit, withdrawal, bet_placed, bet_settlement, bonus, refund
- Supports: balance tracking, bonus tracking, reference to source transactions
- Timestamp: created_at (immutable)

#### Promotions (Migration 007)

**Table: freebets**
- Free bet allocations to users
- Relationship: Belongs to punters
- Fields: amount_cents, status, issued_at, expires_at, used_at, bet_id
- Status values: active, used, expired

**Table: odds_boosts**
- Promotional odds enhancements
- Relationship: Belongs to markets, optional selection
- Fields: boost_percentage, original_odds, boosted_odds, active_from, active_until

#### Match Data (Migration 008)

**Table: match_timelines**
- Match progress tracking
- Relationship: Belongs to fixtures
- Fields: status, score_home, score_away, last_update

**Table: incidents**
- Events during matches: goals, cards, substitutions
- Relationship: Belongs to match_timelines and fixtures
- Fields: incident_type, minute, team, player_name, description
- Incident types: goal, yellow_card, red_card, substitution, three_pointer, etc.

#### Audit Logging (Migration 009)

**Table: audit_logs**
- Complete audit trail of user actions
- Relationship: Optional reference to punters
- Fields: action, resource_type, resource_id, status, details (JSONB), ip_address, user_agent
- Details stored as JSON for flexible logging
- GIN index on details for fast JSON queries

#### Performance Indexes (Migration 010)

- Composite indexes for common query patterns
- Partial indexes for filtered queries (pending bets, open markets, upcoming fixtures)
- Reduces query time from O(n) table scans to O(log n) index lookups

## Setup Instructions

### Prerequisites

- PostgreSQL 12+ installed
- Go 1.24+ installed
- Environment variables configured

### 1. Configure Database Connection

Set the environment variable for database connection:

```bash
# Production-like database
export GATEWAY_DB_DSN="postgres://user:password@localhost:5432/sportsbook"

# Development database
export GATEWAY_DB_DSN="postgres://postgres:postgres@localhost:5432/sportsbook_dev"

# Optional: Override driver (defaults to postgres)
export GATEWAY_DB_DRIVER="postgres"
```

### 2. Build Migration Tool

From the gateway service directory:

```bash
cd services/gateway
go mod download
go build -o bin/migrate ./cmd/migrate
```

### 3. Create Database

```bash
createdb sportsbook
# or
psql -U postgres -c "CREATE DATABASE sportsbook;"
```

### 4. Run Migrations

Apply all pending migrations:

```bash
./bin/migrate up
```

This will:
1. Create all 10 migration tables in order
2. Create all indexes
3. Record migration versions in schema_migrations table

## Common Tasks

### Check Migration Status

```bash
./bin/migrate status
```

Output shows:
```
Applied At                  Migration
2024-04-02 10:30:15 UTC -- 001_punters.sql
2024-04-02 10:30:20 UTC -- 002_sports_tournaments.sql
...
```

### Rollback One Migration

```bash
./bin/migrate down
```

Rolls back the most recently applied migration.

### Reset Database (Development Only)

```bash
./bin/migrate reset
```

Rolls back all migrations. Use with caution.

### Load Seed Data

After migrations are applied, load development seed data:

```bash
psql -U user -d sportsbook -f migrations/seed.sql
```

This populates:
- 3 sports with 3 tournaments
- 5 fixtures with various statuses
- 10 markets with 20 selections
- 3 test users with wallets and balances
- 5 sample bets with different outcomes
- 6 ledger entries showing transaction history
- 3 free bets with various expiration dates
- 3 odds boosts

## Design Decisions

### Primary Keys

All tables use TEXT primary keys to store UUIDs (36 characters). This allows:
- Distributed ID generation
- No auto-increment coordination needed
- Database-agnostic UUID format

### Currency Precision

All monetary amounts are stored as BIGINT in cents:
- 1 GBP = 100 cents = 100 stored
- Avoids floating-point precision issues
- Enables accurate arithmetic

### Timestamps

All timestamps use TIMESTAMP WITH TIME ZONE:
- Always stored in UTC
- Application layer handles timezone conversion
- Prevents timezone-related bugs

### JSON for Audit Logs

Audit details use JSONB (JSON Binary):
- Flexible schema for different action types
- GIN indexes enable efficient JSON queries
- Reduces number of tables needed

### Cascading Deletes

Most relationships use ON DELETE CASCADE:
- Deleting a fixture deletes all related markets, selections, bets
- Simplifies cleanup logic
- Prevents orphaned records

Exception: Bets reference markets/selections with ON DELETE RESTRICT:
- Prevents accidental deletion of referenced records
- Ensures data integrity for historical bets

### Indexes Strategy

**Always indexed:**
- Foreign keys (for join performance)
- Status fields (common filters)
- Timestamps (range queries)
- User IDs (access pattern)

**Partial indexes:**
- `idx_bets_pending` - Only pending bets
- `idx_fixtures_upcoming` - Only scheduled/pending fixtures
- `idx_markets_open` - Only open markets
- These dramatically speed up common queries by reducing index size

**Composite indexes:**
- User ID + timestamp for user action history
- Market ID + status for market queries
- Reduce need for multiple indexes

## Deployment

### Development

```bash
# Apply all migrations
export GATEWAY_DB_DSN="postgres://postgres:postgres@localhost:5432/sportsbook_dev"
./bin/migrate up

# Load seed data
psql -f migrations/seed.sql -d sportsbook_dev
```

### Staging/Production

```bash
# Set production connection
export GATEWAY_DB_DSN="postgres://prod_user:prod_pass@prod-host:5432/sportsbook"

# Check status before applying
./bin/migrate status

# Apply migrations (with backup)
./bin/migrate up

# Verify critical tables exist
psql -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

## Troubleshooting

### Migration Fails

Check logs in schema_migrations table:

```sql
SELECT * FROM schema_migrations;
```

If a migration is stuck:

```bash
./bin/migrate fix  # Try to fix broken state
./bin/migrate status  # Check status
```

### Duplicate Schema Detection

If migrations table already exists:

```bash
./bin/migrate status  # Shows applied migrations
./bin/migrate up      # Only applies missing ones
```

### Connection Issues

Test the connection before running migrations:

```bash
psql $GATEWAY_DB_DSN -c "SELECT version();"
```

If connection fails:
- Verify DSN format: `postgres://user:pass@host:port/database`
- Check database exists: `psql -l | grep sportsbook`
- Verify user permissions

## Next Steps

1. Run migrations on your database
2. Load seed data for development
3. Test application queries against schema
4. Create additional tables/migrations as needed
5. Document any schema changes in MIGRATIONS.md

## References

- [Goose Documentation](https://github.com/pressly/goose)
- [PostgreSQL JSON](https://www.postgresql.org/docs/current/datatype-json.html)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/sql-createindex.html)
