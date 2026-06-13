# Phoenix Kafka Topic Registry

**Document Version:** 1.0
**Last Updated:** 2026-03-07
**Purpose:** Define all Kafka event topics, schemas, and streaming contracts for Phoenix platform

---

## Table of Contents
1. [Registry Overview](#registry-overview)
2. [Topic Naming Conventions](#topic-naming-conventions)
3. [Topic Definitions](#topic-definitions)
4. [Schema Registry](#schema-registry)
5. [Consumer Groups](#consumer-groups)
6. [Deployment Topology](#deployment-topology)

---

## Registry Overview

**Kafka Cluster Configuration:**
- Broker count: 3 (minimum for HA)
- Replication factor: 3
- Min in-sync replicas: 2
- Schema Registry: Confluent Schema Registry (Avro + JSON Schema)
- Log retention: Topic-specific (see details)
- Compression: Snappy
- Total topics: 21

**Consumer Infrastructure:**
- Consumer lag monitoring: Burrow
- Dead-letter topics: Enabled for critical topics
- Consumer group naming: `{service}-{topic}-group`

---

## Topic Naming Conventions

All topics follow this pattern:
```
{domain}.{entity}.{event-type}
```

### Examples:
- `phoenix.wallet.transactions` - Wallet transaction events
- `phoenix.bet.placed` - Bet placement events
- `stella.achievements.unlocked` - Achievement unlock events

### Partitioning Strategy:
- High-volume topics (>100k msg/sec): Partitioned by `user_id` (256 partitions)
- Medium-volume topics (10k-100k msg/sec): Partitioned by `user_id` (64 partitions)
- Low-volume topics (<10k msg/sec): Partitioned by `event_id` (8 partitions)

---

## Topic Definitions

---

### 1. phoenix.wallet.transactions

**Purpose:** Track all wallet transactions (deposits, withdrawals, bets placed/settled).
**Category:** Financial events (high priority)

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 256 |
| Replication Factor | 3 |
| Min In-Sync Replicas | 2 |
| Retention Period | 365 days |
| Compression | Snappy |
| Cleanup Policy | delete (after retention) |
| Segment Duration | 7 days |

**Producers:**
- phoenix-wallet (deposits, withdrawals)
- phoenix-betting-engine (bet stakes deducted)
- phoenix-settlement (payouts)

**Consumers:**
- phoenix-analytics (reporting)
- phoenix-compliance (monitoring)
- External audit/compliance systems

**Event Schema:**
```json
{
  "transaction_id": "txn_123456",
  "user_id": "usr_123456",
  "wallet_id": "wal_123456",
  "transaction_type": "withdrawal",
  "amount": 50.00,
  "currency": "USD",
  "balance_before": 5150.50,
  "balance_after": 5100.50,
  "status": "completed",
  "description": "Withdrawal to bank account",
  "reference_id": "wth_123456",
  "reference_type": "withdrawal",
  "payment_method": "bank_transfer",
  "merchant_reference": "ext_ref_789",
  "timestamp": "2026-03-07T14:30:00Z",
  "processed_at": "2026-03-07T14:30:15Z",
  "metadata": {
    "ip_address": "192.168.1.1",
    "device_id": "dev_xyz",
    "region": "US"
  }
}
```

**Schema Fields:**
- `transaction_id` (string, required): Unique transaction identifier
- `user_id` (string, required): User performing transaction
- `wallet_id` (string, required): Wallet being debited/credited
- `transaction_type` (enum, required): deposit, withdrawal, bet_placed, bet_settled, reward, refund
- `amount` (decimal, required): Transaction amount
- `currency` (string, required): ISO 4217 currency code
- `balance_before` (decimal): Balance before transaction
- `balance_after` (decimal): Balance after transaction
- `status` (enum): pending, completed, failed, cancelled
- `description` (string): Human-readable description
- `reference_id` (string): ID of referenced resource (bet_id, withdrawal_id, etc.)
- `reference_type` (string): Type of referenced resource
- `payment_method` (string): Method used (credit_card, bank_transfer, etc.)
- `merchant_reference` (string): External merchant reference
- `timestamp` (long): Event timestamp (epoch milliseconds)
- `processed_at` (long): When transaction was processed
- `metadata` (object): Additional context

**Key Field:** `user_id`

---

### 2. phoenix.wallet.balance-updated

**Purpose:** Real-time wallet balance updates for notifications and caching.
**Category:** Balance state updates

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 256 |
| Replication Factor | 3 |
| Retention Period | 90 days |
| Compression | Snappy |
| Cleanup Policy | delete |

**Producers:**
- phoenix-wallet (all balance-affecting operations)
- phoenix-settlement (payouts)

**Consumers:**
- phoenix-notification (balance alerts)
- stella-engagement (engagement calculations)
- Mobile/Web apps (real-time balance display)

**Event Schema:**
```json
{
  "user_id": "usr_123456",
  "wallet_id": "wal_123456",
  "previous_balance": 5150.50,
  "new_balance": 5100.50,
  "balance_change": -50.00,
  "reason": "withdrawal_requested",
  "reason_detail": "User initiated withdrawal",
  "reserved_amount": 0.00,
  "available_balance": 5100.50,
  "currency": "USD",
  "timestamp": "2026-03-07T14:30:00Z",
  "transaction_id": "txn_123456"
}
```

**Key Field:** `user_id`

---

### 3. phoenix.user.registered

**Purpose:** User registration events for onboarding and analytics.
**Category:** User lifecycle

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 64 |
| Replication Factor | 3 |
| Retention Period | Unlimited |
| Compression | Snappy |
| Cleanup Policy | delete (never expires) |

**Producers:**
- phoenix-user (on successful registration)

**Consumers:**
- phoenix-analytics (cohort tracking)
- phoenix-notification (welcome email)
- phoenix-retention (onboarding campaigns)
- CRM/marketing systems

**Event Schema:**
```json
{
  "user_id": "usr_123456",
  "email": "user@example.com",
  "username": "john_doe",
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1990-01-15",
  "country": "US",
  "registration_timestamp": "2026-03-07T14:30:00Z",
  "source": "web",
  "referral_code": "REF_JOHN123",
  "referrer_user_id": "usr_654321",
  "device_info": {
    "device_type": "mobile",
    "os": "iOS",
    "app_version": "2.5.1"
  },
  "ip_address": "192.168.1.1",
  "region": "US",
  "timezone": "America/New_York"
}
```

**Key Field:** `user_id`

---

### 4. phoenix.user.verified

**Purpose:** Email/identity verification completion events.
**Category:** User lifecycle

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 64 |
| Replication Factor | 3 |
| Retention Period | Unlimited |
| Compression | Snappy |

**Producers:**
- phoenix-user (on email verification)
- phoenix-compliance (on KYC completion)

**Consumers:**
- phoenix-analytics
- phoenix-notification
- phoenix-compliance (restriction lifting)

**Event Schema:**
```json
{
  "user_id": "usr_123456",
  "verification_type": "email",
  "verification_method": "code",
  "verified_at": "2026-03-07T14:45:00Z",
  "previous_status": "pending_verification",
  "new_status": "verified",
  "verification_code_id": "vcode_123",
  "attempts": 1,
  "ip_address": "192.168.1.1"
}
```

**Key Field:** `user_id`

---

### 5. phoenix.user.updated

**Purpose:** User profile updates (non-sensitive changes).
**Category:** User lifecycle

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 128 |
| Replication Factor | 3 |
| Retention Period | 180 days |
| Compression | Snappy |

**Producers:**
- phoenix-user (profile updates)

**Consumers:**
- phoenix-analytics
- phoenix-social (profile cache invalidation)
- phoenix-notification (preference updates)

**Event Schema:**
```json
{
  "user_id": "usr_123456",
  "updated_fields": ["first_name", "phone"],
  "changes": {
    "first_name": {
      "old_value": "John",
      "new_value": "Jonathan"
    },
    "phone": {
      "old_value": "+1234567890",
      "new_value": "+1234567891"
    }
  },
  "updated_by": "user",
  "updated_at": "2026-03-07T14:30:00Z"
}
```

**Key Field:** `user_id`

---

### 6. phoenix.market.created

**Purpose:** New market creation events.
**Category:** Market lifecycle

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 64 |
| Replication Factor | 3 |
| Retention Period | Unlimited |
| Compression | Snappy |

**Producers:**
- phoenix-market-engine (on market creation)

**Consumers:**
- phoenix-analytics
- phoenix-notification (market notifications)
- Mobile apps (market feed updates)

**Event Schema:**
```json
{
  "market_id": "mrk_123456",
  "event_id": "evt_123456",
  "event_name": "Manchester vs Liverpool",
  "sport": "soccer",
  "league": "English Premier League",
  "market_type": "moneyline",
  "outcomes": [
    {
      "outcome_id": "out_1",
      "name": "Team A",
      "odds": 1.85
    },
    {
      "outcome_id": "out_2",
      "name": "Team B",
      "odds": 2.10
    }
  ],
  "status": "open",
  "min_bet": 1.00,
  "max_bet": 10000.00,
  "created_at": "2026-03-07T10:00:00Z",
  "scheduled_start": "2026-03-08T15:00:00Z"
}
```

**Key Field:** `market_id`

---

### 7. phoenix.market.status-changed

**Purpose:** Market status transitions (open, suspended, closed, settled).
**Category:** Market lifecycle

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 128 |
| Replication Factor | 3 |
| Retention Period | 365 days |
| Compression | Snappy |

**Producers:**
- phoenix-market-engine

**Consumers:**
- phoenix-betting-engine (restrict new bets)
- phoenix-analytics
- phoenix-notification (status updates)
- phoenix-settlement (settlement trigger)

**Event Schema:**
```json
{
  "market_id": "mrk_123456",
  "previous_status": "open",
  "new_status": "suspended",
  "reason": "feed_down",
  "reason_detail": "Live data feed temporarily unavailable",
  "changed_at": "2026-03-08T15:30:00Z",
  "changed_by": "system",
  "expected_recovery": "2026-03-08T15:45:00Z"
}
```

**Key Field:** `market_id`

---

### 8. phoenix.market.odds-updated

**Purpose:** Real-time odds changes for liquidity management and notifications.
**Category:** Market state (high-volume)

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 256 |
| Replication Factor | 3 |
| Retention Period | 30 days |
| Compression | Snappy |
| Cleanup Policy | delete |

**Producers:**
- phoenix-market-engine (odds updates)

**Consumers:**
- phoenix-betting-engine (odds validation)
- phoenix-analytics (odds analysis)
- Mobile apps (live odds feeds)
- stellar-engagement (odds tracking)

**Event Schema:**
```json
{
  "market_id": "mrk_123456",
  "previous_odds": {
    "out_1": 1.85,
    "out_2": 2.10
  },
  "new_odds": {
    "out_1": 1.88,
    "out_2": 2.08
  },
  "reason": "market_movement",
  "odds_change_percentage": {
    "out_1": 1.6,
    "out_2": -0.95
  },
  "updated_at": "2026-03-08T15:30:30Z",
  "effective_at": "2026-03-08T15:30:30Z"
}
```

**Key Field:** `market_id`

---

### 9. phoenix.bet.placed

**Purpose:** Bet placement events - critical for settlement and analytics.
**Category:** Betting (highest priority)

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 512 |
| Replication Factor | 3 |
| Min In-Sync Replicas | 3 |
| Retention Period | Unlimited |
| Compression | Snappy |
| Cleanup Policy | delete (never) |

**Producers:**
- phoenix-betting-engine (on successful bet placement)

**Consumers:**
- phoenix-settlement (settlement batching)
- phoenix-retention (achievement tracking)
- phoenix-compliance (limit monitoring)
- phoenix-analytics (reporting)
- stella-engagement (points calculation)
- Regulatory reporting systems

**Event Schema:**
```json
{
  "bet_id": "bet_123456",
  "user_id": "usr_123456",
  "market_id": "mrk_123456",
  "outcome_id": "out_1",
  "stake": 50.00,
  "odds": 1.85,
  "odds_type": "decimal",
  "odds_requested": 1.85,
  "odds_matched": 1.85,
  "potential_payout": 92.50,
  "bet_type": "single",
  "parlay_id": null,
  "parlay_leg_index": null,
  "status": "matched",
  "placed_at": "2026-03-08T14:30:00Z",
  "matched_at": "2026-03-08T14:30:05Z",
  "ip_address": "192.168.1.1",
  "device_id": "dev_xyz",
  "user_agent": "Mozilla/5.0...",
  "session_id": "sess_123456",
  "promotion_applied": null,
  "wallet_balance_before": 5150.50,
  "wallet_balance_after": 5100.50
}
```

**Key Field:** `user_id`

---

### 10. phoenix.bet.settled

**Purpose:** Bet settlement results - critical for payouts and dispute resolution.
**Category:** Settlement (highest priority)

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 256 |
| Replication Factor | 3 |
| Min In-Sync Replicas | 3 |
| Retention Period | Unlimited |
| Compression | Snappy |
| Cleanup Policy | delete (never) |

**Producers:**
- phoenix-settlement (on bet settlement)

**Consumers:**
- phoenix-wallet (process payouts)
- phoenix-retention (achievement/leaderboard updates)
- phoenix-compliance (regulation reporting)
- phoenix-analytics (reporting)
- Regulatory reporting systems

**Event Schema:**
```json
{
  "bet_id": "bet_123456",
  "user_id": "usr_123456",
  "market_id": "mrk_123456",
  "outcome_id": "out_1",
  "stake": 50.00,
  "odds": 1.85,
  "potential_payout": 92.50,
  "settlement_result": "won",
  "payout_amount": 92.50,
  "profit": 42.50,
  "settled_at": "2026-03-08T17:30:00Z",
  "settlement_batch_id": "batch_123456",
  "winning_outcome_id": "out_1",
  "voided_reason": null,
  "disputed": false,
  "dispute_id": null,
  "settlement_type": "automatic",
  "payout_processed": false,
  "payout_timestamp": null
}
```

**Key Field:** `user_id`

---

### 11. phoenix.bet.cashed-out

**Purpose:** Bet cashout events for analytics and profit tracking.
**Category:** Betting

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 128 |
| Replication Factor | 3 |
| Retention Period | 365 days |
| Compression | Snappy |

**Producers:**
- phoenix-betting-engine (on successful cashout)

**Consumers:**
- phoenix-wallet (process refund)
- phoenix-analytics
- phoenix-retention (achievement tracking)

**Event Schema:**
```json
{
  "bet_id": "bet_123456",
  "user_id": "usr_123456",
  "original_stake": 50.00,
  "original_odds": 1.85,
  "cashout_price": 65.00,
  "profit": 15.00,
  "roi": 0.30,
  "current_odds": 1.85,
  "market_id": "mrk_123456",
  "cashed_out_at": "2026-03-08T15:45:00Z",
  "reason": "user_requested"
}
```

**Key Field:** `user_id`

---

### 12. phoenix.notification.send

**Purpose:** Notification dispatch events for delivery tracking.
**Category:** Notifications

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 128 |
| Replication Factor | 3 |
| Retention Period | 90 days |
| Compression | Snappy |

**Producers:**
- phoenix-notification (on notification queuing)

**Consumers:**
- phoenix-notification (external dispatch)
- phoenix-analytics (delivery tracking)

**Event Schema:**
```json
{
  "notification_id": "notif_123456",
  "user_id": "usr_123456",
  "notification_type": "bet_settled",
  "channels": ["email", "push"],
  "template_id": "bet_settled_win",
  "template_variables": {
    "bet_id": "bet_123456",
    "profit": 50.00
  },
  "priority": "normal",
  "scheduled_for": "2026-03-08T17:31:00Z",
  "user_preferences": {
    "marketing_emails": true,
    "push_notifications": true
  },
  "created_at": "2026-03-08T17:30:00Z"
}
```

**Key Field:** `user_id`

---

### 13. phoenix.notification.delivered

**Purpose:** Notification delivery confirmation for compliance and retry logic.
**Category:** Notifications

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 128 |
| Replication Factor | 3 |
| Retention Period | 180 days |
| Compression | Snappy |

**Producers:**
- phoenix-notification (on successful delivery)

**Consumers:**
- phoenix-analytics
- Delivery tracking systems

**Event Schema:**
```json
{
  "notification_id": "notif_123456",
  "user_id": "usr_123456",
  "channel": "email",
  "status": "delivered",
  "delivered_at": "2026-03-08T17:31:15Z",
  "recipient": "user@example.com",
  "provider": "sendgrid",
  "provider_message_id": "ext_msg_789",
  "delivery_time_ms": 15000,
  "retry_count": 0
}
```

**Key Field:** `user_id`

---

### 14. phoenix.analytics.events

**Purpose:** General event sink for all platform activity tracking.
**Category:** Analytics (high-volume)

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 256 |
| Replication Factor | 2 |
| Retention Period | 365 days (via tiered storage) |
| Compression | Snappy |
| Cleanup Policy | delete |

**Producers:**
- All services (event tracking)

**Consumers:**
- phoenix-analytics (aggregation)
- ClickHouse (data warehouse)
- Splunk (logging)

**Event Schema:**
```json
{
  "event_id": "evt_analytics_123456",
  "event_type": "bet_placed",
  "user_id": "usr_123456",
  "session_id": "sess_123456",
  "timestamp": "2026-03-08T14:30:00Z",
  "properties": {
    "bet_id": "bet_123456",
    "stake": 50.00,
    "market_type": "moneyline"
  },
  "context": {
    "device_type": "mobile",
    "os": "iOS",
    "app_version": "2.5.1",
    "country": "US",
    "region": "California"
  }
}
```

**Key Field:** `user_id`

---

### 15. phoenix.compliance.alert

**Purpose:** Compliance violation and alert events.
**Category:** Compliance (highest priority)

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 32 |
| Replication Factor | 3 |
| Min In-Sync Replicas | 3 |
| Retention Period | Unlimited |
| Compression | Snappy |
| Cleanup Policy | delete (never) |

**Producers:**
- phoenix-compliance
- phoenix-betting-engine (limit violations)
- phoenix-wallet (withdrawal blocks)

**Consumers:**
- phoenix-compliance (alert dashboard)
- Regulatory reporting systems
- Security team monitoring

**Event Schema:**
```json
{
  "alert_id": "alr_123456",
  "alert_type": "daily_loss_limit_exceeded",
  "severity": "high",
  "user_id": "usr_123456",
  "description": "User exceeded daily loss limit",
  "threshold": 100.00,
  "current_value": 125.00,
  "created_at": "2026-03-08T14:30:00Z",
  "action_required": true,
  "recommended_action": "review_account",
  "evidence": {
    "total_losses_today": 125.00,
    "bet_count": 5
  }
}
```

**Key Field:** `user_id`

---

### 16. phoenix.settlement.batch-completed

**Purpose:** Settlement batch completion events for auditing and reconciliation.
**Category:** Settlement

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 32 |
| Replication Factor | 3 |
| Retention Period | Unlimited |
| Compression | Snappy |

**Producers:**
- phoenix-settlement (on batch completion)

**Consumers:**
- phoenix-analytics
- Reconciliation systems
- Regulatory reporting

**Event Schema:**
```json
{
  "batch_id": "batch_123456",
  "market_ids": ["mrk_123456", "mrk_789012"],
  "status": "completed",
  "market_count": 2,
  "bet_count": 5000,
  "settled_count": 4950,
  "pending_count": 50,
  "failed_count": 0,
  "total_matched": 450000.00,
  "total_payout": 475000.00,
  "platform_hold": 25000.00,
  "started_at": "2026-03-08T20:00:00Z",
  "completed_at": "2026-03-08T20:15:00Z",
  "processing_time_ms": 900000,
  "dispute_count": 0
}
```

**Key Field:** `batch_id`

---

### 17. stella.achievements.unlocked

**Purpose:** Real-time achievement unlocks for gamification.
**Category:** Engagement (Stella)

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 128 |
| Replication Factor | 3 |
| Retention Period | Unlimited |
| Compression | Snappy |

**Producers:**
- stella-engagement (on unlock condition met)

**Consumers:**
- phoenix-retention (achievement ledger)
- phoenix-wallet (reward processing)
- phoenix-notification (send notifications)
- Mobile apps (real-time updates)

**Event Schema:**
```json
{
  "achievement_id": "ach_first_bet",
  "user_id": "usr_123456",
  "achievement_name": "Place Your First Bet",
  "description": "Successfully place your first bet",
  "reward_points": 50,
  "reward_currency_amount": 5.00,
  "badge_image": "https://cdn.phoenix.com/badges/first_bet.png",
  "category": "milestone",
  "tier": 1,
  "unlocked_at": "2026-03-08T14:30:00Z",
  "trigger_event": "bet_placed",
  "trigger_event_id": "bet_123456",
  "notification_sent": false
}
```

**Key Field:** `user_id`

---

### 18. stella.aggregations.updated

**Purpose:** Real-time aggregated user statistics.
**Category:** Engagement (Stella)

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 256 |
| Replication Factor | 2 |
| Retention Period | 180 days |
| Compression | Snappy |

**Producers:**
- stella-engagement (streaming aggregations)

**Consumers:**
- phoenix-retention (user stats)
- phoenix-social (profile stats)
- phoenix-analytics

**Event Schema:**
```json
{
  "user_id": "usr_123456",
  "aggregation_type": "daily_stats",
  "period": "2026-03-08",
  "aggregations": {
    "bets_placed": 15,
    "total_stake": 750.00,
    "total_returns": 800.00,
    "profit": 50.00,
    "win_count": 9,
    "loss_count": 6,
    "win_rate": 0.60,
    "avg_odds": 1.87
  },
  "timestamp": "2026-03-08T23:59:00Z"
}
```

**Key Field:** `user_id`

---

### 19. stella.points.calculated

**Purpose:** Real-time loyalty points earning events.
**Category:** Engagement (Stella)

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 256 |
| Replication Factor | 3 |
| Retention Period | Unlimited |
| Compression | Snappy |

**Producers:**
- stella-engagement (on points calculation)

**Consumers:**
- phoenix-wallet (points balance)
- phoenix-retention (leaderboards)
- phoenix-notification (milestone celebrations)

**Event Schema:**
```json
{
  "calculation_id": "calc_123456",
  "user_id": "usr_123456",
  "event_type": "bet_placed",
  "event_id": "bet_123456",
  "base_points": 50,
  "multiplier": 1.5,
  "total_points_awarded": 75,
  "reason": "daily_promotion",
  "lifetime_points": 5250,
  "current_tier": "gold",
  "calculated_at": "2026-03-08T14:30:00Z"
}
```

**Key Field:** `user_id`

---

### 20. stella.leaderboard.updated

**Purpose:** Real-time leaderboard position updates.
**Category:** Engagement (Stella)

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 64 |
| Replication Factor | 2 |
| Retention Period | 90 days |
| Compression | Snappy |
| Cleanup Policy | delete |

**Producers:**
- stella-engagement (on leaderboard rank changes)

**Consumers:**
- phoenix-retention (leaderboard state)
- Mobile apps (real-time leaderboard updates)

**Event Schema:**
```json
{
  "leaderboard_type": "weekly_points",
  "period": "2026-W10",
  "user_id": "usr_123456",
  "previous_rank": 150,
  "new_rank": 75,
  "previous_value": 3500,
  "new_value": 5000,
  "rank_change": 75,
  "percentile": 0.05,
  "updated_at": "2026-03-08T23:59:00Z"
}
```

**Key Field:** `user_id`

---

### 21. stella.campaign.triggered

**Purpose:** Campaign engagement and trigger events.
**Category:** Engagement (Stella)

**Configuration:**
| Property | Value |
|----------|-------|
| Partitions | 64 |
| Replication Factor | 3 |
| Retention Period | 180 days |
| Compression | Snappy |

**Producers:**
- stella-engagement (campaign eligibility triggers)

**Consumers:**
- phoenix-retention (campaign tracking)
- phoenix-notification (campaign notifications)
- phoenix-analytics (campaign analytics)

**Event Schema:**
```json
{
  "campaign_id": "cmp_123456",
  "campaign_name": "Spring Boost",
  "user_id": "usr_123456",
  "trigger_type": "user_eligible",
  "trigger_condition": "deposit_over_100",
  "campaign_offer": {
    "type": "points_multiplier",
    "multiplier": 2.0,
    "valid_until": "2026-03-31T23:59:59Z"
  },
  "triggered_at": "2026-03-08T14:30:00Z",
  "user_notified": false,
  "opt_in_required": false
}
```

**Key Field:** `user_id`

---

## Schema Registry

### Schema Versioning
All topics use Avro schemas stored in Confluent Schema Registry with semantic versioning:
- `1.0.0` - Initial release
- `1.1.0` - Backward-compatible changes (new optional fields)
- `2.0.0` - Breaking changes (field removal/type change)

### Schema Example: phoenix.bet.placed
```json
{
  "namespace": "com.phoenix.betting",
  "type": "record",
  "name": "BetPlaced",
  "version": "1.0.0",
  "fields": [
    { "name": "bet_id", "type": "string", "doc": "Unique bet identifier" },
    { "name": "user_id", "type": "string", "doc": "User placing bet" },
    { "name": "market_id", "type": "string", "doc": "Market ID" },
    { "name": "outcome_id", "type": "string", "doc": "Selected outcome" },
    { "name": "stake", "type": "double", "doc": "Stake amount in USD" },
    { "name": "odds", "type": "double", "doc": "Matched odds" },
    { "name": "potential_payout", "type": "double" },
    { "name": "placed_at", "type": "long", "logicalType": "timestamp-millis" }
  ]
}
```

---

## Consumer Groups

### Critical Consumer Groups (Exactly-Once Semantics)

| Topic | Consumer Group | Service | Processing Guarantee |
|-------|----------------|---------|----------------------|
| phoenix.bet.placed | settlement-processor | phoenix-settlement | exactly-once |
| phoenix.bet.settled | wallet-payout-processor | phoenix-wallet | exactly-once |
| phoenix.wallet.transactions | compliance-monitoring | phoenix-compliance | at-least-once |
| phoenix.compliance.alert | compliance-alerts | Security team | at-least-once |
| phoenix.settlement.batch-completed | audit-reconciliation | Audit systems | at-least-once |

### Analytics Consumer Groups (At-Least-Once Acceptable)

| Topic | Consumer Group | Service | Lag Threshold |
|-------|----------------|---------|----------------|
| phoenix.analytics.events | analytics-warehouse | ClickHouse | 5 min |
| phoenix.bet.placed | analytics-bets | ClickHouse | 10 min |
| phoenix.bet.settled | analytics-settlements | ClickHouse | 10 min |

### Real-Time Consumer Groups

| Topic | Consumer Group | Service | Max Lag |
|-------|----------------|---------|---------|
| phoenix.market.odds-updated | odds-cache-updater | Cache layer | 100ms |
| stella.leaderboard.updated | leaderboard-replicator | Redis | 500ms |
| stella.points.calculated | wallet-balance-updater | phoenix-wallet | 1s |

---

## Deployment Topology

### Kafka Cluster Configuration

```yaml
Cluster: phoenix-prod
  Brokers: 3 nodes
  Region: US-East-1
  Replication Factor: 3
  Min ISR: 2

Topic Tier 1 (Critical - 256 partitions):
  - phoenix.wallet.transactions
  - phoenix.wallet.balance-updated
  - phoenix.bet.placed
  - phoenix.bet.settled
  - phoenix.market.odds-updated

Topic Tier 2 (Important - 128 partitions):
  - phoenix.user.updated
  - phoenix.bet.cashed-out
  - phoenix.notification.send
  - phoenix.notification.delivered
  - stella.achievements.unlocked
  - stella.aggregations.updated
  - stella.points.calculated

Topic Tier 3 (Standard - 64 partitions):
  - phoenix.user.registered
  - phoenix.user.verified
  - phoenix.market.created
  - phoenix.market.status-changed
  - stella.leaderboard.updated
  - stella.campaign.triggered

Topic Tier 4 (Archive - 32 partitions):
  - phoenix.analytics.events
  - phoenix.compliance.alert
  - phoenix.settlement.batch-completed
```

### Monitoring & Alerting

**Consumer Lag Monitoring:**
- Burrow cluster: 3 instances
- Lag threshold alerts:
  - Critical topics: >5 min lag
  - Important topics: >15 min lag
  - Standard topics: >30 min lag

**Topic Metrics:**
- Messages/sec per topic
- Bytes/sec per topic
- Consumer lag per group
- Error rate per consumer

### Retention Policy

| Category | Retention | Archive |
|----------|-----------|---------|
| Financial | 365 days | 7 years (S3) |
| User Lifecycle | Unlimited | Unlimited |
| Betting/Settlement | Unlimited | 7 years |
| Compliance/Alerts | Unlimited | 7 years |
| Analytics | 365 days | Tiered S3 |
| Real-time | 30-90 days | N/A |

---

**End of KAFKA_TOPIC_REGISTRY.md**
