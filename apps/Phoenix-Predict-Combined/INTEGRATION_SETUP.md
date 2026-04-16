# Phoenix Sportsbook Integration Setup - Complete

This document describes all files created for the frontend-backend integration.

## Files Created

### 1. Environment Configuration

#### Player App
- **File**: `talon-backoffice/packages/app/.env.local`
- **Purpose**: Configure API endpoints for player application
- **Contents**:
  ```
  NEXT_PUBLIC_API_URL=http://localhost:18080
  NEXT_PUBLIC_AUTH_URL=http://localhost:18081
  NEXT_PUBLIC_WS_URL=ws://localhost:18080/ws
  ```

#### Backoffice App
- **File**: `talon-backoffice/packages/office/.env.local`
- **Purpose**: Configure API endpoints for backoffice application
- **Contents**: Same as player app

### 2. API Client Singletons

#### Player App
- **File**: `talon-backoffice/packages/app/lib/api.ts`
- **Purpose**: Singleton instance of PhoenixApiClient
- **Exports**:
  - `getApiClient()` - Get or create singleton
  - `api` - Direct singleton reference
  - `resetApiClient()` - Reset for testing

#### Backoffice App
- **File**: `talon-backoffice/packages/office/lib/api.ts`
- **Purpose**: Singleton instance of PhoenixApiClient for backoffice
- **Same exports** as player app

### 3. WebSocket Client

#### Player App Only
- **File**: `talon-backoffice/packages/app/lib/ws.ts`
- **Purpose**: WebSocket connection management for real-time updates
- **Exports**:
  - `PhoenixWebSocketClient` - WebSocket client class
  - `getWebSocketClient()` - Get singleton instance
  - `wsClient` - Direct singleton reference
  - `resetWebSocketClient()` - Reset for testing

**Features**:
- Automatic reconnection with exponential backoff
- Message type routing with handlers
- Connection state tracking
- Error handling and logging

### 4. Authentication Middleware

#### Player App
- **File**: `talon-backoffice/packages/app/middleware.ts`
- **Purpose**: Next.js middleware for auth and route protection
- **Public Routes**: `/`, `/sports/*`, `/match/*`, `/live`, `/auth/*`
- **Protected Routes**: All others
- **Behavior**: Redirects unauthenticated users to `/auth/login`

#### Backoffice App
- **File**: `talon-backoffice/packages/office/middleware.ts`
- **Purpose**: Next.js middleware for backoffice auth
- **Public Routes**: `/auth/*` only
- **Protected Routes**: All others
- **Behavior**: Strict auth requirement except login pages

### 5. API Route Proxies

#### Player App
- **File**: `talon-backoffice/packages/app/app/api/auth/login/route.ts`
  - POST endpoint for login
  - Proxies to Go auth service
  - Sets httpOnly auth token cookie
  - Returns token response

- **File**: `talon-backoffice/packages/app/app/api/fixtures/route.ts`
  - GET endpoint for fixtures
  - Proxies to Go API gateway
  - Includes auth token from cookies
  - Enables SSR for fixtures page

#### Backoffice App
- **File**: `talon-backoffice/packages/office/app/api/auth/login/route.ts`
  - Same functionality as player app
  - Proxies to Go auth service

- **File**: `talon-backoffice/packages/office/app/api/fixtures/route.ts`
  - Same functionality as player app
  - Proxies to Go API gateway

### 6. Next.js Configuration

#### Player App
- **File**: `talon-backoffice/packages/app/next.config.js`
- **Updates**:
  - Added environment variable exposure (NEXT_PUBLIC_*)
  - Added API rewrites for `/api/v1/*` and `/admin/*`
  - Proxies to Go backend (avoids CORS in dev)
  - Maintains existing config (i18n, webpack, styles, etc.)

#### Backoffice App
- **File**: `talon-backoffice/packages/office/next.config.js`
- **Updates**: Same as player app
  - API rewrites for development
  - Environment variable exposure
  - Maintains existing config

### 7. Docker Compose

- **File**: `docker-compose.yml` (at monorepo root)
- **Services**:
  - **PostgreSQL 16** - Database for all services
    - Port: 5432
    - Database: phoenix_sportsbook
    - Credentials: phoenix/localdev
  - **Redis 7** - Cache for all services
    - Port: 6379
  - **API Gateway** - Main Go service
    - Port: 18080
    - Environment: DB DSN, Redis URL, logging
  - **Auth Service** - Authentication Go service
    - Port: 18081
    - Environment: DB DSN, Redis URL, JWT secret

**Network**: All services connected via `phoenix_network`
**Volumes**: Persistent data for PostgreSQL and Redis

### 8. Development Start Script

- **File**: `scripts/dev-start.sh`
- **Purpose**: One-command startup for entire development environment
- **Functionality**:
  1. Prerequisites check (Docker, Node.js, yarn/npm)
  2. Start Docker services
  3. Run database migrations
  4. Seed development data
  5. Install dependencies for both apps
  6. Start player app on port 3002
  7. Start backoffice on port 3001
  8. Display service URLs and commands

