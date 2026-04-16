# Phoenix Sportsbook Gateway Migrations

This directory contains database migrations for the Phoenix Sportsbook Gateway service using [Goose](https://github.com/pressly/goose).

## Migration Files

- `001_punters.sql` - Users/punters table with authentication fields
- `002_sports_tournaments.sql` - Sports and tournaments reference data
- `003_fixtures.sql` - Sports fixtures/matches
- `004_markets_selections.sql` - Betting markets and selections
- `005_bets.sql` - User bets and their status
- `006_wallets_ledger.sql` - User wallets and transaction ledger
- `007_freebets_oddsboosts.sql` - Free bets and odds boost promotions
- `008_match_timelines.sql` - Match timelines and incidents (goals, cards, etc)
- `009_audit_logs.sql` - Audit logging with JSONB details
- `010_indexes.sql` - Performance indexes and partial indexes

## Running Migrations

### Prerequisites

Set the database connection environment variable:

```bash
export GATEWAY_DB_DSN="postgres://user:password@localhost:5432/sportsbook"
```

Optionally override the driver (defaults to postgres):

```bash
export GATEWAY_DB_DRIVER="postgres"
```

### Commands

Build the migration tool:

```bash
cd services/gateway
go build -o bin/migrate ./cmd/migrate
```

Apply all pending migrations:

```bash
./bin/migrate up
```

Check migration status:

```bash
./bin/migrate status
```

Rollback one migration:

```bash
./bin/migrate down
```

Reset to a specific version:

```bash
./bin/migrate reset
```

Create a new migration:

```bash
./bin/migrate create add_column_to_table
```

## Database Schema

### Core Tables

- **punters**: User accounts with authentication
- **sports**: Sport types (football, basketball, tennis)
- **tournaments**: League/tournament definitions
- **fixtures**: Individual matches/games

### Betting Tables

- **markets**: Betting markets for fixtures
- **selections**: Individual bets within markets (outcome options)
- **bets**: Placed bets by users
- **odds_boosts**: Promotional odds enhancements

### Financial Tables

- **wallets**: User account balances
- **ledger_entries**: Transaction audit trail
- **freebets**: Promotional free bet allocations

### Match Data Tables

- **match_timelines**: Match progress tracking
- **incidents**: Events during matches (goals, cards)

### Audit Tables

- **audit_logs**: User action audit trail with JSONB details

## Development

Load seed data into a development database:

```bash
psql -U user -d sportsbook -f migrations/seed.sql
```

The seed data includes:
- 3 sample sports and tournaments
- 5 sample fixtures (scheduled, in-progress, completed)
- 10 sample markets with 20 selections
- 3 sample users with wallets
- 5 sample bets with various statuses
- Ledger entries showing transaction history
- Free bets and odds boosts

## Notes

- All tables use TEXT primary keys (UUID strings)
- Timestamps use TIMESTAMP WITH TIME ZONE for UTC consistency
- Foreign key constraints use ON DELETE CASCADE where appropriate
- Amounts are stored in cents (BIGINT) for currency precision
- JSONB is used for audit log details to support flexible logging
- Indexes include partial indexes for common queries (pending bets, open markets, etc)
- The migrations are idempotent using PostgreSQL's ON CONFLICT clauses in seed data
