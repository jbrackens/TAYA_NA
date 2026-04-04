# Phoenix Sportsbook: Developer Setup Guide

Complete setup guide for local development of the Phoenix Sportsbook platform.

## Prerequisites

Ensure you have the following installed on your system:

- **Go** 1.24 or later
  ```bash
  go version
  # go version go1.24.0 linux/amd64
  ```

- **Node.js** 20 or later (via nvm recommended)
  ```bash
  node --version
  # v20.10.0 or later
  ```

- **Yarn** 1.22.22
  ```bash
  yarn --version
  # 1.22.22
  ```

- **Docker** and **Docker Compose**
  ```bash
  docker --version
  # Docker version 24.0+
  docker-compose --version
  # Docker Compose version 2.20+
  ```

- **Git**
  ```bash
  git --version
  # git version 2.40+
  ```

### Optional but Recommended

- **PostgreSQL client** (psql) for direct database inspection
  ```bash
  psql --version
  # psql (PostgreSQL) 14+
  ```

- **Redis CLI** for debugging Redis
  ```bash
  redis-cli --version
  # redis-cli 7.0+
  ```

## Quick Start (One Command)

The fastest way to get the entire stack running:

```bash
# Clone the repository
git clone <repo-url>
cd Phoenix-Sportsbook-Combined

# Bootstrap and start everything
make bootstrap && make start
```

This single command will:
1. Install all Go and Node.js dependencies
2. Create local environment files
3. Start PostgreSQL, Redis, Gateway, Auth Service
4. Start Player App and Backoffice
5. Run database migrations
6. Load seed data

Once complete, you'll see output like:
```
✓ PostgreSQL running at localhost:5432
✓ Redis running at localhost:6379
✓ Gateway API at http://localhost:18080
✓ Auth Service at http://localhost:18081
✓ Player App at http://localhost:3002
✓ Backoffice at http://localhost:3000
```

## Manual Setup (Step-by-Step)

If you prefer to set up services individually:

### 1. Install Dependencies

```bash
# Bootstrap will install dependencies for all packages
make bootstrap
```

This installs:
- Go module dependencies (via `go mod download`)
- Node packages for Player App and Backoffice (via `yarn install`)

### 2. Start Infrastructure

```bash
# Start PostgreSQL and Redis via Docker
docker-compose up -d postgres redis
```

Verify they're running:
```bash
make status
# Should show postgres and redis as healthy
```

### 3. Run Database Migrations

```bash
cd go-platform/services/gateway

# Build the migration tool
go build -o bin/migrate ./cmd/migrate

# Apply all migrations
GATEWAY_DB_DSN="postgres://phoenix:localdev@localhost:5432/phoenix_sportsbook" \
  ./bin/migrate up

# Check migration status
./bin/migrate status
```

### 4. Load Seed Data (Optional)

```bash
psql -U phoenix -d phoenix_sportsbook -h localhost \
  -f go-platform/services/gateway/migrations/seed.sql
```

This loads:
- Sample sports (Football, Basketball, Tennis)
- Sample tournaments
- Sample fixtures and matches
- Sample markets with odds
- Sample users with accounts
- Sample bets for testing

### 5. Start Go Services

**Terminal 1: Gateway Service**
```bash
cd go-platform/services/gateway

export GATEWAY_PORT=18080
export GATEWAY_DB_DSN="postgres://phoenix:localdev@localhost:5432/phoenix_sportsbook"
export REDIS_URL="redis://localhost:6379/0"
export LOG_LEVEL=debug

go run ./cmd/gateway
```

Expected output:
```
[INFO] Connecting to database: postgres://phoenix:localdev@localhost:5432/phoenix_sportsbook
[INFO] Connecting to Redis: redis://localhost:6379/0
[INFO] Gateway listening on :18080
```

**Terminal 2: Auth Service**
```bash
cd go-platform/services/auth

export AUTH_PORT=18081
export AUTH_DB_DSN="postgres://phoenix:localdev@localhost:5432/phoenix_sportsbook"
export REDIS_URL="redis://localhost:6379/0"
export JWT_SECRET="dev-secret-key-change-in-production"
export LOG_LEVEL=debug

go run ./cmd/auth
```

Expected output:
```
[INFO] Auth service listening on :18081
[INFO] Database connected
```

### 6. Start Frontend Services

**Terminal 3: Player App**
```bash
cd phoenix-frontend-brand-viegg/packages/app

# Create .env.local if not exists
cat > .env.local << 'EOF'
ENV_NAME=local
API_GLOBAL_ENDPOINT=http://localhost:18080
WS_GLOBAL_ENDPOINT=ws://localhost:18080/ws
CDN_URL=http://localhost:3002/static
EOF

yarn dev
```

