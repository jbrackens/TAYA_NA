# Phoenix Prediction Platform Strategy

## Objective
Transform Phoenix from a sportsbook-centric platform into a **bot-first prediction market exchange** focused on:
- Crypto prices
- Sports events
- Stock prices

The primary user is an autonomous agent. Human web and mobile users remain supported but are secondary in product and architecture priorities.

## Product Strategy

### 1) Bot-First By Default
- Stable, versioned APIs are the main product surface.
- Web UI is a reference client over the same APIs used by bots.
- Market, order, and settlement behavior must be deterministic and machine-parseable.

### 2) Objective Outcomes Only
- All markets must resolve from pre-declared, objective data sources.
- No subjective/cultural markets.
- Market specs must embed settlement source, timestamp, and fallback policy at creation time.

### 3) Automated Market Factory
- No manual market ops as default path.
- Feed-driven templates generate markets continuously.
- Guardrails enforce liquidity, exposure, and duplicate-market prevention.

## Target Platform Architecture

### Core Domains
- `market-catalog`: market discovery, schemas, lifecycle state.
- `market-factory`: automated market generation from feed triggers.
- `trading-engine`: order intake, matching, cancellations, fills.
- `risk-engine`: exposure limits, account and market guardrails.
- `settlement-engine`: outcome ingestion, finalization, payouts.
- `bot-gateway`: low-latency API + streaming endpoints + auth scopes.
- `human-gateway`: web/mobile API facade (same backend contracts).

### Data and Messaging
- Event backbone for all state transitions (`market.created`, `order.filled`, `market.resolved`).
- Append-only ledger for auditability and replay.
- Materialized read views for fast bot queries (books, positions, PnL, status).

### Recommended Stack Direction (2026-ready)
- Services: TypeScript/Node or Go for matching/risk hot paths.
- Async pipelines: Kafka/Redpanda or managed pub/sub equivalent.
- Storage:
  - Postgres for core transactional records
  - Redis for short-lived low-latency views
  - Object storage for logs, snapshots, replay artifacts
- API:
  - REST for control-plane operations
  - WebSocket or gRPC streams for market data and execution events

## Market Automation Framework

## Market Source Integrations
- Crypto: exchange index/price feeds.
- Sports: official results/statistical feeds.
- Stocks: trusted consolidated price feeds/end-of-period references.

### Market Templates
- Price bands: `Will BTC > X at T?`
- Time-window outcomes: `Will Team A win Match M?`
- Range outcomes: `Will SPY close in [A,B) on date D?`

### Creation Pipeline
1. Ingest source context (price/events/schedules).
2. Normalize and validate source payloads.
3. Apply template rules and create candidate markets.
4. Run risk and duplication checks.
5. Publish approved markets automatically.

### Resolution Pipeline
1. Pull canonical settlement values at defined cutoff.
2. Validate against source signature/rules.
3. Resolve market outcome deterministically.
4. Trigger payout workflow and publish settlement events.

## Bot-Native Execution Model

### API Requirements
- Idempotent order submission
- Sequence-numbered event streams
- Strict rate limit tiers for high-frequency agents
- Deterministic error codes and retry semantics

### Bot Identity and Trust
- API keys with scoped permissions
- Optional signed requests with replay protection
- Behavior scoring and adaptive risk throttles

### Developer Experience
- Sandbox environment with synthetic markets
- Reproducible historical replay feed for strategy backtesting
- SDKs for Python/TypeScript/Go

## Economic and Risk Design

### Liquidity Bootstrap
- Seed bot market makers for target spreads.
- Incentive program tied to quoting quality and uptime.
- Volatility-aware spread rails by market type.

### Exposure Controls
- Per-market and per-account notional caps.
- Dynamic halts on feed integrity anomalies.
- Circuit breakers for abnormal pricing moves.

### Integrity Controls
- Immutable event logs
- Full market lifecycle audit trail
- Real-time monitoring for quote stuffing, latency abuse, wash behavior

## Compliance and Jurisdiction Envelope

This platform touches regulated territory. Before production launch:
- Define legal structure and jurisdiction strategy for prediction products.
- Map each market type to applicable regulatory obligations.
- Embed KYC/AML, sanctions, and transaction monitoring where required.
- Build geofencing and market-availability policy at gateway level.

## Migration Plan From Current Phoenix

### Phase 0: Stabilize Existing Assets (2-4 weeks)
- Freeze legacy sportsbook expansion.
- Isolate reusable services (accounts, wallet, auth, risk primitives, back office).
- Remove hard dependencies on dead legacy environments.

### Phase 1: Build Prediction Core (6-10 weeks)
- Implement market-catalog, market-factory, settlement-engine.
- Create feed adapters for crypto, sports, and stocks.
- Stand up bot-gateway with streaming.

### Phase 2: Launch Bot Alpha (4-6 weeks)
- Release sandbox + API docs + SDK alpha.
- Onboard 3-5 pilot bots (market making + directional agents).
- Run synthetic and then limited real markets.

### Phase 3: Human Secondary Experience (4-8 weeks)
- Ship minimal human client for discovery, trading, positions, and settlement history.
- Keep parity with bot APIs; no UI-only business logic.

### Phase 4: Scale and Reliability (ongoing)
- Multi-region event replication
- Replay-based disaster recovery
- SLOs on execution latency, settlement time, and stream correctness

## What To Reuse From Current Codebase

Potentially reusable:
- Account/wallet primitives
- Existing risk limit concepts
- Back-office workflows (Talon) for operations and support
- Eventing/integration patterns from surviving bridge components

Likely rewrite:
- Sportsbook-specific market modeling
- Legacy scraper-dependent ingestion
- Environment-coupled infra scripts

## First 30-Day Execution Checklist

1. Define canonical `MarketSpec` and `SettlementSpec` schemas.
2. Stand up one end-to-end automated market vertical (crypto only).
3. Implement deterministic resolution + payout on that vertical.
4. Expose bot APIs for market discovery, orders, fills, and positions.
5. Add replay test harness for one week of historical synthetic traffic.
6. Document operational runbooks for feed outage and bad-settlement scenarios.

## North-Star KPIs
- Bot onboarding time (key issuance to first fill)
- API success latency p95/p99
- Market creation automation rate
- Market resolution automation rate
- Spread quality and book depth per market class
- Settlement correctness and dispute rate

## Final Position
Phoenix should not be a sportsbook with prediction add-ons.  
Phoenix should be a **bot-native prediction market platform** where objective, automated market creation and deterministic settlement are the core product.
