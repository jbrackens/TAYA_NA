# 10 — Eventing and Background Jobs

**Date:** 2026-04-16

---

## Current Event Patterns

| Pattern | Where | How It Works |
|---|---|---|
| WebSocket push | `gateway/internal/ws/` | Hub broadcasts to subscribed clients (markets, fixtures, wallets, bets) |
| Provider feed ingestion | `gateway/internal/provider/runtime.go` | Adapter registry replays events from feed providers |
| Synchronous settlement | `gateway/internal/bets/service.go` | Settlement events processed inline when provider feed delivers them |
| Background ticker | `wallet/service.go:225-244` | Goroutine tickers for idempotency eviction (5min) and reservation expiry |
| File-based snapshots | `loyalty/persist.go` | Periodic save to JSON (5s interval) |

**No Kafka, NATS, or message queue.** All event propagation is synchronous or via WebSocket.

---

## New Event Types

### Bonus Lifecycle Events

| Event | Payload | Triggered By | Consumers |
|---|---|---|---|
| `bonus.granted` | `{user_id, bonus_id, campaign_id, amount_cents, expires_at}` | Campaign claim or admin grant | WebSocket → player app, loyalty accrual |
| `bonus.progress` | `{user_id, bonus_id, completed_cents, required_cents, pct}` | Wagering contribution recorded | WebSocket → player app progress UI |
| `bonus.completed` | `{user_id, bonus_id, converted_amount_cents}` | Wagering requirements met | WebSocket → player app celebration, wallet conversion |
| `bonus.expired` | `{user_id, bonus_id, forfeited_amount_cents}` | Expiry scanner job | WebSocket → player app notification |
| `bonus.forfeited` | `{user_id, bonus_id, reason, actor}` | Admin action | WebSocket → player app notification |

### Campaign Lifecycle Events

| Event | Payload | Triggered By | Consumers |
|---|---|---|---|
| `campaign.activated` | `{campaign_id, name, type, start_at}` | Admin activates campaign | Backoffice refresh, promotions page cache invalidation |
| `campaign.paused` | `{campaign_id}` | Admin pauses | Backoffice refresh |
| `campaign.closed` | `{campaign_id}` | Admin closes or end_at reached | Backoffice refresh, optionally forfeit uncompleted bonuses |

### Wagering Contribution Events

| Event | Payload | Triggered By | Consumers |
|---|---|---|---|
| `bet.wagering_contributed` | `{user_id, bonus_id, bet_id, contribution_cents, total_completed}` | Bet settlement | Bonus service (check completion), WebSocket (progress update) |

### Content Events

| Event | Payload | Triggered By | Consumers |
|---|---|---|---|
| `content.published` | `{page_id, slug}` | Admin publishes page | Cache invalidation |
| `content.updated` | `{page_id, slug}` | Admin edits content | Cache invalidation |
| `banner.changed` | `{banner_id, position}` | Admin creates/updates/deletes banner | WebSocket → player app banner refresh |

---

## Event Delivery Mechanism

### In-Process Event Bus (No Kafka for MVP)

```go
// New file: services/gateway/internal/events/bus.go

type Event struct {
    Type      string          // "bonus.granted", "campaign.activated", etc.
    Payload   json.RawMessage
    Timestamp time.Time
    UserID    string          // for user-scoped events
}

type Handler func(ctx context.Context, event Event) error

type Bus struct {
    mu       sync.RWMutex
    handlers map[string][]Handler
}

func (b *Bus) Subscribe(eventType string, handler Handler)
func (b *Bus) Publish(ctx context.Context, event Event) error
```

**Why in-process, not Kafka:**
- Single gateway instance — no need for distributed messaging
- Synchronous processing is fine for MVP volume
- WebSocket hub already handles real-time push to clients
- Adding Kafka requires infrastructure (ZooKeeper/KRaft), deployment changes, monitoring
- Extraction point is clean: swap `Bus` implementation to Kafka producer/consumer later

**Event flow:**

```
Bet settles (win)
  │
  ├─ wallet.Credit(winnings)
  ├─ wallet.RecordWageringContribution()
  │     │
  │     └─ bus.Publish("bet.wagering_contributed", ...)
  │           │
  │           ├─ bonus/service handler: check if wagering complete
  │           │     └─ if complete: bus.Publish("bonus.completed", ...)
  │           │                       └─ wallet.ConvertBonusToReal()
  │           │
  │           └─ ws/handler: push progress update to player
  │
  └─ loyalty.HandleSettlement() (existing)
```

---

## Background Jobs

### Job 1: Bonus Expiry Scanner

