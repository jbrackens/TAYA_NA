# Phoenix Sportsbook Frontend-Backend Integration - COMPLETE

**Status**: All integration files created and configured. Ready for development.

## Summary

The entire frontend-backend integration layer has been created, connecting the Phoenix Sportsbook frontend applications (player app and backoffice) to the Go backend services (API Gateway and Auth Service) running on ports 18080 and 18081.

## What Was Created

### 1. Environment Configuration Files
- `talon-backoffice/packages/app/.env.local` - Player app endpoints
- `talon-backoffice/packages/office/.env.local` - Backoffice endpoints

**Content**:
```
NEXT_PUBLIC_API_URL=http://localhost:18080
NEXT_PUBLIC_AUTH_URL=http://localhost:18081
NEXT_PUBLIC_WS_URL=ws://localhost:18080/ws
```

### 2. API Client Singletons (lib/api.ts)
- `talon-backoffice/packages/app/lib/api.ts` (39 lines)
- `talon-backoffice/packages/office/lib/api.ts` (39 lines)

**Features**:
- Singleton pattern for PhoenixApiClient
- Automatic initialization with environment variables
- `api` export for direct usage throughout apps
- `getApiClient()` function for lazy initialization
- `resetApiClient()` for test isolation

**Usage**:
```typescript
import { api } from '@/lib/api';
const fixtures = await api.listFixtures();
```

### 3. WebSocket Client (lib/ws.ts)
- `talon-backoffice/packages/app/lib/ws.ts` (188 lines)

**Features**:
- PhoenixWebSocketClient class with full implementation
- Automatic reconnection with exponential backoff
- Message type routing with handler registration
- Connection state tracking and monitoring
- Error handling and logging
- Singleton pattern

**Usage**:
```typescript
import { wsClient } from '@/lib/ws';
await wsClient.connect();
wsClient.on('fixture-update', (data) => console.log(data));
```

### 4. Next.js Middleware (middleware.ts)
- `talon-backoffice/packages/app/middleware.ts` (83 lines)
- `talon-backoffice/packages/office/middleware.ts` (54 lines)

**Player App**:
- Public routes: `/`, `/sports/*`, `/match/*`, `/live`, `/auth/*`
- Protected routes: All others redirect to login
- Token validation from cookies

**Backoffice App**:
- Strict mode: Only `/auth/*` routes are public
- All other routes require authentication
- Redirects to `/auth/login` if token missing

### 5. API Route Proxies (app/api/*/route.ts)

**Login Endpoint**:
- `talon-backoffice/packages/app/app/api/auth/login/route.ts`
- `talon-backoffice/packages/office/app/api/auth/login/route.ts`
- POST requests proxied to Go auth service
- Sets httpOnly auth token cookie
- Returns login response

**Fixtures Endpoint**:
- `talon-backoffice/packages/app/app/api/fixtures/route.ts`
- `talon-backoffice/packages/office/app/api/fixtures/route.ts`
- GET requests proxied to Go API gateway
- Includes auth token from cookies
- Enables server-side rendering

### 6. Next.js Configuration Updates
- `talon-backoffice/packages/app/next.config.js`
- `talon-backoffice/packages/office/next.config.js`

**Changes**:
- Added environment variable exposure (NEXT_PUBLIC_*)
- Added API rewrites for `/api/v1/*` and `/admin/*`
- Configured CORS-avoiding proxies to Go backend
- Maintained existing config (i18n, webpack, styles)

### 7. Docker Compose Infrastructure
- `docker-compose.yml` (at monorepo root)

**Services**:
- PostgreSQL 16 (port 5432) - Shared database
- Redis 7 (port 6379) - Shared cache
- API Gateway (port 18080) - Go service
- Auth Service (port 18081) - Go service

**Network**: All connected via phoenix_network
**Volumes**: Persistent data for PostgreSQL and Redis

### 8. Development Start Script
- `scripts/dev-start.sh` (executable)

**Functionality**:
1. Prerequisite checks (Docker, Node.js, yarn/npm)
2. Start Docker services with health checks
3. Run database migrations
4. Seed development data
5. Install dependencies for both apps
6. Start player app on port 3002
7. Start backoffice on port 3001
8. Display service summary

**Usage**:
```bash
./scripts/dev-start.sh
```

### 9. Documentation
- `INTEGRATION_GUIDE.md` - Comprehensive integration documentation
  - Architecture overview with diagram
  - File structure explanation
  - Configuration details
  - API client usage examples
  - WebSocket client usage
  - Authentication flow
  - SSR implementation
  - API rewrites
  - Docker services
  - Debugging guide
  - Troubleshooting
  - Production deployment

- `INTEGRATION_SETUP.md` - Setup completion summary
  - Files created list
  - Purpose of each file
  - How it all works together
  - Testing instructions
  - Deployment notes

- `INTEGRATION_COMPLETE.md` - This file

## Architecture

```
Player App (3002)  │  Backoffice (3001)
    ↓              │      ↓
 api.ts            │   api.ts
 ws.ts             │   middleware.ts
 middleware.ts     │   API routes
 API routes        │
    ↓              │      ↓
 Next.js rewrites (avoid CORS)
    ↓              │      ↓
────────────────────────────────
    API Gateway (18080)
    Auth Service (18081)
────────────────────────────────
    ↓              │      ↓
  PostgreSQL       │    Redis
```

## How to Start Development

### Quick Start (One Command)
```bash
cd /sessions/dreamy-bold-ptolemy/mnt/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined
./scripts/dev-start.sh
```