Expected output:
```
> ready - started server on 0.0.0.0:3002, url: http://localhost:3002
```

**Terminal 4: Backoffice**
```bash
cd talon-backoffice/packages/office

# Create .env.local if not exists
cat > .env.local << 'EOF'
API_GLOBAL_ENDPOINT=http://localhost:18080
EOF

yarn dev
```

Expected output:
```
> ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

## Service URLs and Ports

Once all services are running:

| Service | URL | Port | Purpose |
|---------|-----|------|---------|
| **Player App** | http://localhost:3002 | 3002 | Sportsbook UI for bettors |
| **Backoffice** | http://localhost:3000 | 3000 | Admin dashboard |
| **Gateway API** | http://localhost:18080 | 18080 | REST API + WebSocket |
| **Auth Service** | http://localhost:18081 | 18081 | Authentication |
| **PostgreSQL** | localhost:5432 | 5432 | Database |
| **Redis** | localhost:6379 | 6379 | Cache & pub/sub |

## Demo Credentials

Use these test accounts to log in:

### Player Account
- **Email:** demo@phoenix.local
- **Password:** demo123
- **Starting Balance:** 1000 credits

### Admin Account
- **Email:** admin@phoenix.local
- **Password:** admin123
- **Access:** Backoffice at http://localhost:3000

### Other Test Accounts
- **test1@phoenix.local** / **test123**
- **test2@phoenix.local** / **test123**
- **test3@phoenix.local** / **test123**

## Database: Migrations, Seed Data, and Connection

### Running Migrations

```bash
cd go-platform/services/gateway

# Build migration tool
go build -o bin/migrate ./cmd/migrate

# Apply all migrations
GATEWAY_DB_DSN="postgres://phoenix:localdev@localhost:5432/phoenix_sportsbook" \
  ./bin/migrate up

# Rollback one migration
./bin/migrate down

# Check status
./bin/migrate status
```

### Creating a New Migration

```bash
cd go-platform/services/gateway

# Creates migrations/NNN_description.sql
./bin/migrate create add_new_column_to_users
```

Edit the generated file with SQL for up/down migration:

```sql
-- +goose Up
ALTER TABLE punters ADD COLUMN preferred_language TEXT DEFAULT 'en';

-- +goose Down
ALTER TABLE punters DROP COLUMN preferred_language;
```

### Connecting Directly to Database

**Using psql:**
```bash
psql -U phoenix -h localhost -d phoenix_sportsbook
# Password: localdev

# List tables
\dt

# Describe a table
\d bets

# Run a query
SELECT COUNT(*) FROM bets;

# Exit
\q
```

**Using Go:**
```go
import "database/sql"
import _ "github.com/lib/pq"

db, err := sql.Open("postgres",
  "postgres://phoenix:localdev@localhost:5432/phoenix_sportsbook")
if err != nil {
  log.Fatal(err)
}

rows, err := db.Query("SELECT id, email FROM punters LIMIT 5")
// ...
```

### Loading Custom Seed Data

Create a SQL file with seed data:

```sql
-- seed-custom.sql
INSERT INTO punters (id, email, password_hash, status, kyc_status, created_at, updated_at)
VALUES (
  'user-' || uuid_generate_v4()::text,
  'newtestuser@example.com',
  '$2a$10$...',  -- bcrypt hash
  'active',
  'verified',
  NOW(),
  NOW()
) ON CONFLICT DO NOTHING;
```

Load it:
```bash
psql -U phoenix -h localhost -d phoenix_sportsbook -f seed-custom.sql
```

### Database Backup and Restore

**Backup:**
```bash
pg_dump -U phoenix -h localhost phoenix_sportsbook > backup.sql
```

**Restore:**
```bash
psql -U phoenix -h localhost -d phoenix_sportsbook < backup.sql
```

**Backup entire Docker volume:**
```bash
docker-compose exec postgres pg_dump -U phoenix phoenix_sportsbook > backup.sql
```

## Running Tests

### Go Tests

Run all Go tests across the platform:

```bash
make go-test
```

Run tests for a specific service:

```bash
cd go-platform/services/gateway
go test ./...

cd go-platform/services/auth
go test ./...
```

Run tests with coverage:

```bash
go test -cover ./...
```

Generate coverage report:

```bash
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Frontend Tests (Jest)

Run Player App tests:

```bash
cd phoenix-frontend-brand-viegg/packages/app
yarn test
```

Run Backoffice tests:

```bash
cd talon-backoffice/packages/office
yarn test
```

Run with coverage:

```bash
yarn test --coverage
```

### End-to-End Tests (Playwright)

Run critical path E2E tests:

