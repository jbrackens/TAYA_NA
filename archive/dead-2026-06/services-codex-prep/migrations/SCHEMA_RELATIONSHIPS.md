# Phoenix Platform Schema Relationships & Diagrams

## Entity Relationship Diagram (Text Format)

```
┌─────────────────────────────────────────────────────────────────┐
│                     CORE USER ENTITIES                          │
└─────────────────────────────────────────────────────────────────┘

                            ┌─────────────┐
                            │   users     │
                            │─────────────│
                            │ id (PK)     │
                            │ email       │
                            │ username    │
                            │ password    │
                            │ kyc_status  │
                            │ role        │
                            └──────┬──────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
            ┌─────────────┐  ┌───────────┐  ┌──────────────┐
            │   wallets   │  │referral_  │  │notification_│
            │─────────────│  │codes      │  │log           │
            │ id (PK)     │  │─────────  │  │──────────────│
            │ user_id(FK) │  │id (PK)    │  │id (PK)       │
            │ balance     │  │user_id(FK)│  │user_id(FK)   │
            │ currency    │  │code       │  │template_id   │
            │ status      │  │max_uses   │  │channel       │
            └──────┬──────┘  └───────┬───┘  │status        │
                   │                 │      │sent_at       │
                   │                 │      └──────────────┘
                   ▼                 │
            ┌──────────────────┐    │
            │wallet_           │    │
            │transactions      │    │
            │──────────────────│    │
            │id (PK)           │    │
            │wallet_id(FK)     │    │
            │type              │    │
            │amount            │    │
            │balance_before    │    │
            │balance_after     │    │
            │reference         │    │
            │metadata (JSONB)  │    │
            └──────────────────┘    │
                                    ▼
                        ┌──────────────────────┐
                        │referral_             │
                        │relationships         │
                        │──────────────────────│
                        │id (PK)               │
                        │referrer_id(FK users) │
                        │referred_id(FK users) │
                        │code_id(FK)           │
                        │bonus_paid            │
                        └──────────┬───────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │referral_             │
                        │commissions           │
                        │──────────────────────│
                        │id (PK)               │
                        │relationship_id(FK)   │
                        │amount                │
                        │type                  │
                        │status                │
                        └──────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    BETTING ENTITIES                              │
└─────────────────────────────────────────────────────────────────┘

        ┌──────────────────┐
        │  events          │
        │──────────────────│
        │ id (PK)          │
        │ name             │
        │ sport            │
        │ league           │
        │ start_time       │
        │ status           │
        │ external_id      │
        │ metadata (JSONB) │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │  markets         │
        │──────────────────│
        │ id (PK)          │
        │ event_id(FK)     │
        │ name             │
        │ type             │
        │ status           │
        └────────┬─────────┘
                 │
                 ▼
        ┌──────────────────┐
        │  outcomes        │
        │──────────────────│
        │ id (PK)          │
        │ market_id(FK)    │
        │ name             │
        │ odds             │
        │ status           │
        │ result           │
        └──────────────────┘
             ▲
             │ (referenced by)
             │
        ┌────┴──────────────┐
        │                   │
        ▼                   ▼
    ┌──────────┐      ┌──────────────┐
    │ bets     │      │ bet_legs     │
    │──────────│      │──────────────│
    │ id (PK)  │      │ id (PK)      │
    │user_id(FK)──┐   │ bet_id(FK)   │
    │market_id    │   │ market_id(FK)│
    │outcome_id   │   │ outcome_id(FK)
    │stake        │   │ odds         │
    │odds_at_     │   │ status       │
    │placement    │   └──────────────┘
    │status       │
    │payout       │
    └──────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                ENGAGEMENT & RETENTION ENTITIES                   │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────────────┐
    │ achievements         │
    │──────────────────────│
    │ id (PK)              │
    │ name                 │
    │ description          │
    │ type                 │
    │ criteria (JSONB)     │
    │ reward_points        │
    │ icon_url             │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ user_achievements    │
    │──────────────────────│
    │ id (PK)              │
    │ user_id(FK)          │
    │ achievement_id(FK)   │
    │ progress             │
    │ completed_at         │
    │ reward_claimed       │
    └──────────────────────┘

    ┌──────────────────────┐
    │ leaderboards         │
    │──────────────────────│
    │ id (PK)              │
    │ name                 │
    │ type                 │
    │ period               │
    │ start_date           │
    │ end_date             │
    │ is_active            │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ leaderboard_entries  │
    │──────────────────────│
    │ id (PK)              │
    │ leaderboard_id(FK)   │
    │ user_id(FK)          │
    │ score                │
    │ rank                 │
    └──────────────────────┘

    ┌──────────────────────┐
    │ campaigns            │
    │──────────────────────│
    │ id (PK)              │
    │ name                 │
    │ type                 │
    │ start_date           │
    │ end_date             │
    │ targeting_rules(JSONB)
    │ reward_config(JSONB) │
    │ status               │
    └──────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                AUDIT & LOGGING ENTITIES                          │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────────────────────┐
    │ notification_templates   │
    │──────────────────────────│
    │ id (PK)                  │
    │ type                     │
    │ channel                  │
    │ subject_template         │
    │ body_template            │
    │ is_active                │
    └────────────┬─────────────┘
                 │
                 │ referenced by
                 ▼
    ┌──────────────────────────┐
    │ notification_log         │
    │──────────────────────────│
    │ (see above)              │
    └──────────────────────────┘

    ┌──────────────────────────┐
    │ audit_log (partitioned)  │
    │──────────────────────────│
    │ id (PK)                  │
    │ user_id(FK)              │
    │ action                   │
    │ entity_type              │
    │ entity_id                │
    │ old_value(JSONB)         │
    │ new_value(JSONB)         │
    │ ip_address               │
    │ created_at (partition)   │
    └──────────────────────────┘
    Partitions: audit_log_2026_01 through audit_log_2026_12
```