This will:
- Check prerequisites
- Start Docker services
- Run migrations
- Seed data
- Start both frontend apps
- Display all service URLs

### Manual Start

**Terminal 1: Docker services**
```bash
docker-compose up -d
```

**Terminal 2: Player app**
```bash
cd talon-backoffice/packages/app
yarn dev -p 3002
```

**Terminal 3: Backoffice app**
```bash
cd talon-backoffice/packages/office
yarn dev -p 3001
```

## Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Player App | http://localhost:3002 | Main sportsbook application |
| Backoffice | http://localhost:3001 | Admin interface |
| API Gateway | http://localhost:18080 | Main API service |
| Auth Service | http://localhost:18081 | Authentication service |
| PostgreSQL | localhost:5432 | Database |
| Redis | localhost:6379 | Cache |
| WebSocket | ws://localhost:18080/ws | Real-time updates |

## Testing the Integration

### 1. API Client
```typescript
// In browser console on either app
import { api } from '@/lib/api';
api.listSports().then(console.log);
```

### 2. Authentication
```typescript
// Login
await api.login({
  username: 'test@example.com',
  password: 'password'
});

// Check status
console.log(api.isAuthenticated());
```

### 3. WebSocket (Player App)
```typescript
// In browser console
import { wsClient } from '@/lib/ws';
console.log(wsClient.isConnected());
```

### 4. API Routes
```bash
# Test login proxy
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Test fixtures proxy
curl http://localhost:3002/api/fixtures
```

## Implementation Checklist

- [x] Environment configuration (.env.local)
- [x] API client singleton (lib/api.ts)
- [x] WebSocket client (lib/ws.ts)
- [x] Auth middleware
- [x] API route proxies
- [x] Next.js configuration updates
- [x] Docker Compose setup
- [x] Development start script
- [x] Comprehensive documentation

## Next Steps for Development

1. **Wire Components**: Use `api` singleton in components
   ```typescript
   import { api } from '@/lib/api';
   ```

2. **Implement Login Pages**: Use `api.login()` for authentication

3. **Add WebSocket Subscriptions**: Subscribe to real-time updates
   ```typescript
   wsClient.on('fixture-update', handleUpdate);
   ```

4. **Create Protected Routes**: Use middleware for access control

5. **Handle Errors**: Use try-catch with api methods

6. **Add Loading States**: Track request state in components

7. **Test Authentication**: Verify token refresh works

8. **Configure Production**: Update .env for production endpoints

9. **Deploy**: Build and deploy to production

10. **Monitor**: Set up error tracking and performance monitoring

## Key Features Implemented

### Type Safety
- Full TypeScript support
- Typed API responses
- Typed WebSocket messages

### Auto Retry
- Automatic token refresh on 401
- Retry logic with exponential backoff
- Concurrent request deduplication

### Security
- httpOnly cookies for tokens
- CORS-avoiding proxies
- Token validation on protected routes
- Secure cookie settings in production

### Developer Experience
- Singleton patterns for easy access
- Reset functions for testing
- Comprehensive error handling
- Detailed logging and debugging

### Real-time Updates
- WebSocket connection management
- Message type routing
- Automatic reconnection
- Connection state tracking

### SSR Support
- API routes for server components
- Token-aware proxies
- Seamless server-client transitions

## File Locations Reference

### Player App Files
```
talon-backoffice/packages/app/
├── .env.local
├── middleware.ts
├── next.config.js (updated)
├── lib/
│   ├── api.ts
│   └── ws.ts
└── app/api/
    ├── auth/login/route.ts
    └── fixtures/route.ts
```

### Backoffice App Files
```
talon-backoffice/packages/office/
├── .env.local
├── middleware.ts
├── next.config.js (updated)
├── lib/
│   └── api.ts
└── app/api/
    ├── auth/login/route.ts
    └── fixtures/route.ts
```

### Root Level Files
```
/
├── docker-compose.yml
├── scripts/dev-start.sh
├── INTEGRATION_GUIDE.md
├── INTEGRATION_SETUP.md
└── INTEGRATION_COMPLETE.md
```

## Documentation Files

| File | Location | Purpose |
|------|----------|---------|
| INTEGRATION_GUIDE.md | Root | Complete integration guide with examples |
| INTEGRATION_SETUP.md | Root | Setup summary and implementation details |
| INTEGRATION_COMPLETE.md | Root | This file - completion status |

## Environment Variables

All apps read these from `.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:18080      # API Gateway URL
NEXT_PUBLIC_AUTH_URL=http://localhost:18081     # Auth Service URL
NEXT_PUBLIC_WS_URL=ws://localhost:18080/ws      # WebSocket URL
```

For production, change these to:
```bash
NEXT_PUBLIC_API_URL=https://api.production.com
NEXT_PUBLIC_AUTH_URL=https://auth.production.com
NEXT_PUBLIC_WS_URL=wss://api.production.com/ws
```

## Support

For detailed information:
- **Integration Guide**: See `INTEGRATION_GUIDE.md`
- **Setup Details**: See `INTEGRATION_SETUP.md`
- **API Client**: See `talon-backoffice/packages/api-client/README.md`

## Status

✅ **ALL INTEGRATION FILES CREATED AND CONFIGURED**

The frontend applications are now fully wired to the Go backend with:
- Complete API client integration
- Real-time WebSocket support
- Authentication and middleware
- Server-side rendering support
- Development infrastructure
- Comprehensive documentation

Ready to start developing and testing the integration!
