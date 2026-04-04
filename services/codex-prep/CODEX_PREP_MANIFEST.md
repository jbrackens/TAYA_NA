# Codex Prep Manifest — Phase 4 Source Code Extraction
**Generated**: 2026-03-07
**Purpose**: Pre-extracted business logic ready for Codex to consume when translating Phase 4 → Go microservices

---

## Extraction Files

| File | Lines | Size | Contents |
|------|-------|------|----------|
| `stella_extraction.md` | 1,107 | 30 KB | 13 Scala/Flink repos: API routes, Kafka topics, data models, Slick queries, Akka actors |
| `stella_translation_quick_ref.md` | ~786 | 22 KB | Side-by-side Scala→Go code patterns for 7 key patterns |
| `rmx_wallet_extraction.md` | 2,087 | 47 KB | 11 Python repos: Django models, API endpoints, Kafka events, wallet logic |
| `rmx_wallet_extraction_index.md` | ~452 | 11 KB | Quick navigation index for RMX extraction |
| `storm_gstech_extraction.md` | 1,218 | 34 KB | Java Storm topologies, GSTech Node.js platform, Fantasy Football |
| `STELLA_README.md` | - | 11 KB | Stella navigation index and 10-week translation plan |
| `EXTRACTION_SUMMARY.txt` | - | 16 KB | Executive summary with key statistics |
| **Total** | **~5,650** | **~171 KB** | |

---

## Phase 4 Repo → Target Go Microservice Mapping

### phoenix-market-engine (Go)
**Purpose**: Event/market catalog, odds, scheduling
**Source repos**:
| Repo | Group | Language | Key Logic |
|------|-------|----------|-----------|
| gmx-predictor-game | 01_Stella | Scala (117 files) | Prediction markets, leaderboard calculation, Play controllers |
| event_analysis | 04_Idefix | Python (8 files) | Event analysis algorithms |

### phoenix-betting-engine (Go)
**Purpose**: Bet placement, settlement, risk
**Source repos**:
| Repo | Group | Language | Key Logic |
|------|-------|----------|-----------|
| argyll-bet-stake-to-rmx-points-calculator-api | 02_RMX | Python (19 files) | Bet models: Single/Double/Treble/MultiFold/System, stake→points |
| sbtech-rewards-point-calculator | 02_RMX | Python (43 files) | SBTech points from bets, deposits, logins; OAuth2 flow |
| flip-storm-topologies | 07_Flip | Java (1058 files) | Real-time leaderboard aggregation, event state machine, Kafka streams |

### phoenix-wallet (Go)
**Purpose**: Balances, transactions, ledger
**Source repos**:
| Repo | Group | Language | Key Logic |
|------|-------|----------|-----------|
| eeg-waysun-wallet | 01_Stella | Scala (79 files) | Transaction models with BigDecimal precision, Slick repos, Kafka WALLET_NEW_LINE |
| rmx-wallet-service | 02_RMX | Python (79 files) | Django wallet, signal_handlers on balance change, Kafka publishing |
| gmx-wallet-service | 02_RMX | Python (84 files) | GMX variant wallet, same Kafka topic pattern |
| aws-wallet-data | Standalone | Python (18 files) | Wallet data exports |
| fs-wallet-product | Standalone | Python (18 files) | Wallet product catalog |

### phoenix-user (Go)
**Purpose**: Auth, profiles, preferences, KYC
**Source repos**:
| Repo | Group | Language | Key Logic |
|------|-------|----------|-----------|
| eeg-waysun-user-context | 01_Stella | Scala (37 files) | User session management via Akka actors, project-scoped contexts |
| gmx-waysun-user-context | 01_Stella | Python (29 files) | FastAPI parallel impl, same Kafka topics |

### phoenix-retention (Go)
**Purpose**: Rewards, loyalty, referrals, achievements, gamification
**Source repos**:
| Repo | Group | Language | Key Logic |
|------|-------|----------|-----------|
| eeg-waysun-achievement | 01_Stella | Scala (48 files) | Achievement event querying with Redis caching, Tapir endpoints |
| gmx-waysun-event-achievement | 01_Stella | Scala (76 files) | Flink: real-time achievement detection from aggregated events |
| gmx-waysun-rule-configurator | 01_Stella | Scala (95 files) | 42 CRUD endpoints for rules and configurations, Kafka publishing |
| rmx-pc-service | 02_RMX | Python (167 files) | Points calculation state machine, multi-service orchestration hub |
| rmx-referral-microservice | 02_RMX | Python (85 files) | Referral tree, multi-tier commission, Avro schemas |
| reward-matrix | 02_RMX | JS (81 files) | AngularJS portal for reward management |
| gmx-data-api-reward-point | 01_Stella | Scala (4 files) | Avro schemas for bets, deposits, logins, wallet transactions |
| gmx-microservice-virtual-shop | 01_Stella | Python (96 files) | Product catalog, purchases, 41+ migrations |
| gmx-waysun-virtual-store | 01_Stella | Python (115 files) | Enhanced store with real-time Kafka events |
| woocommerce-rewards-matrix-gateway | 02_RMX | PHP (7 files) | WooCommerce payment gateway integration |