## Detailed Relationship Descriptions

### User → Wallet → Transactions
**One-to-One-to-Many Relationship**

```
User (1) ──────→ Wallet (1) ──────→ Transaction (N)
   id              user_id             wallet_id
                   balance             type
                                       amount
                                       timestamp
```

**Use Case:** Tracking all financial activities for a user
- User creates account
- System creates wallet with balance
- Each bet/deposit/withdrawal creates transaction entry
- Transactions referenced by bet_id or external reference

**Queries:**
```sql
-- Get user's total balance
SELECT u.email, w.balance, w.currency
FROM users u
JOIN wallets w ON u.id = w.user_id
WHERE u.id = ?;

-- Get user's recent transactions
SELECT wt.type, wt.amount, wt.created_at
FROM wallet_transactions wt
WHERE wt.wallet_id = (SELECT id FROM wallets WHERE user_id = ?)
ORDER BY wt.created_at DESC LIMIT 50;
```

### User → Referral Network
**Many-to-Many Self-Referential Relationship**

```
User (referrer) (1) ──→ Referral Relationship ←── (1) User (referred)
                              │
                              └─→ Referral Code (1)
                              │
                              └─→ Commission (N)
```

**Use Case:** Tracking referral rewards and bonus structures
- User generates referral code
- Other users sign up using code
- System tracks relationship and calculates commissions
- Commissions marked as pending/paid

**Queries:**
```sql
-- Get all referrals for a user
SELECT u2.email, rr.bonus_paid, rr.created_at
FROM referral_relationships rr
JOIN users u2 ON rr.referred_id = u2.id
WHERE rr.referrer_id = ?
ORDER BY rr.created_at DESC;

-- Get pending commissions
SELECT rc.amount, rc.type, rc.status
FROM referral_commissions rc
WHERE rc.referral_relationship_id IN (
    SELECT id FROM referral_relationships WHERE referrer_id = ?
)
AND rc.status = 'pending';
```

### Event → Market → Outcome → Bet
**Hierarchical One-to-Many Relationship**

```
Event (1) ──→ Market (N) ──→ Outcome (N)
                                │
                                └─→ Bet (N) ←─ User
                                │
                                └─→ Bet Leg (part of parlay)
```

**Use Case:** Complex sports betting with multiple outcomes
- Event (e.g., "Manchester vs Liverpool")
- Market (e.g., "Match Winner")
- Outcomes (e.g., "Home Win", "Draw", "Away Win")
- User places bets on specific outcomes
- Parlay bets link multiple legs

