# Go API Client Layer — Slice 1: Auth + Wallet

**Date:** 2026-03-10
**Scope:** Replace legacy `useApi`/`useApiHook` with React Query + typed Axios clients for auth, user, and wallet domains.
**Frontend:** `phoenix-frontend-brand-viegg/packages/app-core`

---

## Problem

The frontend uses a custom `useApiHook` (from `@phoenix-ui/utils`) that:
- Hardcodes token refresh to old Scala `token/refresh` endpoint
- Bakes endpoint paths into components as string literals
- Has no type safety on request/response shapes
- Couples auth state management with data fetching

The Go backend exposes a different contract (paths, payloads, error shapes). We need a clean break.

## Solution

New `services/go-api/` directory with:
1. A shared Axios client with interceptors (auth, refresh, error transform)
2. Domain-split client modules (plain async functions)
3. React Query hooks wrapping those clients
4. Typed request/response interfaces matching Go contracts

## Architecture

```
packages/app-core/services/go-api/
├── client.ts              ← Shared Axios instance + interceptors
├── errors.ts              ← Go error shape transform
├── types.ts               ← Shared types (pagination, error)
├── auth/
│   ├── auth-client.ts     ← login(), refresh(), logout(), register()
│   ├── auth-hooks.ts      ← useLogin(), useRegister(), useLogout()
│   └── auth-types.ts      ← Request/response types
├── user/
│   ├── user-client.ts     ← getProfile(), updateProfile()
│   ├── user-hooks.ts      ← useProfile(), useUpdateProfile()
│   └── user-types.ts
├── wallet/
│   ├── wallet-client.ts   ← getBalance(), deposit(), withdraw(), getTransactions()
│   ├── wallet-hooks.ts    ← useBalance(), useDeposit(), useWithdraw(), useTransactions()
│   └── wallet-types.ts
└── index.ts               ← Re-exports all hooks and types
```

## Shared Client (`client.ts`)

```typescript
// Axios instance
const goApi = axios.create({
  baseURL: getGoGatewayUrl(), // reads from env/runtime config
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Bearer token
goApi.interceptors.request.use((config) => {
  const token = getTokenFromStorage();
  if (token && !isAuthRoute(config.url)) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: 401 → try refresh → retry or logout
goApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !isAuthRoute(error.config.url)) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) return goApi(error.config); // retry
      clearAuthAndRedirect();
    }
    throw transformGoError(error);
  }
);
```

