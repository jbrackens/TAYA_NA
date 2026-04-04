# Phoenix Sportsbook Frontend-Backend Integration Guide

This document describes the integration layer connecting the Phoenix Sportsbook frontend applications to the Go backend services.

## Overview

The integration consists of:

1. **Environment Configuration** - Frontend apps configured to connect to Go backend services
2. **API Client** - Singleton instances of `PhoenixApiClient` for both frontend apps
3. **WebSocket Client** - Real-time connection management for player app
4. **Next.js Middleware** - Authentication and route protection
5. **API Route Proxies** - Server-side proxies for SSR and CORS handling
6. **Docker Compose** - Local development infrastructure
7. **Development Start Script** - One-command startup for entire environment

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Applications                     │
├─────────────────────────────────────────────────────────────┤
│  Player App (port 3002) │ Backoffice App (port 3001)       │
│                                                              │
│  ├─ PhoenixApiClient (lib/api.ts)                          │
│  ├─ WebSocket Client (lib/ws.ts - player app only)         │
│  ├─ Middleware (middleware.ts - auth & routing)            │
│  └─ API Routes (app/api/* - server-side proxies)           │
└────────────┬────────────────────────────────────┬───────────┘
             │                                    │
             └─────────────┬──────────────────────┘
                          │
        ┌─────────────────┴──────────────────┐
        │    Next.js Rewrites & Proxies      │
        │  /api/v1/* → :18080                │
        │  /admin/* → :18080                 │
        │  ws:// → :18080/ws                 │
        └─────────────────┬──────────────────┘
                          │
┌─────────────────────────┴─────────────────────────────────┐
│              Go Backend Services                         │
├─────────────────────────────────────────────────────────┤
│  API Gateway (port 18080)   │  Auth Service (port 18081) │
│                             │                            │
│  - Fixtures                 │  - Login/Logout           │
│  - Markets                  │  - Token Refresh          │
│  - Bets                      │  - Session Management     │
│  - Wallet                    │  - JWT Validation         │
│  - Sports Catalog            │                           │
│  - WebSocket                 │                           │
│  - Admin APIs                │                           │
└─────────────┬───────────────┴────────────────┬──────────┘
              │                                │
              └────────────────┬───────────────┘
                              │
              ┌───────────────┴───────────────┐
              │    Shared Infrastructure      │
              ├───────────────────────────────┤
              │  PostgreSQL (port 5432)       │
              │  Redis (port 6379)            │
              │  Docker Network: phoenix      │
              └───────────────────────────────┘
```

## File Structure

### Player App (talon-backoffice/packages/app)

```
packages/app/
├── .env.local                              # Environment configuration
├── middleware.ts                           # Auth middleware
├── next.config.js                          # Next.js configuration with rewrites
├── lib/
│   ├── api.ts                             # API client singleton
│   └── ws.ts                              # WebSocket client singleton
└── app/api/
    ├── auth/login/route.ts                # Login proxy
    └── fixtures/route.ts                  # Fixtures proxy
```

### Backoffice App (talon-backoffice/packages/office)

```
packages/office/
├── .env.local                              # Environment configuration
├── middleware.ts                           # Auth middleware
├── next.config.js                          # Next.js configuration with rewrites
├── lib/
│   └── api.ts                             # API client singleton
└── app/api/
    ├── auth/login/route.ts                # Login proxy
    └── fixtures/route.ts                  # Fixtures proxy
```

### Root Infrastructure

```
/
├── docker-compose.yml                      # Local dev infrastructure
├── scripts/
│   └── dev-start.sh                       # One-command startup script
└── INTEGRATION_GUIDE.md                    # This file
```

## Configuration

### Environment Variables

Both frontend apps use these environment variables (in `.env.local`):

```bash
# Go Backend Endpoints
NEXT_PUBLIC_API_URL=http://localhost:18080      # API Gateway
NEXT_PUBLIC_AUTH_URL=http://localhost:18081     # Auth Service
NEXT_PUBLIC_WS_URL=ws://localhost:18080/ws      # WebSocket Endpoint
```

### Go Backend Services

- **API Gateway** - Main API service
  - Runs on port 18080
  - Database: PostgreSQL (localhost:5432)
  - Cache: Redis (localhost:6379)

- **Auth Service** - Authentication and token management
  - Runs on port 18081
  - Database: PostgreSQL (localhost:5432)
  - Cache: Redis (localhost:6379)

## Usage

### Quick Start

Start everything with one command:

```bash
./scripts/dev-start.sh
```

This will:
1. Check prerequisites (Docker, Node.js, etc.)
2. Start Docker services (PostgreSQL, Redis, Gateway, Auth)
3. Run database migrations
4. Seed development data
5. Start both frontend apps on ports 3001 and 3002
6. Display service URLs

### Manual Startup

If you prefer to start services individually:

#### Start Infrastructure

```bash
# Start Docker services
docker-compose up -d

# Wait for services to be healthy
docker-compose ps
```

#### Start Player App

```bash
cd talon-backoffice/packages/app
yarn dev -p 3002
```

#### Start Backoffice App

```bash
cd talon-backoffice/packages/office
yarn dev -p 3001
```

### Stop Services

```bash
# Stop all frontend apps (Ctrl+C in their terminals)

# Stop Docker services
docker-compose down
```

## API Client Usage

### Player App

```typescript
import { api } from '@/lib/api';

// Login
const response = await api.login({
  username: 'user@example.com',
  password: 'password'
});

// Get fixtures
const fixtures = await api.listFixtures({
  limit: 20,
  offset: 0
});

// Place bet
const bet = await api.placeBet({
  fixtureId: '123',
  marketId: '456',
  selectionId: '789',
  stake: 100
});

// Check authentication
if (api.isAuthenticated()) {
  // User is logged in
}

// Logout
api.logout();
```

### Backoffice App

```typescript
import { api } from '@/lib/api';

// Same as player app, plus admin-specific methods

// List all punters
const punters = await api.adminListPunters({
  limit: 50
});

// Get audit logs
const logs = await api.adminListAuditLogs({
  limit: 100
});

// Get risk rankings
const rankings = await api.adminGetRiskRankings(10);
```

## WebSocket Client Usage

Only available in player app.

```typescript
import { wsClient } from '@/lib/ws';

// Connect to WebSocket server
await wsClient.connect();

// Subscribe to fixture updates
wsClient.on('fixture-update', (data) => {
  console.log('Fixture updated:', data);
});

// Subscribe to odds changes
wsClient.on('odds-change', (data) => {
  console.log('Odds changed:', data);
});

// Send message
wsClient.send({
  type: 'subscribe-fixture',
  fixtureId: '123'
});

// Check connection
if (wsClient.isConnected()) {
  console.log('WebSocket connected');
}

// Disconnect
wsClient.disconnect();
```

## Authentication Flow

### Login Process

1. User submits login form
2. Frontend posts to `/api/auth/login`
3. API route proxies to `http://localhost:18081/api/v1/auth/login`
4. Auth service validates credentials and returns JWT tokens
5. Frontend stores `accessToken` in httpOnly cookie
6. Middleware validates token on protected routes
7. API client automatically includes token in authorization header

### Token Management

- **Access Token**: Short-lived JWT (expires per backend config)
- **Refresh Token**: Long-lived token for obtaining new access tokens
- **Auto-refresh**: PhoenixApiClient automatically refreshes expired tokens
- **Logout**: Clears tokens from cookies and auth manager

### Protected Routes

- **Player App**: `/` is public, other routes require auth
- **Backoffice App**: Only `/auth/*` routes are public
- **Middleware**: Redirects unauthenticated users to `/auth/login`

## Server-Side Rendering (SSR)

API routes in `app/api/*` enable SSR capabilities:

- `GET /api/fixtures` - Fetch fixtures for server components
- `POST /api/auth/login` - Handle login from server
- Automatically includes auth token from cookies
- Avoids CORS issues by proxying to Go backend

Example server component:

```typescript
// app/fixtures/page.tsx
export default async function FixturesPage() {
  const res = await fetch('http://localhost:3002/api/fixtures', {
    headers: {
      Cookie: `authToken=${process.env.AUTH_TOKEN}`,
    },
  });

  const { items } = await res.json();

  return (
    <div>
      {items.map(fixture => (
        <div key={fixture.id}>{fixture.name}</div>
      ))}
    </div>
  );
}
```

## API Rewrites

Next.js rewrites proxy API requests to avoid CORS issues in development:

```javascript
// next.config.js
async rewrites() {
  return {
    beforeFiles: [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:18080/api/v1/:path*',
      },
      {
        source: '/admin/:path*',
        destination: 'http://localhost:18080/admin/:path*',
      },
    ],
  };
}
```

This allows client-side code to call `/api/v1/*` directly.

## Docker Services

### PostgreSQL

- **Image**: postgres:16-alpine
- **Port**: 5432
- **Database**: phoenix_sportsbook
- **User**: phoenix / Password: localdev
- **Volume**: postgres_data

### Redis

- **Image**: redis:7-alpine
- **Port**: 6379
- **Volume**: redis_data

### API Gateway

- **Port**: 18080
- **Environment**:
  - `GATEWAY_DB_DSN`: Database connection string
  - `REDIS_URL`: Redis URL
  - `LOG_LEVEL`: debug/info/warn/error

### Auth Service

- **Port**: 18081
- **Environment**:
  - `AUTH_DB_DSN`: Database connection string
  - `REDIS_URL`: Redis URL
  - `JWT_SECRET`: Secret for signing JWTs

## Debugging

### View Docker Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f gateway
docker-compose logs -f auth
docker-compose logs -f postgres
```

### API Client Debugging

```typescript
// Get auth manager for inspection
const authManager = api.getAuthManager();
console.log('Token:', authManager.getAccessToken());
console.log('Authenticated:', api.isAuthenticated());
```

### WebSocket Debugging

```typescript
// Check connection status
console.log('Connected:', wsClient.isConnected());

// Listen to all messages
wsClient.on('*', (data, message) => {
  console.log('Received:', message);
});
```

### Check Service Health

```bash
# API Gateway
curl http://localhost:18080/health

# Auth Service
curl http://localhost:18081/health

# PostgreSQL
docker-compose exec postgres pg_isready -U phoenix

# Redis
docker-compose exec redis redis-cli ping
```

## Troubleshooting

### Services Won't Start

1. Check Docker is running: `docker ps`
2. Check ports are available: `netstat -an | grep 18080`
3. Check Docker logs: `docker-compose logs`
4. Rebuild services: `docker-compose down && docker-compose up --build`

### Frontend App Won't Connect

1. Verify .env.local has correct URLs
2. Check backend services are running: `docker-compose ps`
3. Test API endpoint: `curl http://localhost:18080/api/v1/health`
4. Clear Next.js cache: `rm -rf .next`

### Authentication Issues

1. Check auth token in cookies: DevTools → Application → Cookies
2. Verify token format: Should start with "eyJ..." (JWT)
3. Check token expiry: `jwt.io`
4. Verify Redis is running: `docker-compose exec redis redis-cli ping`

### WebSocket Connection Failed

1. Check WebSocket URL in .env.local
2. Verify gateway has WebSocket support
3. Check browser console for connection errors
4. Test WS endpoint: `wscat -c ws://localhost:18080/ws`

## Production Deployment

For production, ensure:

1. **Environment Variables**
   - `NEXT_PUBLIC_API_URL`: Production API gateway URL
   - `NEXT_PUBLIC_AUTH_URL`: Production auth service URL
   - `NEXT_PUBLIC_WS_URL`: Production WebSocket URL

2. **Security**
   - Use HTTPS/WSS in production
   - Use secure, httpOnly cookies
   - Implement CSRF protection
   - Validate all tokens on backend

3. **Performance**
   - Enable compression in Next.js
   - Cache API responses appropriately
   - Monitor WebSocket connections
   - Set up error tracking (Sentry, etc.)

4. **Monitoring**
   - Monitor API response times
   - Track authentication failures
   - Monitor WebSocket disconnections
   - Set up health checks

## Related Documentation

- [Phoenix API Client README](talon-backoffice/packages/api-client/README.md)
- [Go Platform Services](go-platform/README.md)
- [Player App README](talon-backoffice/packages/app/README.md)
- [Backoffice App README](talon-backoffice/packages/office/README.md)