```bash
make qa-e2e-critical
```

This runs Playwright tests covering:
- User login
- Viewing markets
- Placing a bet
- Viewing account
- Market settlement

## Common Development Tasks

### Add a New API Endpoint

**1. Define the HTTP handler in Gateway:**

```go
// go-platform/services/gateway/internal/http/handlers/bets.go

func (h *Handler) GetUserBets(w http.ResponseWriter, r *http.Request) {
  ctx := r.Context()

  // Get user from context (set by auth middleware)
  userID, ok := ctx.Value("user_id").(string)
  if !ok {
    http.Error(w, "Unauthorized", http.StatusUnauthorized)
    return
  }

  // Query database
  rows, err := h.db.QueryContext(ctx,
    "SELECT id, stake, odds, status FROM bets WHERE punter_id = $1 ORDER BY placed_at DESC",
    userID,
  )
  if err != nil {
    http.Error(w, err.Error(), http.StatusInternalServerError)
    return
  }
  defer rows.Close()

  var bets []BetResponse
  for rows.Next() {
    var bet BetResponse
    if err := rows.Scan(&bet.ID, &bet.Stake, &bet.Odds, &bet.Status); err != nil {
      http.Error(w, err.Error(), http.StatusInternalServerError)
      return
    }
    bets = append(bets, bet)
  }

  // Return JSON response
  w.Header().Set("Content-Type", "application/json")
  json.NewEncoder(w).Encode(bets)
}
```

**2. Register the route:**

```go
// go-platform/services/gateway/cmd/gateway/main.go

router.Get("/api/v1/bets", h.GetUserBets)
```

**3. Test the endpoint:**

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:18080/api/v1/bets
```

### Add a New Market Type

**1. Update the database schema:**

```sql
-- go-platform/services/gateway/migrations/NNN_add_new_market_type.sql
-- +goose Up
ALTER TABLE markets
  ADD CONSTRAINT valid_market_type
  CHECK (market_type IN ('moneyline', 'spread', 'totals', 'props', 'player_props', 'parlay'));

-- +goose Down
ALTER TABLE markets DROP CONSTRAINT valid_market_type;
```

**2. Update the API client types:**

```typescript
// talon-backoffice/packages/api-client/src/types/market.ts

export enum MarketType {
  Moneyline = 'moneyline',
  Spread = 'spread',
  Totals = 'totals',
  Props = 'props',
  PlayerProps = 'player_props',
  Parlay = 'parlay',  // New type
}
```

**3. Update the Backoffice UI:**

```typescript
// talon-backoffice/packages/office/src/components/MarketForm.tsx

const MARKET_TYPES = [
  { label: 'Moneyline', value: MarketType.Moneyline },
  { label: 'Spread', value: MarketType.Spread },
  { label: 'Totals', value: MarketType.Totals },
  { label: 'Props', value: MarketType.Props },
  { label: 'Player Props', value: MarketType.PlayerProps },
  { label: 'Parlay', value: MarketType.Parlay },  // New option
];
```

### Add a New UI Component

**1. Create the component in design-system:**

```typescript
// talon-backoffice/packages/design-system/src/components/BetSlip.tsx

import React from 'react';

interface BetSlipProps {
  bets: Bet[];
  onRemove: (betId: string) => void;
  onSubmit: () => void;
}

export const BetSlip: React.FC<BetSlipProps> = ({ bets, onRemove, onSubmit }) => {
  const totalStake = bets.reduce((sum, bet) => sum + bet.stake, 0);
  const potentialPayout = bets.reduce((sum, bet) => sum + bet.potentialPayout, 0);

  return (
    <div className="bet-slip">
      <h3>Bet Slip</h3>
      {bets.map(bet => (
        <div key={bet.id} className="bet-item">
          <span>{bet.selection}</span>
          <button onClick={() => onRemove(bet.id)}>Remove</button>
        </div>
      ))}
      <div className="summary">
        <p>Total Stake: ${(totalStake / 100).toFixed(2)}</p>
        <p>Potential Payout: ${(potentialPayout / 100).toFixed(2)}</p>
      </div>
      <button onClick={onSubmit}>Place Bet</button>
    </div>
  );
};
```

**2. Export from design-system:**

```typescript
// talon-backoffice/packages/design-system/src/index.ts
export { BetSlip } from './components/BetSlip';
```

**3. Use in Player App:**

```typescript
// phoenix-frontend-brand-viegg/packages/app/src/pages/bets.tsx

import { BetSlip } from '@phoenix-ui/design-system';