Key decisions:
- `getGoGatewayUrl()` reads `GO_GATEWAY_ENDPOINT` from Next.js runtime config, falls back to `API_GLOBAL_ENDPOINT`
- Token read/write uses existing `useToken()` localStorage store — no rewrite needed
- Refresh is non-hook: reads/writes localStorage directly in interceptor (Axios interceptors can't use hooks)

## Error Transform (`errors.ts`)

```typescript
// Go error shape
interface GoErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; reason: string }>;
    request_id?: string;
    timestamp?: string;
  };
}

// Transformed to match what existing components expect
interface AppError {
  payload: {
    errors: Array<{ errorCode: string; details: string }>;
  };
}

function transformGoError(axiosError: AxiosError<GoErrorResponse>): AppError {
  const goError = axiosError.response?.data?.error;
  return {
    payload: {
      errors: goError
        ? [{ errorCode: goError.code, details: goError.message }]
        : [{ errorCode: 'UNKNOWN_ERROR', details: 'An unexpected error occurred' }],
    },
  };
}
```

This preserves compatibility with existing `ErrorComponent` and `CoreAlert` usage.

## Auth Domain

### Types (`auth-types.ts`)

```typescript
interface GoLoginRequest {
  username: string;
  password: string;
  device_id?: string;
}

interface GoLoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user_id: string;
  token_type: string;
}

interface GoRefreshRequest {
  refresh_token: string;
}

interface GoRefreshResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface GoRegisterRequest {
  email: string;
  username: string;
  password: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  country: string;
}

interface GoRegisterResponse {
  user_id: string;
  email: string;
  username: string;
  created_at: string;
  status: string;
}
```

### Client (`auth-client.ts`)

```typescript
async function login(req: GoLoginRequest): Promise<GoLoginResponse> {
  const { data } = await goApi.post('/auth/login', req);
  return data;
}

async function refresh(refreshToken: string): Promise<GoRefreshResponse> {
  const { data } = await goApi.post('/auth/refresh', { refresh_token: refreshToken });
  return data;
}

async function logout(): Promise<void> {
  await goApi.post('/auth/logout');
}

async function register(req: GoRegisterRequest): Promise<GoRegisterResponse> {
  const { data } = await goApi.post('/api/v1/users', req);
  return data;
}
```

### Hooks (`auth-hooks.ts`)

```typescript
function useLogin() {
  const dispatch = useDispatch();
  const { saveToken, saveTokenExpDate, saveUserId } = useToken();

  return useMutation({
    mutationFn: (req: GoLoginRequest) => login(req),
    onSuccess: (data) => {
      const now = Date.now();
      saveToken(data.access_token, data.refresh_token);
      saveTokenExpDate(now + data.expires_in * 1000);
      saveUserId(data.user_id);
      dispatch(logIn());
    },
  });
}

function useLogout() {
  const dispatch = useDispatch();
  const { clearToken, clearRefreshToken, clearTokenExpDate, clearRefreshTokenExpDate, clearUserId } = useToken();

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      clearToken();
      clearRefreshToken();
      clearTokenExpDate();
      clearRefreshTokenExpDate();
      clearUserId();
      dispatch(logOut());
    },
  });
}

function useRegister() {
  return useMutation({
    mutationFn: (req: GoRegisterRequest) => register(req),
  });
}
```

## User Domain

### Types (`user-types.ts`)

```typescript
interface GoUserProfile {
  user_id: string;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  status: string;
  kyc_status: string;
  roles: string[];
  created_at: string;
  updated_at: string;
}

interface GoUpdateProfileRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
}
```

### Hooks (`user-hooks.ts`)

```typescript
function useProfile() {
  const { getUserId } = useToken();
  const userId = getUserId();

  return useQuery({
    queryKey: ['user', 'profile', userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { getUserId } = useToken();

  return useMutation({
    mutationFn: (req: GoUpdateProfileRequest) => updateProfile(getUserId()!, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
    },
  });
}
```

## Wallet Domain

### Types (`wallet-types.ts`)

```typescript
interface GoWallet {
  user_id: string;
  balance: number;
  currency: string;
  reserved: number;
  available: number;
  last_updated: string;
}

interface GoDepositRequest {
  amount: number;
  payment_method: string;
  payment_token: string;
  currency: string;
}

interface GoDepositResponse {
  deposit_id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface GoWithdrawRequest {
  amount: number;
  bank_account_id: string;
  currency: string;
}

interface GoWithdrawResponse {
  withdrawal_id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
}

interface GoTransaction {
  transaction_id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  timestamp: string;
}

interface GoPaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
```

### Hooks (`wallet-hooks.ts`)

```typescript
function useBalance() {
  const { getUserId } = useToken();
  const userId = getUserId();

  return useQuery({
    queryKey: ['wallet', 'balance', userId],
    queryFn: () => getBalance(userId!),
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

function useDeposit() {
  const queryClient = useQueryClient();
  const { getUserId } = useToken();

  return useMutation({
    mutationFn: (req: GoDepositRequest) => deposit(getUserId()!, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

function useWithdraw() {
  const queryClient = useQueryClient();
  const { getUserId } = useToken();

  return useMutation({
    mutationFn: (req: GoWithdrawRequest) => withdraw(getUserId()!, req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

function useTransactions(page = 1, limit = 20) {
  const { getUserId } = useToken();
  const userId = getUserId();

  return useQuery({
    queryKey: ['wallet', 'transactions', userId, page, limit],
    queryFn: () => getTransactions(userId!, page, limit),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}
```

## QueryClient Setup

Add `QueryClientProvider` in the app's top-level layout. Since this is Next.js 11 with `_app.tsx`:

```typescript
// packages/app/pages/_app.tsx — add wrapper
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Wrap existing providers:
<QueryClientProvider client={queryClient}>
  <Provider store={store}>
    {/* existing app tree */}
  </Provider>
</QueryClientProvider>
```

## Component Rewiring — LoginComponent

The login component (`app-core/components/auth/login/index.tsx`) currently uses:
- `useApi("login", "POST")` → `useLogin()`
- `useApi("login-with-verification", "POST")` → feature-flagged off (Go backend lacks MFA)

Key changes:
1. Replace `useLogin.triggerApi({...})` with `loginMutation.mutate({...})`
2. Replace `useLogin.data` / `useLogin.error` / `useLogin.isLoading` with mutation state
3. Remove MFA flow (feature-flag: `GO_MFA_ENABLED=false`)
4. Remove `lastSignIn` modal (not in Go response)
5. Remove `hasToAcceptTerms` check (not in Go response)
6. Keep JWT decode for admin role blocking

## Component Rewiring — Cashier

Replace:
- `useApi("payments/deposit", "POST")` → `useDeposit()`
- `useApi("payments/cheque-withdrawal", "POST")` → `useWithdraw()` (type field TBD with backend)
- `useApi("payments/cash-withdrawal", "POST")` → `useWithdraw()`

## Dependencies to Add

```json
{
  "@tanstack/react-query": "^5.x",
  "axios": "^1.x"
}
```

Add to `packages/app-core/package.json` (or `packages/app/package.json` depending on where the QueryClientProvider lives). Remove `use-http` dependency once all components are migrated off `useApiHook`.

## Environment Config

Add to `.env.*` files:
```
GO_GATEWAY_ENDPOINT=http://localhost:8080
```

`resolveFeatureApiBaseUrl()` in `api-service.ts` stays untouched — old components still use it. New components use `goApi` instance which reads `GO_GATEWAY_ENDPOINT`.

## What is NOT in scope

- MFA login/verification (blocked on backend B3)
- Password change/forgot (blocked on backend B3)
- Session timer (blocked on backend B3)
- Account deletion (blocked on backend B3)
- Terms acceptance (blocked on backend B3)
- Sportsbook, betting, prediction, websocket (future slices)
- Removing old `useApiHook` — happens after all components migrate
- Tests against live Go backend — Codex owns backend testing

## Migration Strategy

Coexistence: old `useApi()` and new React Query hooks live side by side. Components are rewired one at a time. The old API layer is not deleted until all consumers are migrated (after all slices complete).

## Success Criteria

1. `LoginComponent` authenticates against Go `POST /auth/login`
2. Token refresh works via Go `POST /auth/refresh`
3. Profile loads from Go `GET /api/v1/users/{user_id}`
4. Registration works via Go `POST /api/v1/users`
5. Wallet balance loads from Go `GET /api/v1/wallets/{user_id}`
6. Deposit works via Go `POST /api/v1/wallets/{user_id}/deposits`
7. Withdrawal works via Go `POST /api/v1/wallets/{user_id}/withdrawals`
8. Transaction history loads from Go `GET /api/v1/wallets/{user_id}/transactions`
9. Old `useApi` still works for non-migrated components
10. No MFA-related crashes (feature-flagged off cleanly)
