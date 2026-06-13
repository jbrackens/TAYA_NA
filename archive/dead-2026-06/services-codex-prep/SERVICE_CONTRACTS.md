# Phoenix Microservices REST API Contracts

**Document Version:** 1.1
**Last Updated:** 2026-03-16
**Purpose:** Define canonical REST API contracts between the implemented Phoenix Go services and the investor-demo runtime

---

## Table of Contents
1. [Service Overview](#service-overview)
2. [Global Standards](#global-standards)
3. [Service Contracts](#service-contracts)
4. [Inter-Service Call Graph](#inter-service-call-graph)
5. [Authentication & Authorization](#authentication--authorization)
6. [Error Handling](#error-handling)

---

## Service Overview

| Service | Port | Primary Responsibility | Tech Stack |
|---------|------|----------------------|-----------|
| phoenix-gateway | 8080 | API gateway, routing, rate limiting | Go + Chi |
| phoenix-user | 8001 | User CRUD, auth, KYC, roles | Go + PostgreSQL |
| phoenix-wallet | 8002 | Balance, deposits, withdrawals, rewards | Go + PostgreSQL |
| phoenix-market-engine | 8003 | Markets, odds, lifecycle management | Go + PostgreSQL |
| phoenix-betting-engine | 8004 | Bets, validation, cashout, parlays | Go + PostgreSQL |
| phoenix-events | 8005 | External data, sports, live scores | Go + PostgreSQL |
| phoenix-retention | 8006 | Achievements, leaderboards, gamification | Go + Redis + PostgreSQL |
| phoenix-social | 8007 | Profiles, following, feeds, chat | Go + PostgreSQL |
| phoenix-compliance | 8008 | Responsible gaming, self-exclusion, AML | Go + PostgreSQL |
| phoenix-analytics | 8009 | Event tracking, dashboards, reporting | Go + ClickHouse |
| phoenix-settlement | 8010 | Batch settlement, payout calculations | Go + PostgreSQL |
| phoenix-notification | 8011 | Email, push, SMS dispatch, templates | Go + PostgreSQL |
| phoenix-cms | 8012 | Content management, promotions, pages | Go (Strapi replacement) |
| stella-engagement | 8013 | Real-time engagement engine | Go + Kafka + Redis |
| phoenix-prediction | 8014 | Prediction markets, orders, lifecycle, admin oversight | Go + PostgreSQL |
| phoenix-audit | 8015 | Admin audit-log query surface, CSV export, and audit emission | Go + PostgreSQL |
| phoenix-support-notes | 8016 | Operator notes and unified user timeline | Go + PostgreSQL |
| phoenix-config | 8017 | Terms/config admin surface and public config reads | Go + PostgreSQL |
| phoenix-realtime | 8018 | Dedicated websocket fan-out for investor-demo core sportsbook domains | Go + Kafka + WebSocket |

---

## Global Standards

### Base URL Format
All services follow this pattern:
```
http://{service-name}:{port}/api/{version}/
```

### Standard HTTP Status Codes
- `200 OK` - Successful request
- `201 Created` - Resource created
- `202 Accepted` - Async operation accepted
- `204 No Content` - Successful with no response body
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Missing/invalid auth
- `403 Forbidden` - Valid auth but insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - State conflict (duplicate, concurrent modification)
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limited
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Maintenance/overload

### Standard Request/Response Headers
```
Content-Type: application/json
X-Request-ID: {UUID}
X-Correlation-ID: {UUID}
Authorization: Bearer {JWT_TOKEN}
X-API-Version: 1
```

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": [
      { "field": "stake", "reason": "must be greater than 0" }
    ],
    "request_id": "{UUID}",
    "timestamp": "2026-03-07T14:30:00Z"
  }
}
```

### Pagination Standard
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

## Service Contracts

---

### 1. Phoenix Gateway (port 8080)

**Role:** API gateway serving as single entry point for all clients. Routes requests to appropriate microservices, enforces rate limiting, validates JWT tokens.

#### POST /auth/login
**Auth:** None
**Rate Limit:** 5 requests/minute per IP
**Request:**
```json
{
  "username": "string",
  "password": "string",
  "device_id": "string (optional)"
}
```
**Response:**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "expires_in": 3600,
  "user_id": "string",
  "token_type": "Bearer"
}
```
**Calls:** phoenix-user (validate credentials)
**Events:** phoenix.user.authenticated

#### POST /auth/refresh
**Auth:** Bearer JWT
**Request:**
```json
{
  "refresh_token": "string"
}
```
**Response:**
```json
{
  "access_token": "string",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```
**Calls:** phoenix-user (verify refresh token)

#### POST /auth/logout
**Auth:** Bearer JWT
**Response:** `204 No Content`
**Calls:** phoenix-user (invalidate tokens)

#### GET /health
**Auth:** None
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-07T14:30:00Z",
  "services": {
    "phoenix-user": "up",
    "phoenix-wallet": "up",
    "phoenix-market-engine": "up"
  }
}
```

#### GET /api/v1/ws/web-socket
**Auth:** Channel-dependent
**Transport:** WebSocket
**Purpose:** Sportsbook compatibility stream for frontend subscriptions

**Subscribe message:**
```json
{
  "event": "subscribe",
  "channel": "market^mrk_123",
  "correlationId": "abc-123",
  "token": "raw-jwt-for-authenticated-channels"
}
```

**Supported channels:**
- `market^{marketID}` (public)
- `fixture^{gameID}^{fixtureID}` (public)
- `bets` (requires token)
- `wallets` (requires token)

**Success response:**
```json
{
  "event": "subscribe:success",
  "channel": "market^mrk_123",
  "correlationId": "abc-123"
}
```

**Update response:**
```json
{
  "event": "update",
  "channel": "market^mrk_123",
  "data": {
    "marketId": "mrk_123"
  }
}
```

**Notes:**
- `bets` and `wallets` validate the JWT passed in the subscribe payload
- investor-demo runtime can now proxy this contract to `phoenix-realtime` via `WEBSOCKET_REALTIME_PROXY_ENABLED`

#### Admin wallet review routes

- `GET /admin/users/{userID}/transactions` -> `phoenix-wallet`
- `GET /admin/punters/{userID}/transactions` -> `phoenix-wallet`
- `PUT /admin/users/{userID}/limits/deposit` -> `phoenix-compliance`
- `PUT /admin/punters/{userID}/limits/deposit` -> `phoenix-compliance`
- `PUT /admin/users/{userID}/limits/stake` -> `phoenix-compliance`
- `PUT /admin/punters/{userID}/limits/stake` -> `phoenix-compliance`
- `PUT /admin/users/{userID}/limits/session` -> `phoenix-compliance`
- `PUT /admin/punters/{userID}/limits/session` -> `phoenix-compliance`
- `GET /admin/users/{userID}/limits-history` -> `phoenix-compliance`
- `GET /admin/punters/{userID}/limits-history` -> `phoenix-compliance`
- `GET /admin/users/{userID}/cool-offs-history` -> `phoenix-compliance`
- `GET /admin/punters/{userID}/cool-offs-history` -> `phoenix-compliance`
- `PUT /admin/users/{userID}/lifecycle/cool-off` -> `phoenix-compliance`
- `PUT /admin/punters/{userID}/lifecycle/cool-off` -> `phoenix-compliance`
- `GET /admin/users/{userID}/financial-summary` -> `phoenix-wallet`
- `GET /admin/punters/{userID}/financial-summary` -> `phoenix-wallet`
- `POST /admin/users/{userID}/funds/credit` -> `phoenix-wallet`
- `POST /admin/punters/{userID}/funds/credit` -> `phoenix-wallet`
- `POST /admin/users/{userID}/funds/debit` -> `phoenix-wallet`
- `POST /admin/punters/{userID}/funds/debit` -> `phoenix-wallet`

**Notes:** The admin deposit/stake/session limit aliases accept both Talon's `{daily, weekly, monthly}` body and legacy `{daily_limit, weekly_limit, monthly_limit}` payloads. Deposit, stake, and session fan those writes into the real enum-backed compliance keys `daily_deposit`, `weekly_deposit`, `monthly_deposit`, `daily_stake`, `weekly_stake`, `monthly_stake`, `daily_session`, `weekly_session`, and `monthly_session`. Session utilization is computed from overlapping `user_sessions` duration in hours within the active period window.
- `POST /admin/users/{userID}/lifecycle/{action}` -> `phoenix-user`
- `POST /admin/punters/{userID}/lifecycle/{action}` -> `phoenix-user`
- `GET /admin/users/{userID}/session-history` -> `phoenix-user`
- `GET /admin/punters/{userID}/session-history` -> `phoenix-user`
- `GET /admin/users/{userID}/bets` -> `phoenix-betting-engine`
- `GET /admin/punters/{userID}/bets` -> `phoenix-betting-engine`
- `POST /admin/bets/{betID}/cancel` -> `phoenix-betting-engine`
- `POST /admin/bets/{betID}/lifecycle/{action}` -> `phoenix-betting-engine`
- the legacy polling-backed gateway compatibility stream remains as a temporary fallback while realtime rehearsal coverage is completed

#### GET /api/v1/metrics
**Auth:** Bearer JWT (role: admin)
**Response:**
```json
{
  "gateway_metrics": {
    "requests_per_second": 1250,
    "avg_response_time_ms": 45,
    "error_rate": 0.02,
    "active_connections": 5000,
    "rate_limit_exceeded_count": 23
  }
}
```

#### GET /api/v1/config
**Auth:** Bearer JWT (role: admin)
**Response:**
```json
{
  "features": {
    "parlays_enabled": true,
    "live_betting_enabled": true,
    "cashout_enabled": true
  },
  "limits": {
    "max_bet_amount": 10000,
    "min_bet_amount": 1,
    "max_parlay_legs": 12
  }
}
```

---

### 2. Phoenix User (port 8001)

**Role:** User account management, authentication, OIDC integration, KYC verification, role-based access control.

#### POST /api/v1/users
**Auth:** None (public registration)
**Rate Limit:** 10 requests/hour per IP
**Request:**
```json
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "secure_password",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1990-01-15",
  "country": "US"
}
```
**Response (201):**
```json
{
  "user_id": "usr_123456",
  "email": "user@example.com",
  "username": "john_doe",
  "created_at": "2026-03-07T14:30:00Z",
  "status": "pending_verification"
}
```
**Calls:** phoenix-notification (send verification email), phoenix-analytics (track signup)
**Events:** phoenix.user.registered

#### GET /api/v1/users/{user_id}
**Auth:** Bearer JWT
**Response:**
```json
{
  "user_id": "usr_123456",
  "email": "user@example.com",
  "username": "john_doe",
  "first_name": "John",
  "last_name": "Doe",
  "status": "verified",
  "kyc_status": "approved",
  "roles": ["player", "affiliate"],
  "created_at": "2026-03-07T14:30:00Z",
  "updated_at": "2026-03-07T14:30:00Z"
}
```

#### PUT /api/v1/users/{user_id}
**Auth:** Bearer JWT (own user or role: admin)
**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890"
}
```
**Response:**
```json
{
  "user_id": "usr_123456",
  "updated_at": "2026-03-07T14:30:00Z"
}
```
**Events:** phoenix.user.updated

#### PUT /profile/email
**Auth:** Bearer JWT
**Request:**
```json
{
  "email": "new-email@example.com"
}
```
**Response:**
```json
{
  "user_id": "usr_123456",
  "updated_at": "2026-03-07T14:30:00Z"
}
```
**Notes:** Legacy-compatible alias for direct player email updates. Also accepts `email` on `PUT /api/v1/users/{user_id}`.

#### POST /api/v1/auth/verify-email
**Auth:** None
**Request:**
```json
{
  "email": "user@example.com",
  "verification_code": "123456"
}
```
**Response:**
```json
{
  "user_id": "usr_123456",
  "status": "verified",
  "verified_at": "2026-03-07T14:30:00Z"
}
```
**Calls:** phoenix-notification (send confirmation), phoenix-compliance (record verification)
**Events:** phoenix.user.verified

#### POST /api/v1/auth/kyc
**Auth:** Bearer JWT
**Request:**
```json
{
  "document_type": "passport",
  "document_number": "AB123456",
  "issue_country": "US",
  "expiry_date": "2030-01-01"
}
```
**Response (202):**
```json
{
  "user_id": "usr_123456",
  "kyc_status": "pending_review",
  "submission_id": "kyc_sub_789"
}
```
**Calls:** phoenix-compliance (verify identity), phoenix-analytics (track KYC)
**Events:** phoenix.user.kyc_submitted

#### POST /api/v1/registration/answer-kba-questions
**Auth:** Optional bearer JWT (falls back to `punterId` in compatibility mode)
**Request:**
```json
{
  "punterId": "usr_123456",
  "answers": [
    { "questionId": "0", "answer": "36101" },
    { "questionId": "1", "answer": "NEWPORT NEWS CITY" },
    { "questionId": "2", "answer": "GLADSTONE" }
  ]
}
```
**Response (question issue):**
```json
{
  "punterId": "usr_123456",
  "type": "KBA_QUESTIONS",
  "questions": [
    { "questionId": "0", "text": "In which zip code have you previously lived?", "choices": ["36101", "33971", "35425", "None of the above"] }
  ]
}
```
**Response (approved):**
```json
{
  "message": "user validated"
}
```
**Notes:** Stores provider-backed KBA compatibility session state in `user_verification_sessions`, including provider name and provider reference. The current adapter seam defaults to IdComply-style behavior; remaining gap is full third-party provider depth, not missing session persistence.

#### POST /api/v1/registration/start-idpv
**Auth:** Bearer JWT
**Request:**
```json
{
  "punterId": "usr_123456"
}
```
**Response:**
```json
{
  "idpvRedirectUrl": "/account?verification=idpv&sessionId=ver_123456",
  "sessionId": "ver_123456"
}
```
**Notes:** Persists an IDPV compatibility session with provider name/reference and marks KYC as pending. The current adapter seam defaults to IdComply-style redirect/orchestration; remaining gap is full third-party provider depth.

#### POST /api/v1/registration/check-idpv-status
**Auth:** Optional bearer JWT (falls back to `punterId` in compatibility mode)
**Request:**
```json
{
  "punterId": "usr_123456"
}
```
**Response (approved):**
```json
{
  "message": "user validated",
  "status": "approved",
  "sessionId": "ver_123456",
  "provider": "idcomply"
}
```
**Error (pending):** `400` with `photoVerificationNotCompleted`
**Notes:** Uses the latest persisted IDPV session for the user and preserves provider references. Provider-originated status transitions can now also be inspected and updated through the admin verification-session surface. Remaining gap is full third-party provider status depth.

#### GET /admin/users/{user_id}/verification-sessions
**Auth:** Bearer JWT (roles: admin, operator, trader)
**Response:**
```json
{
  "data": [
    {
      "id": "ver_123456",
      "userId": "usr_123456",
      "flowType": "idpv",
      "provider": "idcomply",
      "status": "pending_review",
      "providerDecision": "pending_review",
      "providerCaseId": "idcomply:idpv:ver_123456",
      "providerReference": "idcomply:idpv:ver_123456",
      "createdAt": "2026-03-12T10:30:00Z",
      "updatedAt": "2026-03-12T10:35:00Z"
    }
  ]
}
```

#### GET /admin/users/verification-sessions/{session_id}
**Auth:** Bearer JWT (roles: admin, operator, trader)
**Response:**
```json
{
  "id": "ver_123456",
  "userId": "usr_123456",
  "flowType": "idpv",
  "provider": "idcomply",
  "status": "pending_review",
  "providerDecision": "pending_review",
  "providerCaseId": "idcomply:idpv:ver_123456",
  "providerReference": "idcomply:idpv:ver_123456",
  "redirectUrl": "https://provider.example/verify/ver_123456",
  "createdAt": "2026-03-12T10:30:00Z",
  "updatedAt": "2026-03-12T10:35:00Z"
}
```
**Notes:** Direct admin/operator detail read for a single verification session. This complements the list and provider-event history endpoints so review tooling does not need to scan a user-level list to inspect one session.

#### GET /admin/providers/idcomply/verification-sessions/by-reference/{provider_reference}
**Auth:** Bearer JWT (roles: admin, operator, trader)
**Response:** same as `GET /admin/users/verification-sessions/{session_id}`
**Notes:** Direct admin/operator/provider-reference lookup for a single verification session. This is the operational bridge used when support or provider callbacks only have the external provider reference instead of the internal session ID.

#### GET /admin/providers/idcomply/verification-sessions/by-case/{provider_case_id}
**Auth:** Bearer JWT (roles: admin, operator, trader)
**Response:** same as `GET /admin/users/verification-sessions/{session_id}`
**Notes:** Direct admin/operator/provider-case lookup for a single verification session. This is the operational bridge used when the external provider exposes a case identifier rather than the stored provider reference or internal session ID.

#### GET /admin/providers/idcomply/verification-sessions/review-queue
**Auth:** Bearer JWT (roles: admin, operator, trader)
**Query Parameters:** `provider`, `assigned_to`, `flow_type`, `status`
**Response:**
```json
{
  "data": [
    {
      "id": "ver_123456",
      "userId": "usr_123456",
      "flowType": "idpv",
      "provider": "idcomply",
      "status": "pending_review",
      "providerDecision": "manual_review",
      "providerCaseId": "idcomply:idpv:case_123",
      "providerReference": "idcomply:idpv:ver_123456",
      "assignedTo": "ops.user.42",
      "assignedAt": "2026-03-12T10:45:00Z",
      "createdAt": "2026-03-12T10:30:00Z",
      "updatedAt": "2026-03-12T10:45:00Z"
    }
  ]
}
```
**Notes:** Review-queue read for verification operators. `assigned_to=unassigned` returns only unowned review items. `flow_type` and `status` allow the queue to be segmented without pushing filtering logic into Talon.

#### GET /admin/providers/idcomply/verification-sessions/review-queue/export
**Auth:** Bearer JWT (roles: admin, operator, trader)
**Query Parameters:** `provider`, `assigned_to`, `flow_type`, `status`
**Response:** CSV
**Notes:** Exports the current filtered review queue for handoff, manual review packs, and ops audit trails.

#### GET /admin/users/verification-sessions/{session_id}/events
**Auth:** Bearer JWT (roles: admin, operator, trader)
**Response:**
```json
{
  "data": [
    {
      "id": "evt_123456",
      "verificationSessionId": "ver_123456",
      "provider": "idcomply",
      "status": "pending_review",
      "source": "provider_start",
      "reason": "pending_review",
      "createdAt": "2026-03-12T10:30:00Z"
    }
  ]
}
```

#### POST /admin/users/verification-sessions/{session_id}/assign
**Auth:** Bearer JWT (roles: admin, operator, trader)
**Request:**
```json
{
  "assignedTo": "ops.user.42",
  "reason": "manual review queue ownership"
}
```
**Response:** updated `VerificationSession`
**Notes:** Sets or reassigns operator ownership on a verification review item and records the assignment timestamp.

#### POST /admin/users/verification-sessions/{session_id}/notes
**Auth:** Bearer JWT (roles: admin, operator, trader)
**Request:**
```json
{
  "note": "Escalated after provider returned manual_review twice."
}
```
**Response:**
```json
{
  "sessionId": "ver_123456",
  "note": "Escalated after provider returned manual_review twice.",
  "createdAt": "2026-03-12T10:50:00Z"
}
```
**Notes:** Adds an operator note directly to the verification session workflow without forcing a separate support-note timeline entry.

#### POST /admin/users/verification-sessions/{session_id}/decision
**Auth:** Bearer JWT (roles: admin, operator, trader)
**Request:**
```json
{
  "decision": "approved",
  "reason": "manual review completed",
  "payload": {
    "reviewStage": "manual"
  }
}
```
**Response:** updated `VerificationSession`
**Notes:** Human review route for Talon/operator workflows. This reuses the existing verification decision normalization (`approved`, `rejected`, `questions`, `manual_review`) without granting access to provider-only callback/status endpoints.

#### POST /admin/providers/idcomply/verification-sessions/{session_id}/status
**Auth:** Bearer JWT (roles: admin, internal)
**Request:**
```json
{
  "status": "approved",
  "lastErrorCode": "",
  "reason": "manual_provider_confirmation"
}
```
**Response:** updated `VerificationSession`
**Notes:** Request bodies may now also carry `providerReference`, `redirectUrl`, `questions`, and arbitrary provider `payload` fields so IdComply-style callbacks can persist richer KBA/IDPV state rather than only a terminal status flip. Provider callback statuses are normalized before persistence, so external values such as `completed`, `verified`, `manual_review`, `in_progress`, and `questionnaire` map into the stable internal verification lifecycle.

#### POST /admin/providers/idcomply/verification-sessions/status
**Auth:** Bearer JWT (roles: admin, internal, data-provider)
**Request:**
```json
{
  "providerReference": "idcomply:idpv:ver_123456",
  "status": "questions_presented",
  "redirectUrl": "https://provider.example/verify/ver_123456",
  "questions": [
    {
      "questionId": "kba-1",
      "text": "Which city is associated with your address?",
      "choices": ["Austin", "Tampa", "Chicago"]
    }
  ],
  "payload": {
    "providerDecision": "review"
  }
}
```
**Response:** updated `VerificationSession`
**Notes:** Provider-reference callback path for IdComply-style integrations. Persists redirect state, provider-supplied questions, and callback payload into the verification session and provider event history.

#### POST /providers/idcomply/verification-sessions/by-case/{provider_case_id}/status
**Auth:** HTTP Basic
**Request:** same as `POST /admin/providers/idcomply/verification-sessions/{session_id}/status`
**Response:** updated `VerificationSession`
**Notes:** Provider-authenticated callback path keyed by external provider case ID instead of the internal session ID or provider reference. This is the production-oriented webhook path when the provider only calls back with a case identifier.

#### GET /api/v1/users/{user_id}/roles
**Auth:** Bearer JWT (role: admin)
**Response:**
```json
{
  "user_id": "usr_123456",
  "roles": [
    {
      "name": "player",
      "permissions": ["place_bets", "view_markets", "manage_wallet"]
    },
    {
      "name": "affiliate",
      "permissions": ["view_referrals", "claim_rewards"]
    }
  ]
}
```

#### POST /api/v1/users/{user_id}/roles
**Auth:** Bearer JWT (role: admin)
**Request:**
```json
{
  "role_name": "affiliate"
}
```
**Response (201):**
```json
{
  "user_id": "usr_123456",
  "role": "affiliate",
  "assigned_at": "2026-03-07T14:30:00Z"
}
```
**Events:** phoenix.user.role_assigned

#### GET /api/v1/users/{user_id}/permissions
**Auth:** Bearer JWT
**Response:**
```json
{
  "user_id": "usr_123456",
  "permissions": [
    "place_bets",
    "view_markets",
    "manage_wallet",
    "view_social",
    "view_referrals"
  ]
}
```

---

### 3. Phoenix Wallet (port 8002)

**Role:** Wallet balance management, deposits, withdrawals, transaction history, referral reward distribution.

#### GET /api/v1/wallets/{user_id}
**Auth:** Bearer JWT (own wallet or role: admin)
**Response:**
```json
{
  "user_id": "usr_123456",
  "balance": 5250.50,
  "currency": "USD",
  "reserved": 150.00,
  "available": 5100.50,
  "last_updated": "2026-03-07T14:30:00Z"
}
```

#### POST /api/v1/wallets/{user_id}/deposits
**Auth:** Bearer JWT
**Request:**
```json
{
  "amount": 100.00,
  "payment_method": "credit_card",
  "payment_token": "pm_tok_xyz",
  "currency": "USD"
}
```
**Response (202):**
```json
{
  "deposit_id": "dep_123456",
  "user_id": "usr_123456",
  "amount": 100.00,
  "status": "processing",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Calls:** Payment processor API, phoenix-compliance (check limits), phoenix-analytics (track deposit)
**Events:** phoenix.wallet.transactions, phoenix.wallet.balance-updated

#### POST /api/v1/wallets/{user_id}/withdrawals
**Auth:** Bearer JWT
**Request:**
```json
{
  "amount": 50.00,
  "bank_account_id": "ba_789",
  "currency": "USD"
}
```
**Response (202):**
```json
{
  "withdrawal_id": "wth_123456",
  "user_id": "usr_123456",
  "amount": 50.00,
  "status": "pending_approval",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Calls:** phoenix-compliance (verify withdrawals), phoenix-analytics (track withdrawal)
**Events:** phoenix.wallet.transactions, phoenix.wallet.balance-updated

#### POST /payments/deposit
**Auth:** Bearer JWT
**Request:**
```json
{
  "amount": 100.00,
  "payment_method": "credit_card",
  "payment_token": "pm_tok_xyz",
  "currency": "USD"
}
```
**Response:**
```json
{
  "transactionId": "txn_123456",
  "status": "processing",
  "provider": "internal",
  "amount": 100.00
}
```
**Notes:** Legacy-compatible cashier alias. When `PAYMENT_PROVIDER_MODE=provider`, the wallet creates a pending provider-oriented transaction instead of applying funds immediately.

#### POST /payments/withdrawal
**Auth:** Bearer JWT
**Request:**
```json
{
  "amount": 50.00,
  "payment_method": "bank_transfer",
  "currency": "USD"
}
```
**Response:**
```json
{
  "transactionId": "txn_123456",
  "status": "pending_approval",
  "provider": "internal",
  "amount": 50.00
}
```
**Notes:** Legacy-compatible withdrawal alias. Provider mode persists pending withdrawal state plus provider metadata.

#### POST /payments/cash-withdrawal
**Auth:** Bearer JWT
**Request:** same as `/payments/withdrawal`
**Response:** same as `/payments/withdrawal`
**Notes:** Legacy-compatible alias that tags the withdrawal with `payment_method=cash`.

#### POST /payments/cheque-withdrawal
**Auth:** Bearer JWT
**Request:** same as `/payments/withdrawal`
**Response:** same as `/payments/withdrawal`
**Notes:** Legacy-compatible alias that tags the withdrawal with `payment_method=cheque`.

#### GET /payments/transactions/{transaction_id}
**Auth:** Bearer JWT
**Response:**
```json
{
  "transactionId": "txn_123456",
  "status": "processing",
  "provider": "internal",
  "providerRef": "pxp_abc123",
  "amount": 100.00,
  "currency": "USD",
  "providerUpdatedAt": "2026-03-07T14:35:00Z",
  "metadata": {
    "provider_state": "PENDING_REVIEW",
    "required_action": "submit_3ds"
  },
  "createdAt": "2026-03-07T14:30:00Z",
  "updatedAt": "2026-03-07T14:35:00Z"
}
```
**Notes:** Legacy-compatible single cashier transaction lookup backed by the Go wallet ledger. The response now surfaces persisted provider metadata and provider update timestamps so support/admin tools can see callback context instead of only a flattened status.

#### GET /admin/users/{user_id}/transactions
**Auth:** Bearer JWT (role: admin, operator, internal)
**Query Parameters:** `page`, `limit`, `type`, `product`, `start_date`, `end_date`
**Legacy Query Compatibility:** `pagination.currentPage`, `pagination.itemsPerPage`, `filters.category`, `filters.product`, `filters.since`, `filters.until`
**Response:**
```json
{
  "data": [
    {
      "walletId": "w_123456",
      "transactionId": "txn_123456",
      "createdAt": "2026-03-07T14:30:00Z",
      "status": "PENDING",
      "product": "SPORTSBOOK",
      "category": "DEPOSIT",
      "externalId": "pxp_abc123",
      "paymentMethod": {
        "adminPunterId": "usr_123456",
        "details": "pxp_abc123",
        "type": "CREDIT_CARD_PAYMENT_METHOD"
      },
      "transactionAmount": {
        "amount": 100.00,
        "currency": "USD"
      },
      "preTransactionBalance": {
        "amount": 50.00,
        "currency": "USD"
      },
      "postTransactionBalance": {
        "amount": 150.00,
        "currency": "USD"
      }
    }
  ],
  "currentPage": 1,
  "itemsPerPage": 20,
  "totalCount": 1
}
```
**Notes:** Talon-compatible per-user wallet-history review surface backed by the Go wallet ledger.

#### GET /admin/punters/{user_id}/transactions
**Auth:** Bearer JWT (role: admin, operator, internal)
**Response:** same as `GET /admin/users/{user_id}/transactions`

#### POST /pxp/payment-state-changed/handlePaymentStateChangedNotification
**Auth:** HTTP Basic
**Content-Type:** `application/xml`
**Purpose:** Legacy-compatible provider callback for payment state changes
**Notes:** Updates pending provider transactions and applies/fails balance mutations based on callback status. Callback payloads may now also carry provider reason/decision/message/action hints, which are persisted into transaction metadata for cashier ops visibility.

#### POST /pxp/verify-cash-deposit
**Auth:** HTTP Basic
**Content-Type:** `application/xml`
**Purpose:** Legacy-compatible provider callback for cash deposit verification
**Notes:** Confirms pending cash deposits through the provider callback flow.

#### GET /admin/payments/transactions
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `user_id`, `type`, `status`, `provider`, `assigned_to`, `page`, `limit`
**Response:**
```json
{
  "data": [
    {
      "transaction_id": "txn_123456",
      "user_id": "usr_123456",
      "type": "deposit",
      "status": "PENDING",
      "amount": 100.00,
      "provider": "credit_card",
      "provider_reference": "pxp_abc123",
      "timestamp": "2026-03-07T14:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1 }
}
```
**Notes:** Initial admin/backoffice payment queue and filter surface for pending cashier operations. `assigned_to=unassigned` returns only unowned review items.

#### GET /admin/payments/transactions/export
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `user_id`, `type`, `status`, `provider`, `assigned_to`
**Response:** CSV download
**Notes:** Exports the filtered admin payment queue as CSV using the same filter semantics as `GET /admin/payments/transactions`.

#### GET /admin/payments/transactions/summary
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `user_id`, `provider`, `assigned_to`
**Response:**
```json
{
  "data": [
    {
      "status": "PENDING_REVIEW",
      "provider": "credit_card",
      "assigned_to": "ops.user.42",
      "count": 3,
      "total_amount": 450.00,
      "currency": "USD"
    }
  ]
}
```
**Notes:** Queue summary for cashier-review dashboards. Supports the same assignment filter semantics as the detail list.

#### GET /admin/payments/transactions/reconciliation-queue
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `user_id`, `provider`, `assigned_to`, `page`, `limit`
**Response:**
```json
{
  "data": [
    {
      "transaction_id": "txn_123456",
      "user_id": "usr_123456",
      "type": "deposit",
      "status": "PENDING_REVIEW",
      "amount": 100.00,
      "provider": "credit_card",
      "provider_reference": "pxp_abc123",
      "timestamp": "2026-03-07T14:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1 }
}
```
**Notes:** Admin review queue for provider-oriented transactions awaiting approval, manual review, or retry handling. Supports assignment filtering so cashier ops can work from owned queues.

#### GET /admin/payments/transactions/reconciliation-queue/export
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `user_id`, `provider`, `assigned_to`
**Response:** CSV download
**Notes:** Exports the filtered reconciliation queue as CSV using the same filter semantics as `GET /admin/payments/transactions/reconciliation-queue`.

#### GET /admin/payments/transactions/{transaction_id}
**Auth:** Bearer JWT (role: admin)
**Response:**
```json
{
  "transaction_id": "txn_123456",
  "status": "PROCESSING",
  "direction": "Deposit",
  "amount": 100.00,
  "currency": "USD",
  "provider": "credit_card",
  "provider_reference": "pxp_abc123",
  "provider_updated_at": "2026-03-07T14:35:00Z",
  "metadata": {
    "provider_state": "PENDING_REVIEW",
    "required_action": "submit_3ds"
  },
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Notes:** Admin detail read for a single provider-oriented cashier transaction. Includes provider timestamps and persisted provider metadata so operators can inspect callback context and required next actions without separately opening event history first.

#### POST /admin/payments/transactions/reconcile/preview
**Auth:** Bearer JWT (role: admin)
**Request:**
```json
{
  "merchantTransactionId": "merchant_123",
  "providerReference": "pxp_abc123",
  "state": "SETTLED",
  "paymentMethod": "credit_card",
  "reason": "provider_reported_settlement"
}
```
**Response:**
```json
{
  "transaction_id": "txn_123456",
  "provider": "credit_card",
  "provider_reference": "pxp_abc123",
  "direction": "Deposit",
  "current_status": "PENDING_REVIEW",
  "requested_status": "SETTLED",
  "normalized_status": "SUCCEEDED",
  "action": "complete_deposit",
  "allowed": true,
  "current_balance": 150.00,
  "projected_balance": 250.00,
  "reservation_id": "",
  "requires_reservation": false,
  "reservation_satisfied": true
}
```
**Notes:** Admin/operator preview path for provider reconciliation. This lets ops inspect the normalized transition, projected balance effects, and reservation requirements before mutating a provider transaction.

#### GET /admin/payments/transactions/by-provider-reference/{provider_reference}
**Auth:** Bearer JWT (role: admin)
**Response:** same as `GET /admin/payments/transactions/{transaction_id}`
**Notes:** Admin/provider-reference lookup for transaction detail when support or reconciliation only has the external provider reference instead of the internal transaction ID.

#### GET /admin/payments/transactions/by-provider-reference/{provider_reference}/events
**Auth:** Bearer JWT (role: admin)
**Response:** same as `GET /admin/payments/transactions/{transaction_id}/events`
**Notes:** Admin/provider-reference lookup for transaction event history when the operator only has the external provider reference instead of the internal transaction ID.

#### GET /admin/payments/transactions/{transaction_id}/events
**Auth:** Bearer JWT (role: admin)
**Response:**
```json
{
  "data": [
    {
      "id": "evt_123456",
      "transaction_id": "txn_123456",
      "status": "PENDING",
      "source": "system",
      "reason": "provider_pending_created",
      "provider": "credit_card",
      "provider_reference": "pxp_abc123",
      "timestamp": "2026-03-12T10:30:00Z"
    }
  ]
}
```

#### POST /admin/payments/transactions/{transaction_id}/status
**Auth:** Bearer JWT (role: admin)
**Request:**
```json
{
  "status": "SUCCEEDED",
  "provider_reference": "pxp_abc123",
  "reason": "manual_review_approved"
}
```
**Response:**
```json
{
  "transaction_id": "txn_123456",
  "status": "SUCCEEDED",
  "direction": "Deposit",
  "amount": 100.00,
  "currency": "USD",
  "provider": "credit_card",
  "provider_reference": "pxp_abc123",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Notes:** Admin lifecycle override for pending provider-oriented deposits and withdrawals. Uses the same balance-safe completion/failure paths as provider callbacks, and now supports richer provider states including `PROCESSING`, `PENDING_APPROVAL`, `PENDING_REVIEW`, `RETRYING`, `DECLINED`, `EXPIRED`, `REFUNDED`, `REVERSED`, and `CHARGEBACK`.

#### POST /admin/payments/transactions/{transaction_id}/approve
**Auth:** Bearer JWT (role: admin)
**Request:**
```json
{
  "provider_reference": "pxp_approve_123",
  "reason": "manual_review_approved"
}
```
**Response:** payment transaction details
**Notes:** Moves a reviewable provider transaction into `PROCESSING` without changing balances.

#### POST /admin/payments/transactions/{transaction_id}/decline
**Auth:** Bearer JWT (role: admin)
**Request:**
```json
{
  "provider_reference": "pxp_decline_123",
  "reason": "manual_review_declined"
}
```
**Response:** payment transaction details
**Notes:** Moves a reviewable provider transaction into `DECLINED` without changing balances.

#### POST /admin/payments/transactions/{transaction_id}/refund
**Auth:** Bearer JWT (role: admin)
**Request:**
```json
{
  "provider_reference": "pxp_refund_123",
  "reason": "chargeback_confirmed"
}
```
**Response:**
```json
{
  "transaction_id": "txn_123456",
  "status": "REFUNDED",
  "direction": "Deposit",
  "amount": 100.00,
  "currency": "USD",
  "provider": "credit_card",
  "provider_reference": "pxp_refund_123",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Notes:** Explicit admin refund workflow for provider-oriented transactions. Uses the same balance-safe reversal logic as provider callbacks.

#### POST /admin/payments/transactions/{transaction_id}/reverse
**Auth:** Bearer JWT (role: admin)
**Request:**
```json
{
  "provider_reference": "pxp_reverse_123",
  "reason": "provider_reversal"
}
```
**Response:**
```json
{
  "transaction_id": "txn_123456",
  "status": "REVERSED",
  "direction": "Withdrawal",
  "amount": 100.00,
  "currency": "USD",
  "provider": "bank",
  "provider_reference": "pxp_reverse_123",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Notes:** Explicit admin reversal workflow for provider-oriented transactions. Uses the same balance-safe reversal logic as provider callbacks.

#### POST /admin/payments/transactions/{transaction_id}/chargeback
**Auth:** Bearer JWT (role: admin)
**Request:**
```json
{
  "provider_reference": "pxp_chargeback_123",
  "reason": "issuer_chargeback"
}
```
**Response:**
```json
{
  "transaction_id": "txn_123456",
  "status": "CHARGEBACK",
  "direction": "Deposit",
  "amount": 100.00,
  "currency": "USD",
  "provider": "credit_card",
  "provider_reference": "pxp_chargeback_123",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Notes:** Explicit admin chargeback workflow for provider-oriented transactions. Preserves chargeback as a distinct provider state instead of collapsing it into a generic reversal.

#### POST /admin/payments/transactions/{transaction_id}/retry
**Auth:** Bearer JWT (role: admin)
**Request:**
```json
{
  "provider_reference": "pxp_retry_123",
  "reason": "provider_requeue"
}
```
**Response:**
```json
{
  "transaction_id": "txn_123456",
  "status": "RETRYING",
  "direction": "Deposit",
  "amount": 100.00,
  "currency": "USD",
  "provider": "credit_card",
  "provider_reference": "pxp_retry_123",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Notes:** Explicit admin requeue workflow for provider-oriented transactions. Leaves balance untouched and moves the provider state back into a processing/retry lane for downstream reconciliation.

#### POST /admin/payments/transactions/{transaction_id}/settle
**Auth:** Bearer JWT (role: admin)
**Request:**
```json
{
  "provider_reference": "pxp_settle_123",
  "reason": "manual_settlement_confirmation"
}
```
**Response:**
```json
{
  "transaction_id": "txn_123456",
  "status": "SUCCEEDED",
  "direction": "Deposit",
  "amount": 100.00,
  "currency": "USD",
  "provider": "credit_card",
  "provider_reference": "pxp_settle_123",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Notes:** Explicit admin settle workflow for provider-oriented transactions. Uses the same balance-safe completion path as successful provider callbacks but gives operators a dedicated terminal-settlement action instead of a generic status override.

#### GET /api/v1/wallets/{user_id}/transactions
**Auth:** Bearer JWT
**Query Parameters:** `page`, `limit`, `start_date`, `end_date`, `type`
**Response:**
```json
{
  "data": [
    {
      "transaction_id": "txn_123456",
      "user_id": "usr_123456",
      "type": "bet_placed",
      "amount": -50.00,
      "balance_before": 5150.50,
      "balance_after": 5100.50,
      "description": "Bet #bet_999 placed",
      "timestamp": "2026-03-07T14:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 350 }
}
```

#### POST /api/v1/wallets/{user_id}/apply-referral-reward
**Auth:** Bearer JWT
**Request:**
```json
{
  "referral_code": "REF_JOHN123"
}
```
**Response (201):**
```json
{
  "user_id": "usr_123456",
  "reward_amount": 10.00,
  "new_balance": 5110.50,
  "referrer_id": "usr_654321",
  "applied_at": "2026-03-07T14:30:00Z"
}
```
**Calls:** phoenix-user (validate referrer), phoenix-analytics (track reward)
**Events:** phoenix.wallet.balance-updated, phoenix.referral.reward_applied

#### POST /api/v1/wallets/{user_id}/reserve
**Auth:** Bearer JWT (internal service call)
**Request:**
```json
{
  "amount": 150.00,
  "reference_id": "bet_123456",
  "reference_type": "bet"
}
```
**Response (201):**
```json
{
  "user_id": "usr_123456",
  "reserved_amount": 150.00,
  "available_balance": 5100.50,
  "reservation_id": "res_123456"
}
```
**Events:** phoenix.wallet.balance-updated

#### POST /api/v1/wallets/{user_id}/release-reserve
**Auth:** Bearer JWT (internal service call)
**Request:**
```json
{
  "reservation_id": "res_123456",
  "amount": 150.00
}
```
**Response (201):**
```json
{
  "user_id": "usr_123456",
  "released_amount": 150.00,
  "new_available_balance": 5250.50
}
```
**Events:** phoenix.wallet.balance-updated

---

### 4. Phoenix Market Engine (port 8003)

**Role:** Sports market creation and management, odds calculation and updates, market lifecycle (open/suspend/close/settle).

#### POST /api/v1/markets
**Auth:** Bearer JWT (role: operator)
**Request:**
```json
{
  "event_id": "evt_123456",
  "market_type": "moneyline",
  "outcomes": [
    { "name": "Team A", "outcome_id": "out_1" },
    { "name": "Team B", "outcome_id": "out_2" }
  ],
  "odds": {
    "out_1": 1.85,
    "out_2": 2.10
  },
  "status": "open"
}
```
**Response (201):**
```json
{
  "market_id": "mrk_123456",
  "event_id": "evt_123456",
  "market_type": "moneyline",
  "outcomes": [...],
  "odds": {...},
  "status": "open",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Calls:** phoenix-events (validate event), phoenix-analytics (track market)
**Events:** phoenix.market.created

#### GET /api/v1/markets/{market_id}
**Auth:** None
**Response:**
```json
{
  "market_id": "mrk_123456",
  "event_id": "evt_123456",
  "market_type": "moneyline",
  "outcomes": [...],
  "odds": {...},
  "status": "open",
  "min_bet": 1.00,
  "max_bet": 10000.00,
  "total_matched": 45000.00,
  "created_at": "2026-03-07T14:30:00Z"
}
```

#### GET /api/v1/markets
**Auth:** None
**Query Parameters:** `event_id`, `status`, `market_type`, `page`, `limit`
**Response:**
```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 50, "total": 2500 }
}
```

#### PUT /api/v1/markets/{market_id}/odds
**Auth:** Bearer JWT (role: odds-manager)
**Request:**
```json
{
  "odds": {
    "out_1": 1.88,
    "out_2": 2.08
  },
  "reason": "market_movement"
}
```
**Response:**
```json
{
  "market_id": "mrk_123456",
  "odds": {...},
  "updated_at": "2026-03-07T14:30:00Z"
}
```
**Calls:** phoenix-analytics (track odds change)
**Events:** phoenix.market.odds-updated

#### PUT /api/v1/markets/{market_id}/status
**Auth:** Bearer JWT (role: operator)
**Request:**
```json
{
  "status": "suspended",
  "reason": "feed_down"
}
```
**Response:**
```json
{
  "market_id": "mrk_123456",
  "status": "suspended",
  "updated_at": "2026-03-07T14:30:00Z"
}
```
**Events:** phoenix.market.status-changed

#### POST /api/v1/markets/{market_id}/settle
**Auth:** Bearer JWT (role: operator, admin)
**Request:**
```json
{
  "winning_outcome_id": "out_1",
  "reason": "match ended",
  "settled_at": "2026-03-07T20:00:00Z"
}
```
**Response (202):**
```json
{
  "market_id": "mrk_123456",
  "status": "settled",
  "winning_outcome_id": "out_1",
  "settlement_batch_id": "batch_123456"
}
```
**Notes:** Market-level settlement only. Updates market status to `settled` and marks outcomes as `win`/`lose`. State validation enforces only `open` or `suspended` markets can be settled. Does NOT directly call `phoenix-settlement` or trigger bet payouts — bet settlement is a separate operator action. `reason` is optional and captured in the audit log.
**Events:** phoenix.market.settled (consumed by phoenix-realtime for WebSocket broadcast)

#### GET /api/v1/markets/{market_id}/liquidity
**Auth:** Bearer JWT (role: operator)
**Response:**
```json
{
  "market_id": "mrk_123456",
  "total_matched": 125000.00,
  "matched_by_outcome": {
    "out_1": 75000.00,
    "out_2": 50000.00
  },
  "unmatched_orders": 15,
  "effective_spread": 0.04
}
```

---

### 5. Phoenix Betting Engine (port 8004)

**Role:** Bet placement, validation, odds locking, cashout functionality, parlay management, bet history.

#### POST /api/v1/bets
**Auth:** Bearer JWT (role: player)
**Optional Headers:** `X-Geolocation: {encrypted_geo_packet}` when geolocation enforcement is enabled
**Request:**
```json
{
  "user_id": "usr_123456",
  "market_id": "mrk_123456",
  "outcome_id": "out_1",
  "stake": 50.00,
  "odds_type": "decimal",
  "acceptance": "betslip",
  "odds": 1.85,
  "freebet_id": "fb_123456",
  "freebet_applied_cents": 5000,
  "odds_boost_id": "ob_123456"
}
```
**Response (201):**
```json
{
  "bet_id": "bet_123456",
  "user_id": "usr_123456",
  "market_id": "mrk_123456",
  "outcome_id": "out_1",
  "freebet_id": "fb_123456",
  "freebet_applied_cents": 5000,
  "odds_boost_id": "ob_123456",
  "stake": 50.00,
  "odds": 1.85,
  "potential_payout": 92.50,
  "status": "matched",
  "placed_at": "2026-03-07T14:30:00Z"
}
```
**Calls:** phoenix-wallet (reserve stake), phoenix-market-engine (lock odds), phoenix-compliance (check limits), phoenix-analytics (track bet)
**Events:** phoenix.bet.placed
**Notes:** When `GEOLOCATION_ENFORCEMENT_MODE` is set to `required`, `enforced`, or `strict`, the request must include a valid `X-Geolocation` packet that passes `phoenix-compliance` evaluation. If `freebet_id` is supplied and `freebet_applied_cents` is omitted, the service defaults it to the full stake in cents.

#### POST /api/v1/bets/precheck
Validate a batch of single-bet intents before placement and return
`should_block_placement` plus normalized blocking codes.

#### GET /api/v1/match-tracker/fixtures/{fixtureID}
Return a frontend-compatible match-tracker timeline for a fixture. Uses
persisted provider incidents when available and falls back to event/live-score
state otherwise.
**Auth:** Bearer JWT (role: player)
**Request:**
```json
{
  "user_id": "usr_123456",
  "bets": [
    {
      "market_id": "mrk_123456",
      "outcome_id": "out_1",
      "stake": 50.00,
      "odds": 1.85
    }
  ]
}
```
**Response (200):**
```json
{
  "should_block_placement": false,
  "error_codes": []
}
```
**Behavior:** Performs batch single-bet pre-validation against current market state before placement. Normalized error codes include `marketNotFound`, `unableToOpenBet`, `oddsChanged`, and `unexpectedError`.

#### POST /api/v1/bets/builder/quote
**Auth:** Bearer JWT (role: player)
**Request:**
```json
{
  "userId": "usr_123456",
  "requestId": "req_123456",
  "legs": [
    { "marketId": "mrk_1", "selectionId": "out_1", "requestedOdds": 1.85 },
    { "marketId": "mrk_2", "selectionId": "out_2", "requestedOdds": 2.10 }
  ]
}
```
**Response (201):**
```json
{
  "quoteId": "bbq:4ab9d5a7-5f42-4f85-b3d2-d4c0bbd1978d",
  "userId": "usr_123456",
  "requestId": "req_123456",
  "comboType": "parlay",
  "combinable": true,
  "combinedOdds": 3.8850,
  "impliedProbability": 0.257400,
  "expiresAt": "2026-03-12T12:05:00Z",
  "legs": [
    { "marketId": "mrk_1", "selectionId": "out_1", "fixtureId": "evt_1", "requestedOdds": 1.85, "currentOdds": 1.85 },
    { "marketId": "mrk_2", "selectionId": "out_2", "fixtureId": "evt_2", "requestedOdds": 2.10, "currentOdds": 2.10 }
  ],
  "status": "open"
}
```

#### GET /api/v1/bets/builder/quotes/{quote_id}
**Auth:** Bearer JWT (role: player)
**Response:** same shape as quote creation

#### POST /api/v1/bets/builder/accept
**Auth:** Bearer JWT (role: player)
**Optional Headers:** `X-Geolocation: {encrypted_geo_packet}` when geolocation enforcement is enabled
**Request:**
```json
{
  "quoteId": "bbq:4ab9d5a7-5f42-4f85-b3d2-d4c0bbd1978d",
  "userId": "usr_123456",
  "requestId": "req_accept_123456",
  "stakeCents": 2500,
  "idempotencyKey": "bb-accept-1"
}
```
**Response (201):**
```json
{
  "bet": {
    "bet_id": "bet_123456",
    "status": "matched"
  },
  "quote": {
    "quoteId": "bbq:4ab9d5a7-5f42-4f85-b3d2-d4c0bbd1978d",
    "status": "accepted",
    "acceptedBetId": "bet_123456"
  }
}
```

#### POST /api/v1/bets/exotics/fixed/quote
**Auth:** Bearer JWT (role: player)
**Request:**
```json
{
  "userId": "usr_123456",
  "requestId": "req_123456",
  "exoticType": "exacta",
  "stakeCents": 2000,
  "legs": [
    { "position": 1, "marketId": "mrk_1", "selectionId": "out_1", "fixtureId": "evt_1" },
    { "position": 2, "marketId": "mrk_1", "selectionId": "out_2", "fixtureId": "evt_1" }
  ]
}
```
**Response (201):**
```json
{
  "quoteId": "feq:98f0f6fd-1455-4d73-b03d-59b2ad7c8f42",
  "userId": "usr_123456",
  "requestId": "req_123456",
  "exoticType": "exacta",
  "combinable": true,
  "combinedOdds": 3.9900,
  "impliedProbability": 0.250627,
  "stakeCents": 2000,
  "potentialPayoutCents": 7980,
  "encodedTicket": "exacta:1=out_1|2=out_2",
  "status": "open"
}
```

#### GET /api/v1/bets/exotics/fixed/quotes/{quote_id}
**Auth:** Bearer JWT (role: player)
**Response:** same shape as fixed exotic quote creation

#### POST /api/v1/bets/exotics/fixed/accept
**Auth:** Bearer JWT (role: player)
**Optional Headers:** `X-Geolocation: {encrypted_geo_packet}` when geolocation enforcement is enabled
**Request:**
```json
{
  "quoteId": "feq:98f0f6fd-1455-4d73-b03d-59b2ad7c8f42",
  "userId": "usr_123456",
  "requestId": "req_accept_123456",
  "stakeCents": 2000
}
```
**Response (201):**
```json
{
  "bet": {
    "bet_id": "bet_654321",
    "status": "matched"
  },
  "quote": {
    "quoteId": "feq:98f0f6fd-1455-4d73-b03d-59b2ad7c8f42",
    "status": "accepted",
    "acceptedBetId": "bet_654321"
  }
}
```

#### POST /api/v1/bets/status
**Auth:** Bearer JWT (role: player)
**Request:**
```json
{
  "betIds": ["bet_123456", "bet_654321"]
}
```
**Response (200):**
```json
[
  {
    "betId": "bet_123456",
    "state": "OPENED"
  },
  {
    "betId": "bet_654321",
    "state": "SETTLED"
  }
]
```
**Behavior:** Returns status updates for the requested bet ids. Unknown bets and bets the caller cannot access are omitted. Current parity mapping is `pending -> OPENED`, settlement-like states -> `SETTLED`, `cancelled -> CANCELLED`, and `failed -> FAILED`.

#### GET /api/v1/bets/{bet_id}
**Auth:** Bearer JWT
**Response:**
```json
{
  "bet_id": "bet_123456",
  "user_id": "usr_123456",
  "market_id": "mrk_123456",
  "outcome_id": "out_1",
  "stake": 50.00,
  "odds": 1.85,
  "potential_payout": 92.50,
  "status": "matched",
  "placed_at": "2026-03-07T14:30:00Z",
  "settled_at": null,
  "result": null
}
```

#### GET /api/v1/users/{user_id}/bets
**Auth:** Bearer JWT
**Query Parameters:** `status`, `start_date`, `end_date`, `page`, `limit`
**Response:**
```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 450 }
}
```

#### GET /admin/users/{userID}/bets
#### GET /admin/punters/{userID}/bets
**Auth:** Bearer JWT (roles: admin, operator, trader)
**Query Parameters:** `status`, `start_date`, `end_date`, `page`, `limit`
**Legacy Compatibility Query Parameters:** `pagination.currentPage`, `pagination.itemsPerPage`, `filters.since`, `filters.until`
**Response:**
```json
{
  "data": [
    {
      "betId": "bet_123456",
      "placedAt": "2026-03-07T14:30:00Z",
      "betType": "single",
      "displayOdds": { "decimal": 1.85 },
      "stake": { "amount": 50.0, "currency": "EUR" },
      "outcome": "OPEN",
      "sports": [{ "id": "football", "name": "Football" }],
      "legs": [
        {
          "id": "bet_123456",
          "fixture": { "id": "evt_1", "name": "Team A vs Team B", "startTime": "2026-03-07T16:00:00Z" },
          "market": { "id": "mrk_1", "name": "Match Odds" },
          "selection": { "id": "out_1", "name": "Team A" },
          "displayOdds": { "decimal": 1.85 },
          "status": "OPEN",
          "outcome": "OPEN"
        }
      ]
    }
  ],
  "currentPage": 1,
  "itemsPerPage": 20,
  "totalCount": 450
}
```
**Notes:** Talon compatibility read surface. This does not yet imply parity for legacy phone-bet placement or broader admin bet lifecycle write paths beyond cancel.

#### POST /admin/bets/{betID}/cancel
**Auth:** Bearer JWT (roles: admin, operator, trader)
**Request:**
```json
{
  "cancellationReason": "operator requested cancellation"
}
```
**Response (200):**
```json
{
  "bet_id": "bet_123456",
  "status": "cancelled",
  "settled_at": "2026-03-07T14:35:00Z"
}
```
**Calls:** phoenix-wallet (release reserved stake)
**Notes:** Admin compatibility write path for the existing Talon cancel modal. If the repository update fails after stake release, the service restores the reservation before returning the error.

#### POST /admin/bets/{betID}/lifecycle/{action}
**Auth:** Bearer JWT (roles: admin, operator, trader)
**Request:**
```json
{
  "reason": "triage:odds88:settlement",
  "winningSelectionId": "outcome_1",
  "winningSelectionName": "Home",
  "resultSource": "provider_ops_triage"
}
```
**Response (200 example):**
```json
{
  "bet_id": "bet_123456",
  "status": "won",
  "settled_at": "2026-03-07T14:35:00Z"
}
```
**Calls:** phoenix-wallet
**Notes:** Provider-ops compatibility alias. `cancel` delegates to the same reservation-safe admin cancel workflow as `POST /admin/bets/{betID}/cancel`. `refund` now handles open-bet refunds truthfully by releasing the reservation and marking the bet `voided`. `settle` now handles open single-bet settlement truthfully by releasing the reservation and then applying the profit/loss wallet adjustment before marking the bet `won` or `lost`. Multi-leg/parlay settlement is still rejected explicitly because the current provider-ops payload only carries one winning selection id.

#### POST /api/v1/bets/{bet_id}/cashout
**Auth:** Bearer JWT
**Request:**
```json
{
  "cashout_price": 65.00
}
```
**Response (201):**
```json
{
  "bet_id": "bet_123456",
  "original_stake": 50.00,
  "cashout_amount": 65.00,
  "profit": 15.00,
  "status": "cashed_out",
  "cashed_out_at": "2026-03-07T14:30:00Z"
}
```
**Calls:** phoenix-wallet (credit cashout amount), phoenix-market-engine (get current odds)
**Events:** phoenix.bet.cashed-out

#### POST /api/v1/parlays
**Auth:** Bearer JWT (role: player)
**Optional Headers:** `X-Geolocation: {encrypted_geo_packet}` when geolocation enforcement is enabled
**Request:**
```json
{
  "user_id": "usr_123456",
  "freebet_id": "fb_123456",
  "freebet_applied_cents": 10000,
  "odds_boost_id": "ob_123456",
  "legs": [
    { "market_id": "mrk_1", "outcome_id": "out_1", "odds": 1.85 },
    { "market_id": "mrk_2", "outcome_id": "out_2", "odds": 2.10 }
  ],
  "stake": 100.00
}
```
**Response (201):**
```json
{
  "bet_id": "bet_123456",
  "user_id": "usr_123456",
  "freebet_id": "fb_123456",
  "freebet_applied_cents": 10000,
  "odds_boost_id": "ob_123456",
  "legs": [...],
  "odds": 3.885,
  "stake": 100.00,
  "potential_payout": 388.50,
  "status": "matched",
  "bet_type": "parlay",
  "parlay_id": "bet_123456",
  "placed_at": "2026-03-07T14:30:00Z"
}
```
**Calls:** phoenix-wallet (reserve), phoenix-market-engine (lock odds), phoenix-compliance (check limits)
**Events:** phoenix.bet.placed (with parlay_id)
**Notes:** When `GEOLOCATION_ENFORCEMENT_MODE` is set to `required`, `enforced`, or `strict`, the request must include a valid `X-Geolocation` packet that passes `phoenix-compliance` evaluation. Parlay placement persists the same optional promo-linkage fields as single-bet placement.

#### GET /api/v1/bets/{bet_id}/cashout-offer
**Auth:** Bearer JWT
**Response:**
```json
{
  "bet_id": "bet_123456",
  "current_stake": 50.00,
  "cashout_offer": 72.00,
  "profit": 22.00,
  "valid_until": "2026-03-07T14:35:00Z"
}
```
**Calls:** phoenix-market-engine (get live odds)

---

### 6. Phoenix Events (port 8005)

**Role:** External sports event data ingestion, sport/league management, live score updates, event metadata.

#### POST /api/v1/events
**Auth:** Bearer JWT (role: data-provider)
**Request:**
```json
{
  "external_event_id": "espn_12345",
  "sport": "soccer",
  "league": "English Premier League",
  "home_team": "Manchester United",
  "away_team": "Liverpool",
  "scheduled_start": "2026-03-08T15:00:00Z",
  "venue": "Old Trafford"
}
```
**Response (201):**
```json
{
  "event_id": "evt_123456",
  "external_event_id": "espn_12345",
  "sport": "soccer",
  "league": "English Premier League",
  "home_team": "Manchester United",
  "away_team": "Liverpool",
  "scheduled_start": "2026-03-08T15:00:00Z",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Calls:** phoenix-analytics (track event)
**Events:** phoenix.event.created

#### GET /api/v1/events/{event_id}
**Auth:** None
**Response:**
```json
{
  "event_id": "evt_123456",
  "sport": "soccer",
  "league": "English Premier League",
  "home_team": "Manchester United",
  "away_team": "Liverpool",
  "scheduled_start": "2026-03-08T15:00:00Z",
  "status": "scheduled",
  "live_score": null
}
```

#### GET /api/v1/events
**Auth:** None
**Query Parameters:** `sport`, `league`, `status`, `start_date`, `end_date`, `page`, `limit`
**Response:**
```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 100, "total": 5000 }
}
```

#### POST /api/v1/providers/events/upsert
**Auth:** Bearer JWT (role: data-provider/admin)
**Request:**
```json
{
  "external_event_id": "espn_12345",
  "sport": "soccer",
  "league": "English Premier League",
  "home_team": "Manchester United",
  "away_team": "Liverpool",
  "scheduled_start": "2026-03-08T15:00:00Z",
  "venue": "Old Trafford",
  "country": "GB"
}
```
**Response (201/200):**
```json
{
  "event": {
    "event_id": "evt_123456",
    "external_event_id": "espn_12345",
    "sport": "soccer",
    "league": "English Premier League",
    "home_team": "Manchester United",
    "away_team": "Liverpool",
    "scheduled_start": "2026-03-08T15:00:00Z",
    "status": "scheduled"
  },
  "created": true
}
```
**Events:** phoenix.event.upserted

#### POST /api/v1/providers/mockdata/events/sync
**Auth:** Bearer JWT (role: data-provider/admin)
**Request:**
```json
{
  "events": [
    {
      "provider_event_id": "fixture_001",
      "sport": "soccer",
      "league": "English Premier League",
      "home_team": "Manchester United",
      "away_team": "Liverpool",
      "scheduled_start": "2026-03-08T15:00:00Z",
      "venue": "Old Trafford",
      "country": "GB",
      "status": "live"
    }
  ]
}
```
**Response:**
```json
{
  "provider": "mockdata",
  "synced": 1,
  "created": 1,
  "updated": 0,
  "items": [
    {
      "external_id": "mockdata:fixture_001",
      "event_id": "evt_123456",
      "created": true,
      "status": "live"
    }
  ]
}
```

#### POST /api/v1/providers/oddin/events/sync
**Auth:** Bearer JWT (role: data-provider/admin)
**Request:**
```json
{
  "events": [
    {
      "sport_event_id": "sr:match:42",
      "name": "Falcons vs Wolves",
      "start_time": "2026-03-12T18:00:00Z",
      "sport": { "id": "sr:sport:1", "name": "soccer" },
      "tournament": { "id": "sr:tournament:10", "name": "Premier League", "country": "GB" },
      "competitors": [
        { "id": "sr:competitor:1", "name": "Falcons", "abbreviation": "FAL", "side": "home" },
        { "id": "sr:competitor:2", "name": "Wolves", "abbreviation": "WOL", "side": "away" }
      ],
      "sport_event_state": "live"
    }
  ]
}
```
**Response:**
```json
{
  "provider": "oddin",
  "synced": 1,
  "created": 0,
  "updated": 1,
  "items": [
    {
      "external_id": "oddin:sr:match:42",
      "event_id": "evt_123456",
      "created": false,
      "status": "live"
    }
  ]
}
```

#### POST /api/v1/providers/betgenius/events/sync
**Auth:** Bearer JWT (role: data-provider/admin)
**Request:**
```json
{
  "events": [
    {
      "fixture_id": "fixture_42",
      "name": "Falcons vs Wolves",
      "start_time_utc": "2026-03-12T18:00:00Z",
      "status": "cancelled",
      "sport": { "id": "soccer", "name": "soccer" },
      "competition": { "id": "eng", "name": "England" },
      "season": { "id": "epl-2026", "name": "Premier League 2026" },
      "competitors": [
        { "id": "c1", "name": "Falcons", "home_away": "Home" },
        { "id": "c2", "name": "Wolves", "home_away": "Away" }
      ]
    }
  ]
}
```
**Response:**
```json
{
  "provider": "betgenius",
  "synced": 1,
  "created": 1,
  "updated": 0,
  "items": [
    {
      "external_id": "betgenius:fixture_42",
      "event_id": "evt_123456",
      "created": true,
      "status": "cancelled"
    }
  ]
}
```

#### PUT /api/v1/events/{event_id}/live-score
**Auth:** Bearer JWT (role: data-provider)
**Request:**
```json
{
  "status": "live",
  "home_score": 1,
  "away_score": 0,
  "elapsed_minutes": 45,
  "last_update": "2026-03-08T15:45:00Z"
}
```
**Response:**
```json
{
  "event_id": "evt_123456",
  "status": "live",
  "home_score": 1,
  "away_score": 0,
  "updated_at": "2026-03-08T15:45:00Z"
}
```
**Calls:** phoenix-market-engine (market status updates), phoenix-analytics (track live event)
**Events:** phoenix.event.live-score-updated

#### PUT /api/v1/events/{event_id}/result
**Auth:** Bearer JWT (role: data-provider)
**Request:**
```json
{
  "status": "completed",
  "home_score": 2,
  "away_score": 1,
  "result": "home_win",
  "completed_at": "2026-03-08T17:30:00Z"
}
```
**Response:**
```json
{
  "event_id": "evt_123456",
  "status": "completed",
  "home_score": 2,
  "away_score": 1,
  "result": "home_win"
}
```
**Calls:** phoenix-market-engine (event outcome determination)
**Events:** phoenix.event.completed

#### GET /api/v1/sports
**Auth:** None
**Response:**
```json
{
  "sports": [
    {
      "id": "soccer",
      "name": "Soccer",
      "leagues": ["English Premier League", "La Liga", "Serie A"],
      "events_count": 2500
    }
  ]
}
```

#### GET /api/v1/leagues/{sport}
**Auth:** None
**Response:**
```json
{
  "sport": "soccer",
  "leagues": [
    { "name": "English Premier League", "country": "England", "events_count": 380 }
  ]
}
```

#### GET /admin/fixtures
**Auth:** Bearer JWT (role: operator/admin/data-provider)
**Query Parameters:** `sport`, `league`, `status`, `external_id`, `page`, `limit`
**Response:**
```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 100, "total": 5000 }
}
```

#### GET /admin/fixtures/{fixture_id}
**Auth:** Bearer JWT (role: operator/admin/data-provider)
**Response:** Same as `GET /api/v1/events/{event_id}`

#### PUT /admin/fixtures/{fixture_id}/status
**Auth:** Bearer JWT (role: operator/admin/data-provider)
**Request:**
```json
{
  "status": "postponed"
}
```
**Notes:** Scheduling-state control only. Supported values: `scheduled`, `postponed`, `cancelled`.

#### GET /admin/tournaments
**Auth:** Bearer JWT (role: operator/admin/data-provider)
**Query Parameters:** `sport`
**Response:**
```json
{
  "tournaments": [
    {
      "sport": "soccer",
      "league": "English Premier League",
      "country": "GB",
      "fixtures": 10,
      "live_count": 1,
      "scheduled_count": 6,
      "completed_count": 2,
      "cancelled_count": 0,
      "postponed_count": 1
    }
  ]
}
```

#### POST /api/v1/providers/mockdata/markets/sync
**Auth:** Bearer JWT (role: operator/trader/admin/data-provider)
**Request:**
```json
{
  "markets": [
    {
      "provider_market_id": "market_001",
      "event_external_id": "fixture_001",
      "market_type": "moneyline",
      "status": "open",
      "outcomes": [
        { "outcome_id": "home", "name": "Manchester United" },
        { "outcome_id": "away", "name": "Liverpool" }
      ],
      "odds": {
        "home": 1.85,
        "away": 2.1
      }
    }
  ]
}
```
**Response:**
```json
{
  "provider": "mockdata",
  "synced": 1,
  "created": 1,
  "updated": 0,
  "items": [
    {
      "external_id": "mockdata:market_001",
      "market_id": "mrk_123456",
      "created": true,
      "status": "open"
    }
  ]
}
```

#### POST /api/v1/providers/oddin/markets/sync
**Auth:** Bearer JWT (role: operator/trader/admin/data-provider)
**Request:**
```json
{
  "markets": [
    {
      "sport_event_id": "sr:match:42",
      "market_description_id": "1",
      "market_name": "Match Winner",
      "market_specifiers": {
        "map": "1"
      },
      "market_status": "active",
      "market_outcomes": [
        { "outcome_id": "1", "outcome_name": "Falcons", "odds": 1.80, "active": true },
        { "outcome_id": "2", "outcome_name": "Wolves", "odds": 2.05, "active": true }
      ]
    }
  ]
}
```
**Response:**
```json
{
  "provider": "oddin",
  "synced": 1,
  "created": 0,
  "updated": 1,
  "items": [
    {
      "external_id": "oddin:sr:match:42:1:map=1",
      "market_id": "mrk_123456",
      "created": false,
      "status": "open"
    }
  ]
}
```

#### POST /api/v1/providers/betgenius/markets/sync
**Auth:** Bearer JWT (role: operator/trader/admin/data-provider)
**Request:**
```json
{
  "markets": [
    {
      "fixture_id": "fixture_42",
      "market_id": "market_42",
      "market_type": "match_winner",
      "market_name": "Match Winner",
      "trading_status": "open",
      "selections": [
        { "selection_id": "home", "name": "Falcons", "odds": 1.80, "trading": true },
        { "selection_id": "away", "name": "Wolves", "odds": 2.05, "trading": true }
      ]
    }
  ]
}
```
**Response:**
```json
{
  "provider": "betgenius",
  "synced": 1,
  "created": 1,
  "updated": 0,
  "items": [
    {
      "external_id": "betgenius:market_42",
      "market_id": "mrk_123456",
      "created": true,
      "status": "open"
    }
  ]
}
```

#### GET /api/v1/stats/fixtures/{fixture_id}
**Auth:** None
**Response:**
```json
{
  "fixtureId": "evt_123456",
  "status": "in_play",
  "period": "1H",
  "clockSeconds": 1320,
  "metrics": {
    "score": {
      "home": 2,
      "away": 1
    }
  },
  "updatedAt": "2026-03-12T15:04:00Z"
}
```
**Notes:** Uses event metadata if rich stats are present, otherwise falls back to live score / final result derived metrics.

---

### 7. Phoenix Retention (port 8006)

**Role:** Achievements/badges, leaderboards, loyalty campaigns, gamification points, user engagement tracking.

#### POST /api/v1/achievements/{user_id}/unlock
**Auth:** Bearer JWT (internal service call)
**Request:**
```json
{
  "achievement_id": "ach_first_bet",
  "description": "Place your first bet",
  "reward_points": 50,
  "badge_image": "https://cdn.phoenix.com/badges/first_bet.png"
}
```
**Response (201):**
```json
{
  "user_id": "usr_123456",
  "achievement_id": "ach_first_bet",
  "unlocked_at": "2026-03-07T14:30:00Z",
  "reward_points": 50
}
```
**Calls:** phoenix-user (user validation), stella-engagement (award points)
**Events:** stella.achievements.unlocked

#### GET /api/v1/users/{user_id}/achievements
**Auth:** Bearer JWT
**Response:**
```json
{
  "user_id": "usr_123456",
  "achievements": [
    {
      "achievement_id": "ach_first_bet",
      "description": "Place your first bet",
      "unlocked_at": "2026-03-07T14:30:00Z",
      "reward_points": 50
    }
  ],
  "total_points": 250
}
```

#### GET /api/v1/leaderboards
**Auth:** None
**Query Parameters:** `type` (daily/weekly/monthly/all_time), `metric` (points/wins/volume), `limit`, `offset`
**Response:**
```json
{
  "leaderboard_type": "weekly",
  "metric": "points",
  "entries": [
    {
      "rank": 1,
      "user_id": "usr_987654",
      "username": "betting_god",
      "value": 5000,
      "last_update": "2026-03-07T23:59:00Z"
    }
  ],
  "period": { "start": "2026-03-02", "end": "2026-03-08" }
}
```

#### POST /api/v1/campaigns
**Auth:** Bearer JWT (role: marketing)
**Request:**
```json
{
  "name": "Spring Boost",
  "description": "2x points on bets over $50",
  "campaign_type": "points_multiplier",
  "rules": {
    "min_bet_amount": 50,
    "multiplier": 2
  },
  "start_date": "2026-03-10T00:00:00Z",
  "end_date": "2026-03-31T23:59:59Z"
}
```
**Response (201):**
```json
{
  "campaign_id": "cmp_123456",
  "name": "Spring Boost",
  "status": "scheduled",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Events:** stella.campaign.triggered

#### GET /api/v1/users/{user_id}/loyalty-points
**Auth:** Bearer JWT
**Response:**
```json
{
  "user_id": "usr_123456",
  "total_points": 5250,
  "available_points": 4800,
  "reserved_points": 450,
  "points_history": [
    {
      "event": "bet_placed",
      "points": 100,
      "multiplier": 1.0,
      "earned_at": "2026-03-07T14:30:00Z"
    }
  ]
}
```

#### POST /api/v1/users/{user_id}/loyalty-points/redeem
**Auth:** Bearer JWT
**Request:**
```json
{
  "reward_id": "rwd_free_bet",
  "points_to_redeem": 500
}
```
**Response (201):**
```json
{
  "user_id": "usr_123456",
  "reward_id": "rwd_free_bet",
  "points_redeemed": 500,
  "reward_value": 5.00,
  "remaining_points": 4750,
  "redeemed_at": "2026-03-07T14:30:00Z"
}
```
**Calls:** phoenix-wallet (credit reward)
**Events:** stella.points.calculated

#### GET /api/v1/freebets
**Auth:** Bearer JWT
**Query Parameters:** `userId`, `status` (optional)
**Response:**
```json
{
  "items": [
    {
      "freebetId": "fb:local:000001",
      "playerId": "usr_123456",
      "campaignId": "campaign:welcome",
      "currency": "USD",
      "totalAmountCents": 2500,
      "remainingAmountCents": 1250,
      "minOddsDecimal": 1.5,
      "appliesToSportIds": ["soccer"],
      "appliesToTournamentIds": ["epl"],
      "expiresAt": "2026-03-31T23:59:59Z",
      "status": "active",
      "createdAt": "2026-03-07T14:30:00Z",
      "updatedAt": "2026-03-07T14:30:00Z"
    }
  ],
  "totalCount": 1
}
```

#### GET /api/v1/freebets/{freebet_id}
**Auth:** Bearer JWT
**Response:** same item shape as `GET /api/v1/freebets`

#### GET /api/v1/odds-boosts
**Auth:** Bearer JWT
**Query Parameters:** `userId`, `status` (optional)
**Response:**
```json
{
  "items": [
    {
      "oddsBoostId": "ob:local:000001",
      "playerId": "usr_123456",
      "campaignId": "campaign:boost-1",
      "marketId": "mkt_123456",
      "selectionId": "home",
      "currency": "USD",
      "originalOdds": 1.85,
      "boostedOdds": 2.10,
      "maxStakeCents": 5000,
      "minOddsDecimal": 1.5,
      "status": "available",
      "expiresAt": "2026-03-31T23:59:59Z",
      "createdAt": "2026-03-07T14:30:00Z",
      "updatedAt": "2026-03-07T14:30:00Z"
    }
  ],
  "totalCount": 1
}
```

#### GET /api/v1/odds-boosts/{odds_boost_id}
**Auth:** Bearer JWT
**Response:** same item shape as `GET /api/v1/odds-boosts`

#### POST /api/v1/odds-boosts/{odds_boost_id}/accept
**Auth:** Bearer JWT
**Request:**
```json
{
  "userId": "usr_123456",
  "requestId": "req_123456",
  "reason": "accepted_from_betslip"
}
```
**Response:**
```json
{
  "oddsBoostId": "ob:local:000001",
  "playerId": "usr_123456",
  "marketId": "mkt_123456",
  "selectionId": "home",
  "currency": "USD",
  "originalOdds": 1.85,
  "boostedOdds": 2.10,
  "status": "accepted",
  "acceptedAt": "2026-03-07T14:31:00Z",
  "acceptRequestId": "req_123456",
  "createdAt": "2026-03-07T14:30:00Z",
  "updatedAt": "2026-03-07T14:31:00Z"
}
```

---

### 8. Phoenix Social (port 8007)

**Role:** User profiles, follow relationships, activity feeds, real-time chat, social betting features.

#### GET /api/v1/users/{user_id}/profile
**Auth:** None
**Response:**
```json
{
  "user_id": "usr_123456",
  "username": "john_doe",
  "display_name": "John Doe",
  "avatar_url": "https://cdn.phoenix.com/avatars/usr_123456.jpg",
  "bio": "Sports betting enthusiast",
  "follower_count": 250,
  "following_count": 125,
  "stats": {
    "total_bets": 450,
    "win_rate": 0.52,
    "total_profit": 2500.00
  },
  "is_followed": false
}
```

#### POST /api/v1/users/{user_id}/follow/{target_user_id}
**Auth:** Bearer JWT
**Response (201):**
```json
{
  "follower_id": "usr_123456",
  "following_id": "usr_987654",
  "followed_at": "2026-03-07T14:30:00Z"
}
```
**Events:** phoenix.social.followed

#### GET /api/v1/users/{user_id}/followers
**Auth:** None
**Query Parameters:** `page`, `limit`
**Response:**
```json
{
  "data": [
    {
      "user_id": "usr_111111",
      "username": "betty_betting",
      "avatar_url": "...",
      "follow_status": "mutual"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 250 }
}
```

#### GET /api/v1/feed
**Auth:** Bearer JWT
**Query Parameters:** `page`, `limit`, `feed_type` (friends/all)
**Response:**
```json
{
  "data": [
    {
      "activity_id": "act_123456",
      "user_id": "usr_987654",
      "username": "betting_god",
      "activity_type": "bet_placed",
      "details": {
        "bet_id": "bet_999",
        "market": "Manchester vs Liverpool",
        "stake": 100.00,
        "odds": 2.50
      },
      "timestamp": "2026-03-07T14:30:00Z"
    }
  ]
}
```

#### POST /api/v1/messages
**Auth:** Bearer JWT
**Request:**
```json
{
  "to_user_id": "usr_987654",
  "message": "Hey! Nice pick on that parlay!",
  "message_type": "text"
}
```
**Response (201):**
```json
{
  "message_id": "msg_123456",
  "from_user_id": "usr_123456",
  "to_user_id": "usr_987654",
  "message": "Hey! Nice pick on that parlay!",
  "sent_at": "2026-03-07T14:30:00Z",
  "read": false
}
```
**Events:** phoenix.social.message-sent

#### GET /api/v1/messages/{conversation_id}
**Auth:** Bearer JWT
**Query Parameters:** `page`, `limit`
**Response:**
```json
{
  "conversation_id": "conv_123456",
  "with_user_id": "usr_987654",
  "messages": [
    {
      "message_id": "msg_123456",
      "from_user_id": "usr_123456",
      "message": "Hey! Nice pick on that parlay!",
      "sent_at": "2026-03-07T14:30:00Z",
      "read": true
    }
  ]
}
```

---

### 9. Phoenix Compliance (port 8008)

**Role:** Responsible gaming limits, self-exclusion, AML verification, regulatory reporting, restriction enforcement.

Legacy compatibility aliases currently also live here for:
- `POST /punters/deposit-limits`
- `POST /punters/stake-limits`
- `POST /punters/session-limits`
- `GET /punters/limits-history`
- `POST /punters/cool-off`
- `GET /punters/cool-offs-history`
- `PUT /responsibility-check/accept`
- `GET /geo-comply/license-key`
- `POST /geo-comply/geo-packet`
- `/api/v1/geo-comply/*` aliases

#### POST /api/v1/users/{user_id}/limits
**Auth:** Bearer JWT (own limits or role: admin)
**Request:**
```json
{
  "limit_type": "daily_loss",
  "limit_amount": 100.00,
  "currency": "USD",
  "effective_date": "2026-03-07T00:00:00Z"
}
```
**Response (201):**
```json
{
  "user_id": "usr_123456",
  "limit_id": "lim_123456",
  "limit_type": "daily_loss",
  "limit_amount": 100.00,
  "current_period_loss": 0.00,
  "set_at": "2026-03-07T14:30:00Z"
}
```
**Events:** phoenix.compliance.limit-set

#### GET /api/v1/users/{user_id}/limits
**Auth:** Bearer JWT
**Response:**
```json
{
  "user_id": "usr_123456",
  "limits": [
    {
      "limit_type": "daily_loss",
      "limit_amount": 100.00,
      "current_period_loss": 45.50,
      "period_start": "2026-03-07T00:00:00Z"
    }
  ]
}
```

#### POST /api/v1/users/{user_id}/self-exclude
**Auth:** Bearer JWT
**Request:**
```json
{
  "exclusion_type": "permanent",
  "reason": "gambling_problem",
  "duration_days": null
}
```
**Response (201):**
```json
{
  "user_id": "usr_123456",
  "exclusion_id": "exc_123456",
  "exclusion_type": "permanent",
  "effective_at": "2026-03-07T14:30:00Z",
  "status": "active"
}
```
**Calls:** phoenix-user (suspend account), phoenix-notification (send confirmation)

#### GET /geo-comply/license-key
**Auth:** None
**Response (200):**
```json
{
  "value": "demo-geocomply-license"
}
```
**Notes:** Compatibility endpoint for the existing frontend GeoComply bootstrap flow. In production this should be backed by real provider license issuance.

#### POST /geo-comply/geo-packet
**Auth:** None
**Request:**
```json
{
  "encryptedString": "opaque-packet"
}
```
**Response (200, passed):**
```json
{
  "result": "PASSED",
  "anotherGeolocationInSeconds": 1800
}
```
**Response (200, rejected):**
```json
{
  "result": "REJECTED",
  "errors": ["OUT_OF_BOUNDARY"],
  "reasons": [
    {
      "retry": false,
      "message": "Location check failed"
    }
  ]
}
```
**Notes:** Current Go parity is compatibility-mode evaluation. Remaining gap is provider-backed packet validation and betting-side enforcement depth.
**Events:** phoenix.compliance.self-excluded

#### GET /api/v1/users/{user_id}/restrictions
**Auth:** Bearer JWT (role: admin)
**Response:**
```json
{
  "user_id": "usr_123456",
  "restrictions": [
    {
      "type": "daily_loss_limit",
      "value": 100.00,
      "exceeded": true
    },
    {
      "type": "self_excluded",
      "value": "permanent",
      "exceeded": true
    }
  ]
}
```

#### POST /api/v1/aml-check
**Auth:** Bearer JWT (role: operator)
**Request:**
```json
{
  "user_id": "usr_123456",
  "full_name": "John Doe",
  "date_of_birth": "1990-01-15",
  "country": "US"
}
```
**Response (202):**
```json
{
  "check_id": "aml_123456",
  "user_id": "usr_123456",
  "status": "in_progress",
  "initiated_at": "2026-03-07T14:30:00Z"
}
```
**Events:** phoenix.compliance.aml-check-initiated

#### GET /api/v1/aml-check/{check_id}
**Auth:** Bearer JWT (role: admin)
**Response:**
```json
{
  "check_id": "aml_123456",
  "user_id": "usr_123456",
  "status": "completed",
  "result": "clear",
  "risk_level": "low",
  "checked_at": "2026-03-07T14:35:00Z"
}
```

#### POST /api/v1/compliance-alerts
**Auth:** Bearer JWT (role: system)
**Request:**
```json
{
  "alert_type": "unusual_activity",
  "user_id": "usr_123456",
  "description": "User placed 50 bets worth $5000 in 30 minutes",
  "severity": "high"
}
```
**Response (201):**
```json
{
  "alert_id": "alr_123456",
  "status": "open",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Events:** phoenix.compliance.alert

---

### 10. Phoenix Analytics (port 8009)

**Role:** Event tracking, data warehouse integration, dashboards, reporting, user behavior analysis.

#### POST /api/v1/events
**Auth:** Bearer JWT (internal service calls)
**Request:**
```json
{
  "event_type": "bet_placed",
  "user_id": "usr_123456",
  "properties": {
    "bet_id": "bet_123456",
    "market_id": "mrk_123456",
    "stake": 50.00,
    "odds": 1.85
  },
  "timestamp": "2026-03-07T14:30:00Z"
}
```
**Response (202):**
```json
{
  "event_id": "evt_123456",
  "status": "queued",
  "received_at": "2026-03-07T14:30:00Z"
}
```
**Events:** Pushes to ClickHouse (data warehouse)

#### GET /api/v1/reports/user/{user_id}
**Auth:** Bearer JWT (own data or role: admin)
**Response:**
```json
{
  "user_id": "usr_123456",
  "period": "2026-03-01 to 2026-03-07",
  "stats": {
    "total_bets": 45,
    "total_stake": 1250.00,
    "total_returns": 1500.00,
    "profit": 250.00,
    "win_rate": 0.58,
    "roi": 0.20
  }
}
```

#### GET /api/v1/dashboards/platform
**Auth:** Bearer JWT (role: admin)
**Response:**
```json
{
  "date": "2026-03-07",
  "metrics": {
    "active_users": 12500,
    "new_users": 450,
    "total_bets": 25000,
    "total_matched": 500000.00,
    "total_returns": 525000.00,
    "platform_profit": 25000.00
  }
}
```

#### GET /api/v1/reports/markets
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `start_date`, `end_date`, `limit`
**Response:**
```json
{
  "data": [
    {
      "market_id": "mrk_123456",
      "market_type": "moneyline",
      "total_matched": 45000.00,
      "matched_by_outcome": { "out_1": 30000, "out_2": 15000 },
      "total_bets": 1250,
      "house_profit": 500.00
    }
  ]
}
```

#### GET /api/v1/cohorts
**Auth:** Bearer JWT (role: analyst)
**Query Parameters:** `cohort_type` (signup_date/region/vip_status), `start_date`, `end_date`
**Response:**
```json
{
  "cohorts": [
    {
      "cohort_id": "2026-02",
      "users_count": 5000,
      "retention": {
        "day1": 0.72,
        "day7": 0.45,
        "day30": 0.28
      },
      "ltv": 150.00
    }
  ]
}
```

#### GET /admin/users/{user_id}/transactions/export
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `filters.category`, `filters.product`, `start_date`, `end_date`
**Response:** `text/csv`

#### GET /admin/punters/{user_id}/transactions/export
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `filters.category`, `filters.product`, `start_date`, `end_date`
**Response:** `text/csv`

#### POST /admin/punters/exclusions/export
**Auth:** Bearer JWT (role: admin)
**Response:** `text/csv`

#### POST /admin/reports/daily
**Auth:** Bearer JWT (role: admin)
**Response:**
```json
{
  "date": "2026-03-12",
  "generated_at": "2026-03-12T18:00:00Z",
  "dashboard": {
    "date": "2026-03-12",
    "metrics": {
      "active_users": 120,
      "new_users": 6,
      "total_bets": 450,
      "total_matched": 8200.00,
      "total_returns": 7600.00,
      "platform_profit": 600.00
    }
  },
  "market_report": {
    "data": []
  },
  "active_exclusions": 3,
  "transaction_summary": {
    "deposits_count": 12,
    "deposits_amount": 1500.00,
    "withdrawals_count": 5,
    "withdrawals_amount": 450.00,
    "net_cash": 1050.00
  }
}
```

#### GET /admin/reports/daily/repeat
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `on` (`YYYY-MM-DD`)
**Response:** Same as `POST /admin/reports/daily`, but for the requested reporting date.

#### GET /admin/wallet/corrections/tasks
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `userId`, `status`, `limit`, `includeScan`
**Response:**
```json
{
  "items": [
    {
      "taskId": "manual_review:4f5d8b9a-0d3b-4c4e-b805-111122223333",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "type": "manual_review",
      "status": "open",
      "currentBalanceCents": 12500,
      "suggestedAdjustmentCents": 0,
      "reason": "withdrawal via pxp awaiting operator review (status PENDING_REVIEW) providerRef=demo-pxp-withdrawal-001",
      "updatedAt": "2026-03-15T18:13:20Z"
    }
  ],
  "summary": {
    "total": 1,
    "open": 1,
    "resolved": 0,
    "negativeBalance": 0,
    "ledgerDrift": 0,
    "manualReview": 1,
    "suggestedAdjustSum": 0
  }
}
```
**Notes:** Derived read model for Talon risk-management summary. `includeScan` is accepted for compatibility but the queue is rebuilt from live wallet/provider state on read.

#### GET /admin/promotions/usage
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `userId`, `freebetId`, `oddsBoostId`, `from`, `to`, `breakdownLimit`
**Response:**
```json
{
  "summary": {
    "totalBets": 3,
    "totalStakeCents": 12500,
    "betsWithFreebet": 2,
    "betsWithOddsBoost": 2,
    "betsWithBoth": 1,
    "totalFreebetAppliedCents": 5000,
    "totalBoostedStakeCents": 7500,
    "uniqueUsers": 2,
    "uniqueFreebets": 1,
    "uniqueOddsBoosts": 2,
    "freebets": [
      {
        "id": "fb_123456",
        "betCount": 2,
        "totalStakeCents": 5000,
        "totalFreebetAppliedCents": 5000
      }
    ],
    "oddsBoosts": [
      {
        "id": "ob_123456",
        "betCount": 1,
        "totalStakeCents": 2500,
        "totalFreebetAppliedCents": 0
      }
    ]
  },
  "filters": {
    "userId": "usr_123456",
    "freebetId": "fb_123456",
    "oddsBoostId": "ob_123456",
    "from": "2026-03-15T00:00:00Z",
    "to": "2026-03-16T00:00:00Z",
    "breakdownLimit": 20
  }
}
```
**Notes:** Aggregates promo usage from persisted bet-level linkage on `bets.freebet_id`, `bets.freebet_applied_cents`, and `bets.odds_boost_id`, matching the Talon risk-summary contract.

#### GET /admin/feed-health
**Auth:** Bearer JWT (role: admin, operator, trader)
**Response:**
```json
{
  "enabled": true,
  "thresholds": {
    "maxLagMs": 21600000,
    "maxGapCount": 0,
    "maxDuplicateCount": 50
  },
  "summary": {
    "streamCount": 3,
    "unhealthyStreams": 1,
    "totalApplied": 42,
    "totalErrors": 1,
    "maxLagMs": 4500
  },
  "cancel": {
    "totalAttempts": 3,
    "totalRetries": 1,
    "totalFallback": 1,
    "totalSuccess": 1,
    "totalFailed": 1
  },
  "streams": [
    {
      "adapter": "oddin",
      "stream": "events",
      "state": "connected",
      "applied": 12,
      "skipped": 0,
      "replayCount": 0,
      "duplicateCount": 0,
      "gapCount": 0,
      "errorCount": 0,
      "lastLagMs": 1200,
      "lastRevision": 0,
      "lastSequence": 0,
      "lastEventAt": "2026-03-16T10:00:00Z",
      "updatedAt": "2026-03-16T10:00:00Z"
    }
  ]
}
```
**Notes:** Derived provider-ops read model for Talon. Event and market stream freshness come from persisted provider sync state in `events` and `markets`; payment stream health comes from `wallet_transactions` and `payment_transaction_events`. Duplicate/gap counters remain zero until adapters emit those metrics explicitly.

#### POST /admin/provider/cancel
**Auth:** Bearer JWT (role: admin, operator, trader)
**Request:**
```json
{
  "adapter": "pxp",
  "playerId": "usr_123456",
  "betId": "bet_123456",
  "requestId": "pxp_req_123456",
  "reason": "manual provider cancel"
}
```
**Response:**
```json
{
  "state": "cancelled",
  "adapter": "pxp",
  "attempts": 1,
  "retryCount": 0,
  "fallbackUsed": false,
  "lastError": "",
  "updatedAt": "2026-03-17T11:15:00Z"
}
```
**Notes:** Current Go implementation is a Talon compatibility route backed by `phoenix-wallet`. It resolves `requestId` against provider-backed wallet transactions and applies a real `CANCELLED` payment transition when the referenced request still maps to a cancellable deposit or withdrawal. `playerId` is validated against the resolved wallet transaction user when present; `betId` is currently retained for compatibility/audit payloads and is not used as the primary lookup key. Successful transitions emit a narrow `audit_log` row with action `provider.cancel.succeeded`, and defensible failed attempts emit best-effort `provider.cancel.failed` rows for provider-ops visibility.

#### GET /admin/provider/acknowledgements
**Auth:** Bearer JWT (role: admin, operator, trader)
**Response:**
```json
{
  "items": [
    {
      "streamKey": "oddin:events",
      "adapter": "oddin",
      "stream": "events",
      "operator": "ops.jane",
      "note": "Investigating lag spike",
      "status": "acknowledged",
      "lastAction": "acknowledged",
      "acknowledgedAt": "2026-03-16T10:05:00Z",
      "updatedBy": "admin-1"
    }
  ]
}
```

#### POST /admin/provider/acknowledgements
**Auth:** Bearer JWT (role: admin, operator, trader)
**Request:**
```json
{
  "streamKey": "oddin:events",
  "adapter": "oddin",
  "stream": "events",
  "action": "resolve",
  "operator": "ops.jane",
  "note": "Issue fixed"
}
```
**Response:** Same shape as an acknowledgement item.
**Notes:** Persists stream-level triage state for the Talon provider-ops view. Supported actions: `acknowledge`, `reassign`, `resolve`, `reopen`. Emits audit rows under `provider.stream.*`.

#### GET /admin/provider/acknowledgement-sla
**Auth:** Bearer JWT (role: admin, operator, trader)
**Response:**
```json
{
  "default": {
    "adapter": "",
    "warningMinutes": 15,
    "criticalMinutes": 30,
    "updatedAt": "2026-03-16T10:00:00Z",
    "updatedBy": "migration:038",
    "source": "default"
  },
  "overrides": [
    {
      "adapter": "oddin",
      "warningMinutes": 10,
      "criticalMinutes": 20,
      "updatedAt": "2026-03-16T10:02:00Z",
      "updatedBy": "admin-1",
      "source": "override"
    }
  ],
  "effective": [
    {
      "adapter": "oddin",
      "warningMinutes": 10,
      "criticalMinutes": 20,
      "updatedAt": "2026-03-16T10:02:00Z",
      "updatedBy": "admin-1",
      "source": "override"
    }
  ]
}
```

#### POST /admin/provider/acknowledgement-sla
**Auth:** Bearer JWT (role: admin, operator, trader)
**Request:**
```json
{
  "adapter": "oddin",
  "warningMinutes": 10,
  "criticalMinutes": 20
}
```
**Response:** Same shape as an SLA setting item.
**Notes:** Empty `adapter` updates the default SLA row. Emits audit rows under `provider.stream.sla.*`.

#### GET /admin/risk/player-scores
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `userId` (required)
**Response:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "churnScore": 41.2,
  "ltvScore": 68.5,
  "riskScore": 57.1,
  "modelVersion": "risk-intel-v1",
  "generatedAt": "2026-03-15T19:00:00Z"
}
```
**Notes:** Current implementation derives scores from live sportsbook, prediction, wallet-deposit, balance, and payment-review features already present in the Go schema.

#### GET /admin/risk/segments
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `userId`, `limit`
**Response:**
```json
{
  "items": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "segmentId": "watchlist",
      "segmentReason": "payment review or balance anomaly requires attention",
      "riskScore": 57.1,
      "hasManualOverride": false,
      "generatedAt": "2026-03-15T19:00:00Z"
    }
  ],
  "total": 1
}
```
**Notes:** Read-only derived segmentation for Talon risk-management summary. Manual override mutation is not implemented in this service.

---

### 11. Phoenix Settlement (port 8010)

**Role:** Batch settlement of matched bets, payout calculations, reconciliation, settlement reporting.

#### POST /api/v1/settlement-batches
**Auth:** Bearer JWT (role: settlement-operator)
**Request:**
```json
{
  "market_ids": ["mrk_123456", "mrk_789012"],
  "winning_outcomes": {
    "mrk_123456": "out_1",
    "mrk_789012": "out_2"
  },
  "settlement_type": "automatic"
}
```
**Response (202):**
```json
{
  "batch_id": "batch_123456",
  "status": "processing",
  "market_count": 2,
  "bet_count": 5000,
  "total_payout": 275000.00,
  "created_at": "2026-03-07T20:00:00Z"
}
```
**Calls:** phoenix-wallet (credit payouts), phoenix-notification (notify winners), phoenix-analytics (record settlement)
**Events:** phoenix.settlement.batch-started

#### GET /api/v1/settlement-batches/{batch_id}
**Auth:** Bearer JWT (role: admin)
**Response:**
```json
{
  "batch_id": "batch_123456",
  "status": "completed",
  "market_count": 2,
  "bet_count": 5000,
  "settled_count": 4950,
  "pending_count": 50,
  "total_payout": 275000.00,
  "payout_state": {
    "processing": 50,
    "completed": 4900,
    "failed": 50
  },
  "started_at": "2026-03-07T20:00:00Z",
  "completed_at": "2026-03-07T20:15:00Z"
}
```

#### GET /api/v1/settlement-batches
**Auth:** Bearer JWT (role: admin)
**Query Parameters:** `status`, `start_date`, `end_date`, `page`, `limit`
**Response:**
```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 50, "total": 500 }
}
```

#### POST /api/v1/payouts/manual
**Auth:** Bearer JWT (role: settlement-operator)
**Request:**
```json
{
  "user_id": "usr_123456",
  "amount": 500.00,
  "reason": "voided_bet",
  "reference_id": "bet_123456"
}
```
**Response (201):**
```json
{
  "payout_id": "payout_123456",
  "user_id": "usr_123456",
  "amount": 500.00,
  "status": "processed",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Calls:** phoenix-wallet (credit payout)
**Events:** phoenix.settlement.payout-processed

#### POST /api/v1/reconciliation
**Auth:** Bearer JWT (role: admin)
**Request:**
```json
{
  "batch_id": "batch_123456",
  "reconciliation_type": "full_audit"
}
```
**Response (202):**
```json
{
  "reconciliation_id": "rec_123456",
  "batch_id": "batch_123456",
  "status": "in_progress",
  "started_at": "2026-03-07T21:00:00Z"
}
```

#### GET /api/v1/reconciliation/{reconciliation_id}
**Auth:** Bearer JWT (role: admin)
**Response:**
```json
{
  "reconciliation_id": "rec_123456",
  "batch_id": "batch_123456",
  "status": "completed",
  "discrepancies_found": 5,
  "reconciliation_details": [
    {
      "bet_id": "bet_111",
      "discrepancy_type": "payout_mismatch",
      "expected": 100.00,
      "actual": 99.50,
      "variance": -0.50
    }
  ],
  "completed_at": "2026-03-07T21:10:00Z"
}
```

---

### 12. Phoenix Notification (port 8011)

**Role:** Email, push, SMS dispatch, notification templates, delivery tracking, user preferences.

#### POST /api/v1/notifications
**Auth:** Bearer JWT (internal service call)
**Request:**
```json
{
  "user_id": "usr_123456",
  "notification_type": "bet_settled",
  "channels": ["email", "push"],
  "template_id": "bet_settled_win",
  "variables": {
    "bet_id": "bet_123456",
    "profit": 50.00
  },
  "priority": "normal"
}
```
**Response (202):**
```json
{
  "notification_id": "notif_123456",
  "user_id": "usr_123456",
  "status": "queued",
  "queued_at": "2026-03-07T14:30:00Z"
}
```
**Events:** phoenix.notification.send

#### GET /api/v1/templates
**Auth:** Bearer JWT (role: admin)
**Response:**
```json
{
  "data": [
    {
      "template_id": "bet_settled_win",
      "name": "Bet Won",
      "subject": "Congratulations! Your bet won!",
      "email_body": "Your bet on {market} has won. You've earned {profit}.",
      "push_title": "Bet Won",
      "push_body": "You won {profit}!",
      "sms_body": "Bet won! +{profit} in your account."
    }
  ]
}
```

#### PUT /api/v1/notifications/{notification_id}/status
**Auth:** Bearer JWT (internal service call)
**Request:**
```json
{
  "channel": "email",
  "status": "delivered",
  "delivered_at": "2026-03-07T14:31:00Z"
}
```
**Response:**
```json
{
  "notification_id": "notif_123456",
  "channel_statuses": {
    "email": "delivered",
    "push": "pending"
  }
}
```
**Events:** phoenix.notification.delivered

#### GET /api/v1/users/{user_id}/notification-preferences
**Auth:** Bearer JWT
**Response:**
```json
{
  "user_id": "usr_123456",
  "preferences": {
    "marketing_emails": true,
    "bet_notifications": true,
    "promotional_sms": false,
    "push_notifications": true,
    "quiet_hours": {
      "enabled": true,
      "start": "22:00",
      "end": "08:00"
    }
  }
}
```

#### PUT /api/v1/users/{user_id}/notification-preferences
**Auth:** Bearer JWT
**Request:**
```json
{
  "marketing_emails": false,
  "push_notifications": true
}
```
**Response:**
```json
{
  "user_id": "usr_123456",
  "updated_at": "2026-03-07T14:30:00Z"
}
```

#### GET /api/v1/notifications/{notification_id}
**Auth:** Bearer JWT (role: admin)
**Response:**
```json
{
  "notification_id": "notif_123456",
  "user_id": "usr_123456",
  "notification_type": "bet_settled",
  "status": "delivered",
  "channel_statuses": {
    "email": "delivered",
    "push": "delivered"
  },
  "sent_at": "2026-03-07T14:30:00Z",
  "delivered_at": "2026-03-07T14:31:00Z"
}
```

---

### 13. Phoenix CMS (port 8012)

**Role:** Content management, promotional campaigns, website pages, blog management, SEO (Strapi replacement target).

#### POST /api/v1/pages
**Auth:** Bearer JWT (role: content-editor)
**Request:**
```json
{
  "title": "How to Place a Bet",
  "slug": "how-to-place-bet",
  "content": "<h1>How to Place a Bet</h1>...",
  "meta_title": "How to Place a Bet | Phoenix",
  "meta_description": "Step-by-step guide to placing bets on Phoenix",
  "published": true
}
```
**Response (201):**
```json
{
  "page_id": "page_123456",
  "title": "How to Place a Bet",
  "slug": "how-to-place-bet",
  "published": true,
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Events:** phoenix.cms.page-published

#### GET /api/v1/pages/{page_id}
**Auth:** None (public content)
**Response:**
```json
{
  "page_id": "page_123456",
  "title": "How to Place a Bet",
  "slug": "how-to-place-bet",
  "content": "<h1>How to Place a Bet</h1>...",
  "meta_title": "How to Place a Bet | Phoenix",
  "published_at": "2026-03-07T14:30:00Z"
}
```

#### GET /api/v1/pages
**Auth:** None
**Query Parameters:** `published`, `page`, `limit`
**Response:**
```json
{
  "data": [...],
  "pagination": { "page": 1, "limit": 20, "total": 150 }
}
```

#### POST /api/v1/promotions
**Auth:** Bearer JWT (role: marketing)
**Request:**
```json
{
  "name": "Welcome Bonus",
  "description": "Get 50% bonus on your first deposit",
  "promotion_type": "deposit_bonus",
  "rules": {
    "bonus_percentage": 50,
    "max_bonus": 500.00,
    "wagering_requirement": 5
  },
  "start_date": "2026-03-10T00:00:00Z",
  "end_date": "2026-03-31T23:59:59Z",
  "active": true
}
```
**Response (201):**
```json
{
  "promotion_id": "promo_123456",
  "name": "Welcome Bonus",
  "status": "scheduled",
  "created_at": "2026-03-07T14:30:00Z"
}
```
**Events:** stella.campaign.triggered

#### GET /api/v1/promotions
**Auth:** None
**Response:**
```json
{
  "data": [
    {
      "promotion_id": "promo_123456",
      "name": "Welcome Bonus",
      "promotion_type": "deposit_bonus",
      "active": true
    }
  ]
}
```

#### POST /api/v1/banners
**Auth:** Bearer JWT (role: content-editor)
**Request:**
```json
{
  "title": "March Madness Betting",
  "image_url": "https://cdn.phoenix.com/banners/march-madness.jpg",
  "link": "/promos/march-madness",
  "position": "homepage_hero",
  "start_date": "2026-03-10T00:00:00Z",
  "end_date": "2026-03-31T23:59:59Z"
}
```
**Response (201):**
```json
{
  "banner_id": "banner_123456",
  "title": "March Madness Betting",
  "active": true,
  "created_at": "2026-03-07T14:30:00Z"
}
```

#### GET /api/v1/banners
**Auth:** None
**Query Parameters:** `position`
**Response:**
```json
{
  "data": [
    {
      "banner_id": "banner_123456",
      "title": "March Madness Betting",
      "image_url": "...",
      "link": "/promos/march-madness"
    }
  ]
}
```

---

### 14. Stella Engagement (port 8013)

**Role:** Real-time engagement engine, streaming achievements/points, real-time leaderboards, engagement logic (Go + Kafka consumers + goroutine pipelines + Redis).

#### POST /api/v1/achievements/stream
**Auth:** Bearer JWT (internal service call)
**WebSocket Connection:** `wss://stella-engagement:8013/api/v1/stream/achievements/{user_id}`
**Message Format:**
```json
{
  "event_type": "achievement_unlocked",
  "achievement_id": "ach_first_bet",
  "user_id": "usr_123456",
  "reward_points": 50,
  "timestamp": "2026-03-07T14:30:00Z"
}
```
**Events:** stella.achievements.unlocked

#### POST /api/v1/points/calculate
**Auth:** Bearer JWT (internal service call)
**Request:**
```json
{
  "user_id": "usr_123456",
  "event_type": "bet_placed",
  "event_data": {
    "stake": 50.00,
    "odds": 1.85
  }
}
```
**Response (202):**
```json
{
  "user_id": "usr_123456",
  "points_awarded": 75,
  "calculation_id": "calc_123456"
}
```
**Events:** stella.points.calculated

#### GET /api/v1/leaderboard/stream
**WebSocket Connection:** `wss://stella-engagement:8013/api/v1/stream/leaderboard`
**Message Format (Server Push):**
```json
{
  "event_type": "leaderboard_update",
  "leaderboard_type": "weekly_points",
  "entries": [
    {
      "rank": 1,
      "user_id": "usr_987654",
      "username": "betting_god",
      "value": 5250,
      "timestamp": "2026-03-07T14:30:00Z"
    }
  ]
}
```
**Events:** stella.leaderboard.updated

#### POST /api/v1/aggregations/compute
**Auth:** Bearer JWT (internal service call)
**Request:**
```json
{
  "user_id": "usr_123456",
  "aggregation_type": "daily_stats",
  "period": "2026-03-07"
}
```
**Response (202):**
```json
{
  "aggregation_id": "agg_123456",
  "user_id": "usr_123456",
  "status": "processing"
}
```
**Events:** stella.aggregations.updated

#### GET /api/v1/engagement-score/{user_id}
**Auth:** Bearer JWT
**Response:**
```json
{
  "user_id": "usr_123456",
  "engagement_score": 8500,
  "components": {
    "betting_activity": 5000,
    "social_engagement": 2000,
    "achievements": 1500
  },
  "last_updated": "2026-03-07T14:30:00Z"
}
```

---

## Inter-Service Call Graph

```
phoenix-gateway (8080)
├── → phoenix-user (auth validation)
├── → phoenix-wallet (balance checks)
├── → phoenix-market-engine (market data)
├── → phoenix-betting-engine (bet placement)
├── → phoenix-events (event data)
├── → phoenix-retention (leaderboards/achievements)
├── → phoenix-social (profiles/feeds)
├── → phoenix-compliance (limit checks)
├── → phoenix-analytics (event tracking)
├── → phoenix-settlement (settlement status)
├── → phoenix-notification (notification status)
├── → phoenix-cms (content)
└── → stella-engagement (real-time data)

phoenix-user (8001)
├── → phoenix-notification (send emails/SMS)
├── → phoenix-compliance (KYC verification)
├── → phoenix-analytics (track signups)
└── → phoenix-wallet (referral validation)

phoenix-wallet (8002)
├── → phoenix-user (user validation)
├── → phoenix-compliance (withdrawal limits)
├── → phoenix-market-engine (odds for cashout)
├── → phoenix-notification (send confirmations)
├── → phoenix-analytics (track transactions)
└── → stella-engagement (award points)

phoenix-market-engine (8003)
├── → phoenix-events (validate events)
├── → phoenix-analytics (track markets)
├── → phoenix-settlement (settle markets)
└── → phoenix-notification (market updates)

phoenix-betting-engine (8004)
├── → phoenix-wallet (reserve/release funds)
├── → phoenix-market-engine (lock odds, validate)
├── → phoenix-compliance (check limits)
├── → phoenix-user (validate user)
├── → phoenix-settlement (batch settlement)
├── → phoenix-notification (bet confirmations)
├── → phoenix-analytics (track bets)
└── → stella-engagement (award points)

phoenix-events (8005)
├── → phoenix-market-engine (update markets)
├── → phoenix-analytics (track events)
└── → phoenix-notification (live score alerts)

phoenix-retention (8006)
├── → phoenix-user (user validation)
├── → phoenix-wallet (credit rewards)
├── → phoenix-analytics (track achievements)
├── → phoenix-notification (send notifications)
└── → stella-engagement (award points/achievements)

phoenix-social (8007)
├── → phoenix-user (user profiles)
├── → phoenix-retention (user stats)
└── → phoenix-analytics (track social)

phoenix-compliance (8008)
├── → phoenix-user (account suspension)
├── → phoenix-wallet (block withdrawals)
├── → phoenix-notification (send alerts)
├── → phoenix-betting-engine (restrict bets)
└── → phoenix-analytics (track compliance)

phoenix-analytics (8009)
├── (Receives events from all services)
└── (Pushes to ClickHouse data warehouse)

phoenix-settlement (8010)
├── → phoenix-wallet (credit payouts)
├── → phoenix-notification (send notifications)
├── → phoenix-betting-engine (update bet status)
├── → phoenix-market-engine (update market status)
└── → phoenix-analytics (track settlements)

phoenix-notification (8011)
├── → Email provider (SendGrid/similar)
├── → SMS provider (Twilio/similar)
└── → Push provider (FCM/APNs)

phoenix-cms (8012)
├── → phoenix-notification (send promotional emails)
└── → phoenix-analytics (track content)

stella-engagement (8013)
├── → phoenix-retention (unlock achievements)
├── → phoenix-wallet (award points as wallet credit)
├── → phoenix-analytics (stream events)
└── (Consumes from all Kafka topics)

phoenix-prediction (8014)
├── → phoenix-wallet (reserve/release funds on player orders)
├── → phoenix-analytics (prediction activity/reporting hooks)
└── → phoenix-audit (admin lifecycle and bot-key audit visibility)
```

### Phoenix Prediction (8014)

Public:
- `GET /api/v1/prediction/overview`
- `GET /api/v1/prediction/categories`
- `GET /api/v1/prediction/markets`
- `GET /api/v1/prediction/markets/{marketID}`
- `POST /api/v1/prediction/ticket/preview`

Player:
- `GET /api/v1/prediction/orders`
- `POST /api/v1/prediction/orders`
- `GET /api/v1/prediction/orders/{orderID}`
- `POST /api/v1/prediction/orders/{orderID}/cancel`

Admin:
- `GET /admin/prediction/summary`
- `GET /admin/prediction/markets`
- `GET /admin/prediction/markets/{marketID}`
- `GET /admin/prediction/markets/{marketID}/lifecycle`
- `GET /admin/prediction/orders`
- `GET /admin/prediction/orders/{orderID}`
- `POST /admin/prediction/markets/{marketID}/suspend`
- `POST /admin/prediction/markets/{marketID}/open`
- `POST /admin/prediction/markets/{marketID}/cancel`
- `POST /admin/prediction/markets/{marketID}/resolve`
- `POST /admin/prediction/markets/{marketID}/resettle`
- `POST /v1/bot/keys`
- `POST /api/v1/bot/keys`

---

### Phoenix Audit (8015)

Admin:
- `GET /admin/audit-logs`
- `GET /admin/audit-logs/export`
- `GET /admin/users/{userID}/logs`
- `GET /admin/punters/{userID}/logs`

Supported list/export filters:
- `action`
- `actor_id`
- `target_id`
- `product`
- `sort_by`
- `sort_dir`
- `page`
- `limit`

Authorization:
- `admin` can query the full audit surface
- `operator`, `trader`, and `moderator` can query prediction-scoped audit data
  when `product=prediction`
- `admin`, `operator`, and `trader` can query per-user review history via the
  `users/{userID}/logs` and `punters/{userID}/logs` aliases

Per-user review behavior:
- rows are returned when the supplied user appears as the audit actor or the
  audit target entity
- this is intended for Talon user-review history, not broad audit export

---

### Phoenix Support Notes (8016)

Admin:
- `GET /admin/users/{userID}/timeline`
- `GET /admin/users/{userID}/timeline/export`
- `GET /admin/users/{userID}/notes`
- `POST /admin/users/{userID}/notes`
- `GET /admin/punters/{punterID}/timeline`
- `GET /admin/punters/{punterID}/timeline/export`
- `GET /admin/punters/{punterID}/notes`
- `POST /admin/punters/{punterID}/notes`

Timeline aggregation:
- support notes
- wallet transactions
- bets
- verification sessions
- self-exclusions
- compliance limits
- responsibility checks

Supported timeline filters:
- `type`
- `start_date`
- `end_date`

---

## Authentication & Authorization

### JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "usr_123456",
    "username": "john_doe",
    "roles": ["player", "affiliate"],
    "permissions": ["place_bets", "view_markets"],
    "iat": 1646668200,
    "exp": 1646671800,
    "iss": "phoenix-gateway"
  }
}
```

### Role-Based Access Control (RBAC)

| Role | Permissions | Services |
|------|-------------|----------|
| **player** | place_bets, view_markets, manage_wallet, view_profile, social | All user-facing services |
| **affiliate** | view_referrals, claim_rewards | phoenix-user, phoenix-wallet, phoenix-retention |
| **operator** | create_markets, settle_markets, manage_promotions | phoenix-market-engine, phoenix-cms |
| **content-editor** | manage_pages, manage_banners | phoenix-cms |
| **data-provider** | create_events, update_scores | phoenix-events |
| **admin** | all permissions | All services |
| **system** | internal service-to-service calls | All services |

### Service-to-Service Authentication
Services use mTLS (mutual TLS) certificates for peer communication, with certificate validation on both client and server sides.

---

## Error Handling

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| VALIDATION_ERROR | 422 | Input validation failed |
| AUTH_REQUIRED | 401 | Authentication required but not provided |
| AUTH_INVALID | 401 | Invalid or expired token |
| FORBIDDEN | 403 | Valid auth but insufficient permissions |
| NOT_FOUND | 404 | Resource doesn't exist |
| CONFLICT | 409 | State conflict (e.g., duplicate user, concurrent modification) |
| INSUFFICIENT_BALANCE | 400 | Wallet balance too low |
| MARKET_CLOSED | 400 | Market is closed for betting |
| BET_LIMIT_EXCEEDED | 400 | Bet exceeds limit |
| INTERNAL_ERROR | 500 | Server error |
| SERVICE_UNAVAILABLE | 503 | Service temporarily unavailable |

### Retry Logic
- **Idempotent requests** (GET, DELETE): Retry up to 3 times with exponential backoff
- **Non-idempotent requests** (POST, PUT): Use idempotency keys in headers `X-Idempotency-Key`
- **Rate limited**: Respect `Retry-After` header (default 60s)

---

**End of SERVICE_CONTRACTS.md**