export default function BetsPage() {
  const [bets, setBets] = useState<Bet[]>([]);

  return (
    <div>
      <BetSlip
        bets={bets}
        onRemove={id => setBets(bets.filter(b => b.id !== id))}
        onSubmit={() => handlePlaceBets(bets)}
      />
    </div>
  );
}
```

## Troubleshooting Common Issues

### "Port already in use" Error

```bash
# Find process using port
lsof -i :18080

# Kill the process
kill -9 <PID>

# Or change the port
GATEWAY_PORT=18081 go run ./cmd/gateway
```

### Database Connection Refused

```bash
# Check if Docker containers are running
docker ps

# Start missing containers
docker-compose up -d postgres redis

# Check container logs
docker logs phoenix_postgres

# Verify database credentials
psql -U phoenix -h localhost -d phoenix_sportsbook
```

### WebSocket Connection Failed

```bash
# Check if Gateway is running
curl http://localhost:18080/api/v1/status

# Check firewall
sudo ufw allow 18080

# Verify WebSocket endpoint in client
// Should be: ws://localhost:18080/ws
// Not: http://localhost:18080/ws
```

### "Cannot find module" in Frontend

```bash
# Clean and reinstall dependencies
cd phoenix-frontend-brand-viegg
rm -rf node_modules
yarn install

# Clear Next.js cache
rm -rf .next
yarn dev
```

### Token Expiration Issues

```bash
# Tokens expire after 24 hours in development
# Create a new one by logging in again

# Or extend the token lifetime (dev only):
export JWT_EXPIRY=720h  # 30 days
go run ./cmd/auth
```

### Database Constraint Violations

```bash
# Check constraints
SELECT constraint_name FROM information_schema.table_constraints
WHERE table_name = 'bets';

# Find duplicate data
SELECT stake, COUNT(*) FROM bets GROUP BY stake HAVING COUNT(*) > 1;

# Clear all data (development only)
TRUNCATE bets, markets, fixtures CASCADE;

# Reload seed data
psql -U phoenix -d phoenix_sportsbook -f migrations/seed.sql
```

## Performance Optimization Tips

### Database Query Optimization

1. **Use EXPLAIN to analyze queries:**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM bets WHERE punter_id = 'user-1' AND status = 'pending';
   ```

2. **Create indexes for frequently filtered columns:**
   ```sql
   CREATE INDEX idx_bets_punter_status ON bets(punter_id, status);
   ```

3. **Use connection pooling in application code**

4. **Monitor slow queries:**
   ```sql
   SET log_min_duration_statement = 1000;  -- Log queries slower than 1s
   ```

### Frontend Performance

1. **Enable production builds:**
   ```bash
   yarn build && yarn start  # Use optimized Next.js build
   ```

2. **Use React DevTools Profiler** to identify slow renders

3. **Code splitting:** Next.js does this automatically for routes

4. **Image optimization:** Use Next.js `<Image>` component

### Go Service Performance

1. **Profile the application:**
   ```bash
   go run -cpuprofile=cpu.prof ./cmd/gateway
   go tool pprof cpu.prof
   ```

2. **Use benchmarks:**
   ```bash
   go test -bench=. ./...
   ```

3. **Enable connection pooling:**
   ```go
   db.SetMaxOpenConns(100)
   db.SetMaxIdleConns(25)
   ```

## Useful Development Commands

```bash
# Check service status and health
make status

# View all service logs in real-time
make logs

# Run comprehensive verification (all tests and builds)
make verify

# Database management
make validate-migrations
make seed-deterministic

# Load testing
make qa-load-baseline

# Security scanning
make security-baseline

# Clean up Docker resources
docker-compose down -v
```

## IDE Setup

### VS Code Extensions (Recommended)

- **Go** (golang.go) — Go language support
- **REST Client** (humao.rest-client) — Test API endpoints
- **PostgreSQL** (ckolkman.vscode-postgres) — Database explorer
- **Prettier** (esbenp.prettier-vscode) — Code formatting
- **ESLint** (dbaeumer.vscode-eslint) — JavaScript linting

### VS Code Settings (.vscode/settings.json)

```json
{
  "[go]": {
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports": "explicit"
    },
    "editor.defaultFormatter": "golang.go"
  },
  "[typescript]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "go.lintOnSave": "package",
  "go.lintTool": "golangci-lint",
  "go.lintArgs": ["--fast"]
}
```

### GoLand / IntelliJ IDEA

1. Open project in GoLand
2. Set Go SDK to local Go 1.24+
3. Set Node interpreter to nvm Node 20+
4. Enable Vue/TypeScript plugin for frontend code
5. Configure Run Configurations for gateway and auth services

## References

- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
- See `go-platform/services/gateway/README.md` for Gateway details
- See `go-platform/services/auth/README.md` for Auth details
- See `talon-backoffice/packages/api-client/README.md` for API client