### phoenix-events (Go)
**Purpose**: Event ingestion, validation, streaming pipeline
**Source repos**:
| Repo | Group | Language | Key Logic |
|------|-------|----------|-----------|
| gmx-waysun-event-ingestor | 01_Stella | Scala (39 files) | Flink: HTTP ingestion → Kafka producer, schema routing |
| gmx-waysun-event-validator | 01_Stella | Scala (53 files) | Flink: schema validation + business rule checks |
| gmx-waysun-event-aggregator | 01_Stella | Scala (95 files) | Flink: time-windowed aggregation → leaderboard + achievements |
| gmx-streaming-connectors | 01_Stella | (config) | Kafka connector framework bridging external sources |
| gmx-streaming-notificator | 01_Stella | (config) | Notification publishing for achievement/leaderboard events |

### phoenix-social (Go)
**Purpose**: Profiles, follow graph, activity feed, direct messaging
**Source repos**:
| Repo | Group | Language | Key Logic |
|------|-------|----------|-----------|
| eeg-waysun-leaderboard | 01_Stella | Scala (67 files) | Ranking operations, Play controllers, Slick queries |
| bob-leaderboards | 07_Flip | Python (2 files) | Simple leaderboard logic |
| flip-storm-topologies | 07_Flip | Java (1058 files) | SUM/MIN/MAX aggregation, event state machine |
| gg-comp-api | 03_ggCircuit | PHP (9 files) | Competition API |
| gg-comp-ui | 03_ggCircuit | TypeScript (66 files) | Competition frontend |

### stella-engagement (Go — ported from Scala/Flink)
**Purpose**: Real-time event processing, achievements, engagement — ported to Go with Kafka consumers + goroutine pipelines + Redis
**Source repos**:
| Repo | Group | Language | Notes |
|------|-------|----------|-------|
| gmx-waysun-common | 01_Stella | Scala (68 files) | Shared library: common-core, common-kafka, common-http, common-models |
| gmx-waysun-data-api | 01_Stella | Scala (5 files) | Avro schema registry for all event types |

### phoenix-cms (Go)
**Purpose**: Content management, brand serving
**Source repos**:
| Repo | Group | Language | Key Logic |
|------|-------|----------|-----------|
| sn-affiliate-cms | 08_SportNation | JS (30 files) | Strapi headless CMS, content types, routes |
| brandserver-backend | 04_Idefix | JS (224 files) | Brand-specific content/styling, multi-brand support |
| brandserver-lambda | 04_Idefix | JS (1 file) | Lambda for brand content delivery |
| gstech-backoffice | 04_Idefix | TS/React (549 files) | Full backoffice admin |
| gstech-campaignserver-client | 04_Idefix | TS/React (373 files) | Campaign management SDK |
| gstech | 04_Idefix | JS (1729 files) | Main GSTech platform: wallet routes, game providers, campaign engine |

### phoenix-notification (Go)
**Purpose**: Push, email, SMS, in-app
**Source repos**:
| Repo | Group | Language | Key Logic |
|------|-------|----------|-----------|
| gmx-streaming-notificator | 01_Stella | (config) | Kafka consumer → notification dispatch |
| ggEmailTemplates | 03_ggCircuit | (templates) | Email template patterns |
| bob-emails | Standalone | (templates) | Email templates |

### phoenix-analytics (Go)
**Purpose**: Tracking, attribution, reporting
**Source repos**:
| Repo | Group | Language | Key Logic |
|------|-------|----------|-----------|
| afftracker | Standalone | JS (66 files) | Affiliate tracking |
| gmx-common-partners | Standalone | Java (17 files) | Partner integration |
| argyll-partners | Standalone | JS (1 file) | Partner config |

### phoenix-compliance (Go)
**Purpose**: DGE regulatory, responsible gaming, AML
**Source repos**: Primarily Build New from Phoenix core + DGE documentation. Limited Phase 4 source.

### phoenix-settlement (Go)
**Purpose**: Payout processing, reconciliation
**Source repos**: Primarily Build New. Wallet services above provide financial primitives.

### phoenix-gateway (Go)
**Purpose**: API gateway, routing, rate limiting
**Source repos**: Already exists in PhoenixBotRevival as Go strangler-pattern gateway. Phase 4 has limited gateway source.

---

## Repos NOT Mapped to Target Microservices (Lower Priority)

| Repo | Group | Language | Reason |
|------|-------|----------|--------|
| 10_Argyll-Video (3 repos) | 09_Argyll | Python/JS | Video management — defer or external service |
| 05_EGL-Esports (5 repos) | 05_EGL | PHP/TS | Esports platform — evaluate for social features later |
| 06_Fantasy-Football (5 repos) | 06_Fantasy | Python/JS/Ionic | Legacy game — archive algorithms only |
| 03_ggCircuit UI repos (10 repos) | 03_ggCircuit | TypeScript/Angular | Angular frontends — not needed for Go backend translation |
| 13_WordPress (8+ repos) | Standalone | PHP | WordPress — sunset per Strapi strategy |
| Various offers/landing repos | Multiple | JS | Marketing pages — not backend logic |

---

## How Codex Should Use This

1. **Start with extraction docs** — Read `stella_extraction.md`, `rmx_wallet_extraction.md`, `storm_gstech_extraction.md` before touching source code
2. **Use the mapping above** — Know exactly which Phase 4 repos feed each target microservice
3. **Reference translation patterns** — `stella_translation_quick_ref.md` has side-by-side Scala→Go examples
4. **Follow build order from Document 7** — Phase 1: Gateway → Phase 2: User + Wallet → Phase 3: Market + Betting → etc.
5. **Use Go scaffolds** — Pre-generated project structure in `phoenix-services/` (see below)