**Queries:**
```sql
-- Get all markets for an event
SELECT m.name, m.type, m.status
FROM markets m
WHERE m.event_id = ? AND m.status = 'open';

-- Get available outcomes for a market with odds
SELECT o.id, o.name, o.odds, o.result
FROM outcomes o
WHERE o.market_id = ? AND o.status = 'active';

-- Get user's bets on an event
SELECT b.id, b.stake, b.odds_at_placement, b.status
FROM bets b
WHERE b.outcome_id IN (
    SELECT o.id FROM outcomes o
    JOIN markets m ON o.market_id = m.id
    WHERE m.event_id = ?
)
AND b.user_id = ?;
```

### User → Achievement → Leaderboard
**Diamond Relationship (Convergence)**

```
User (N) ──→ Achievement (1)
   │              │
   └─→ User Achievement ←─┘
         │
         └─→ Leaderboard Entry ←─ Leaderboard (1)
```

**Use Case:** Engagement tracking and competition
- System defines achievements with criteria
- Users progress toward achievements
- Leaderboards aggregate scores/ranks by period
- Campaigns reward top performers

**Queries:**
```sql
-- Check user achievement progress
SELECT ua.achievement_id, a.name, ua.progress, ua.completed_at
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
WHERE ua.user_id = ?
ORDER BY ua.completed_at DESC;

-- Get top 10 users in leaderboard
SELECT lb.name, le.rank, u.username, le.score
FROM leaderboard_entries le
JOIN leaderboards lb ON le.leaderboard_id = lb.id
JOIN users u ON le.user_id = u.id
WHERE lb.id = ?
ORDER BY le.rank LIMIT 10;
```

## Cardinality Summary

| Relationship | Type | Notes |
|---|---|---|
| User → Wallet | 1:1 | One active wallet per user per currency |
| Wallet → Transaction | 1:N | Multiple transactions per wallet |
| User → Referrer | 1:N | One user can refer many |
| User → Referred | 1:N | One user can be referred by many (but tracks original) |
| Referral Code → Relationship | 1:N | One code generates multiple relationships |
| Event → Market | 1:N | One event has multiple markets |
| Market → Outcome | 1:N | One market has multiple outcomes |
| Bet → Outcome | N:1 | Many bets on one outcome |
| Bet → Bet Leg | 1:N | Parlay bets have multiple legs |
| User → Bet | 1:N | User places multiple bets |
| Achievement → User Achievement | 1:N | Many users pursuing one achievement |
| Leaderboard → Entry | 1:N | One leaderboard has many entries |
| User → Notification Log | 1:N | User receives multiple notifications |
| Audit Log → Entity | N:1 | Many audit entries for one entity |

## Cascading Delete Implications

### ON DELETE CASCADE
Tables removed when parent deleted:

```
User Deleted
  → Wallets deleted
     → Wallet Transactions deleted
  → Bets deleted
     → Bet Legs deleted
  → Referral Relationships (as referred_id) deleted
     → Referral Commissions deleted
  → User Achievements deleted
  → Leaderboard Entries deleted
  → Notification Log entries deleted
  → Audit Log entries deleted
```

### ON DELETE RESTRICT
Operations prevented if dependencies exist:

```
Cannot delete User if:
  → Active Referral Relationships as referrer_id
     (Referrals must be preserved for historical integrity)
```

### ON DELETE SET NULL
Reference cleared when parent deleted:

```
If Referral Code deleted:
  → Referral Relationships.code_id set to NULL
     (Relationship preserved, just code association lost)

If Outcome deleted:
  → Bet.outcome_id set to NULL
     (Bet preserved, outcome association lost)
```

## Index Strategy by Query Pattern

### User Authentication
```sql
-- Email lookup (login)
INDEX: users(email)

-- Username lookup (account recovery)
INDEX: users(username)
```

### Financial Analysis
```sql
-- User wallet balance
INDEX: wallets(user_id)

-- Transaction history by type
INDEX: wallet_transactions(wallet_id, type, created_at DESC)

-- Aggregations by date
INDEX: wallet_transactions(created_at DESC)
```