```
Schedule: Every 60 seconds (goroutine ticker)
Pattern:  Same as wallet.evictStaleIdempotencyKeys()

Logic:
  1. SELECT * FROM player_bonuses WHERE status = 'active' AND expires_at < NOW()
  2. For each expired bonus:
     a. wallet.ForfeitBonus(user_id, bonus_id, "expired")
     b. UPDATE player_bonuses SET status = 'expired'
     c. bus.Publish("bonus.expired", ...)
  3. Log count of expired bonuses
```

### Job 2: Campaign Auto-Close

```
Schedule: Every 300 seconds (5 min)

Logic:
  1. SELECT * FROM campaigns WHERE status = 'active' AND end_at < NOW()
  2. For each expired campaign:
     a. UPDATE campaigns SET status = 'closed'
     b. bus.Publish("campaign.closed", ...)
  3. Log count of closed campaigns
```

### Job 3: Stale Reservation Cleanup (Existing — No Change)

```
Already implemented: wallet.ExpireStaleReservations() at service.go:650-666
Schedule: Should be called periodically (currently manual)
Recommendation: Wire into the same ticker loop as the new jobs
```

### Job 4: Reconciliation Scan (Existing — Extend)

```
Already implemented: wallet.ScanCorrectionTasks() at service.go:738-790
Extension: Add bonus balance drift detection (see doc 08)
Schedule: Every 3600 seconds (1 hour)
```

---

## Job Scheduler Implementation

```go
// New file: services/gateway/internal/jobs/scheduler.go

func StartScheduler(
    walletSvc *wallet.Service,
    bonusSvc  *bonus.Service,
    bus       *events.Bus,
) {
    // Bonus expiry: every 60s
    go func() {
        ticker := time.NewTicker(60 * time.Second)
        defer ticker.Stop()
        for range ticker.C {
            expired, err := bonusSvc.ExpireActiveBonuses(walletSvc)
            if err != nil {
                slog.Error("bonus expiry scan failed", "error", err)
            } else if expired > 0 {
                slog.Info("bonus expiry scan", "expired", expired)
            }
        }
    }()

    // Campaign auto-close: every 5 min
    go func() {
        ticker := time.NewTicker(5 * time.Minute)
        defer ticker.Stop()
        for range ticker.C {
            closed, _ := bonusSvc.CloseExpiredCampaigns()
            if closed > 0 {
                slog.Info("campaign auto-close", "closed", closed)
            }
        }
    }()

    // Reservation cleanup: every 2 min
    go func() {
        ticker := time.NewTicker(2 * time.Minute)
        defer ticker.Stop()
        for range ticker.C {
            n, _ := walletSvc.ExpireStaleReservations()
            if n > 0 {
                slog.Info("reservation cleanup", "expired", n)
            }
        }
    }()

    // Reconciliation: every hour
    go func() {
        ticker := time.NewTicker(1 * time.Hour)
        defer ticker.Stop()
        for range ticker.C {
            tasks, _ := walletSvc.ScanCorrectionTasks()
            if len(tasks) > 0 {
                slog.Warn("reconciliation found issues", "count", len(tasks))
            }
        }
    }()
}
```

---

## WebSocket Channel Additions

New channels added to existing hub at `gateway/internal/ws/`:

| Channel | Events | Subscriber |
|---|---|---|
| `bonus:{userId}` | bonus.granted, bonus.progress, bonus.completed, bonus.expired, bonus.forfeited | Player app |
| `content:global` | content.published, banner.changed | All connected clients |

Pattern: follows existing `wallets:{userId}` channel pattern in `ws/handler.go`.

---

## File Path References

1. `services/gateway/internal/ws/handler.go` — existing WebSocket hub
2. `services/gateway/internal/ws/hub.go` — broadcast pattern
3. `services/gateway/internal/wallet/service.go:225-244` — evictStaleIdempotencyKeys (ticker pattern)
4. `services/gateway/internal/wallet/service.go:650-666` — ExpireStaleReservations (job pattern)
5. `services/gateway/internal/wallet/service.go:738-790` — ScanCorrectionTasks (reconciliation)
6. `services/gateway/internal/loyalty/persist.go` — periodic save pattern
7. `services/gateway/internal/provider/runtime.go` — event replay engine
8. `modules/platform/canonical/v1/types.go` — existing event/entity types
9. `services/gateway/cmd/gateway/main.go` — service initialization (where scheduler starts)
10. `talon-backoffice/packages/app/app/lib/websocket/channels-data-handler/wallets-channel-handler.ts` — frontend WebSocket handler pattern