**Usage**:
```bash
./scripts/dev-start.sh
```

**Features**:
- Comprehensive error checking
- Color-coded output
- Service health checks
- Graceful shutdown handling
- Helpful summary display

### 9. Documentation

- **File**: `INTEGRATION_GUIDE.md` (at monorepo root)
- **Contents**:
  - Architecture overview with diagram
  - File structure for both apps
  - Configuration details
  - Usage instructions
  - API client examples
  - WebSocket client examples
  - Authentication flow
  - SSR implementation
  - API rewrites explanation
  - Docker services details
  - Debugging guide
  - Troubleshooting section
  - Production deployment notes

- **File**: `INTEGRATION_SETUP.md` (at monorepo root)
- **Contents**: This file - summary of what was created

## How It Works

### Frontend → Backend Flow

1. **Frontend App** makes API request
   - Example: `api.login({ username, password })`

2. **PhoenixApiClient** builds request
   - Uses `NEXT_PUBLIC_API_URL` from .env.local
   - Adds authorization header with token
   - Implements retry logic

3. **Two possible paths**:

   **Option A: Client-side requests**
   - Next.js rewrite proxies `/api/v1/*` to Go backend
   - Avoids CORS issues in development
   - Browser makes request through same origin

   **Option B: Server-side requests**
   - Server component uses `/api/fixtures` route
   - API route fetches from Go backend
   - Returns data to server component

4. **Go Backend** processes request
   - API Gateway (:18080) for most endpoints
   - Auth Service (:18081) for auth endpoints
   - Returns response

5. **Response handling**
   - PhoenixApiClient parses JSON
   - Manages tokens (refresh on 401)
   - Throws typed errors

### Authentication Flow

```
User Login
  ↓
Form Submit to /api/auth/login
  ↓
API Route Proxy
  ↓
Go Auth Service (:18081)
  ↓
Validates credentials → Issues JWT tokens
  ↓
API Route sets httpOnly cookie
  ↓
Frontend stores accessToken in memory
  ↓
Subsequent requests include auth cookie
  ↓
Middleware validates token
  ↓
Access granted to protected routes
```

### WebSocket Connection (Player App)

```
App Initialization
  ↓
wsClient.connect()
  ↓
Establishes WebSocket to ws://localhost:18080/ws
  ↓
Client subscribes to message types
wsClient.on('fixture-update', handler)
  ↓
Go Gateway sends real-time updates
  ↓
Handlers process updates
  ↓
UI re-renders with new data
```

## Testing the Integration

### 1. Start everything
```bash
./scripts/dev-start.sh
```

### 2. Test Player App
```bash
# Open http://localhost:3002
# Should see public sports page
# Click to protected route → redirect to login
```

### 3. Test Backoffice App
```bash
# Open http://localhost:3001
# Should redirect to login (all routes protected)
# Use test credentials
```

### 4. Test API Client
```typescript
// In browser console on either app
api.listSports().then(console.log)
```

### 5. Test WebSocket (Player App)
```typescript
// In browser console
wsClient.isConnected() // Should be true after connection
```

### 6. Test Auth Flow
```bash
# Login with test credentials
# Check DevTools > Application > Cookies
# Should see 'authToken' httpOnly cookie
```

## Deployment

### Environment Variables
Set these in production:
- `NEXT_PUBLIC_API_URL` - Production API URL
- `NEXT_PUBLIC_AUTH_URL` - Production auth URL
- `NEXT_PUBLIC_WS_URL` - Production WebSocket URL (WSS)

### Build
```bash
# Player app
cd talon-backoffice/packages/app
yarn build

# Backoffice app
cd talon-backoffice/packages/office
yarn build
```

### Run
```bash
# Player app
yarn start

# Backoffice app
yarn start
```

## Architecture Benefits

1. **Type Safety** - Full TypeScript support throughout
2. **Auto Retry** - Automatic token refresh on 401
3. **Singleton Pattern** - Single API client instance per app
4. **Real-time** - WebSocket support for live updates
5. **SSR Ready** - API routes enable server-side rendering
6. **CORS Handling** - Next.js rewrites avoid CORS in dev
7. **Security** - httpOnly cookies for token storage
8. **Error Handling** - Comprehensive error types and recovery
9. **Testing** - Reset functions for test isolation
10. **Monitoring** - Health checks and logging

## Next Steps

1. Implement login pages using `api.login()`
2. Wire components to use `api` singleton
3. Add WebSocket subscriptions for real-time data
4. Create protected route guards
5. Implement error handling and user feedback
6. Add request loading states
7. Implement token refresh UI
8. Set up error tracking (Sentry, etc.)
9. Configure production endpoints
10. Deploy to staging/production

## Support

For detailed integration documentation, see `INTEGRATION_GUIDE.md`
For API client documentation, see `talon-backoffice/packages/api-client/README.md`