### Betting Operations
```sql
-- Find unsettled bets
INDEX: bets(user_id, status)

-- Market settlement
INDEX: bets(market_id, status)
INDEX: bet_legs(market_id, status)

-- User's open bets
INDEX: bets(user_id, status) INCLUDE (created_at)
```

### Leaderboard Queries
```sql
-- Top N ranking (most expensive)
INDEX: leaderboard_entries(leaderboard_id, rank)
INDEX: leaderboard_entries(leaderboard_id, score DESC)

-- User's current position
INDEX: leaderboard_entries(leaderboard_id, user_id)
```

### Audit & Compliance
```sql
-- User action history
INDEX: audit_log(user_id, created_at DESC)

-- Entity change history
INDEX: audit_log(entity_type, entity_id)

-- Temporal queries (partition pruning)
INDEX: audit_log(created_at DESC)
```

## Data Flow Diagrams

### Bet Placement Flow
```
User (authenticated)
  ↓
[GET /events] → Events service
  ↓
[Display markets & odds]
  ↓
[POST /bets] → Betting service
  ↓
[Validate:
  - Event status = 'live' or 'scheduled'
  - Market status = 'open'
  - Outcome available
  - User wallet balance ≥ stake
]
  ↓
[INSERT bet record]
  ↓
[Debit wallet: stake amount]
  ↓
[INSERT wallet_transaction: 'bet_place']
  ↓
[Publish bet.placed event → Kafka]
  ↓
[Return bet confirmation]
```

### Wallet Transaction Flow
```
External system / User action
  ↓
[POST /wallet/transfer] → Wallet service
  ↓
[Validate:
  - Source wallet exists
  - Sufficient balance
  - Destination wallet exists
]
  ↓
[BEGIN TRANSACTION]
  ↓
[Debit source: UPDATE wallet SET balance = balance - amount]
  ↓
[Insert source transaction]
  ↓
[Credit destination: UPDATE wallet SET balance = balance + amount]
  ↓
[Insert destination transaction]
  ↓
[COMMIT]
  ↓
[INSERT audit_log: transfer details]
  ↓
[Publish wallet.updated event → Kafka]
```

### Referral Commission Flow
```
New user signup with referral code
  ↓
[Validate code exists, not expired, has uses left]
  ↓
[Create user record]
  ↓
[Create referral_relationship:
  referrer_id = code owner
  referred_id = new user
  code_id = code used
]
  ↓
[Calculate commission amount based on rules]
  ↓
[INSERT referral_commission: status='pending']
  ↓
[Schedule async job for commission payout]
  ↓
[Async job periodically:
  - Calculate total pending commissions per user
  - Credit wallet with commission amount
  - UPDATE commission status='paid'
  - INSERT wallet_transaction: 'referral_reward'
  - INSERT audit_log: commission paid
]
```

## Performance Optimization Paths

### High-Volume Tables
1. **wallet_transactions** - Expected 100M+ rows for large platforms
   - Already indexed on wallet_id, type, created_at
   - Consider partitioning by user_id for sharding
   - Archive old transactions to separate schema

2. **bets** - Expected 10M+ rows
   - Indexed on user_id, status for user queries
   - Indexed on market_id for settlement
   - Consider materialized views for historical aggregations

3. **audit_log** - Expected 1B+ rows annually
   - Already partitioned monthly
   - Archive partitions > 2 years old
   - Use partition pruning for date-range queries

### Query Optimization Examples

**Slow Query (without indexes):**
```sql
SELECT u.email, COUNT(b.id) as bet_count
FROM users u
LEFT JOIN bets b ON u.id = b.user_id
WHERE b.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.id;
```

**Optimized (with indexes):**
```sql
-- Create: INDEX bets_user_created ON bets(user_id, created_at DESC)
-- Then query uses index scan instead of seq scan

SELECT u.email, COUNT(b.id) as bet_count
FROM users u
LEFT JOIN bets b ON u.id = b.user_id
  AND b.created_at > NOW() - INTERVAL '7 days'
GROUP BY u.id;
```

---

**Version:** 1.0
**Last Updated:** 2026-03-07
**Database Version:** PostgreSQL 12+
