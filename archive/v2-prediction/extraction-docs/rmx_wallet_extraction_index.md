# RMX & Stella Platform Translation Reference - Index

**Main Document:** `/sessions/busy-happy-mccarthy/rmx_wallet_extraction.md`  
**Size:** 2,087 lines  
**Format:** Markdown  
**Purpose:** Complete business logic extraction for Python → Go translation

---

## Quick Navigation

### By Repository

#### RMX Rewards Platform
- **[rmx-pc-service](#rmx-pc-service)** - Points/Credits calculation engine (167 files)
- **[rmx-wallet-service](#rmx-wallet-service)** - Wallet and transaction management (79 files)
- **[rmx-pc-service-tini](#rmx-pc-service-tini)** - Lightweight PC service (137 files)
- **[gmx-wallet-service](#gmx-wallet-service)** - GMX wallet variant (84 files)
- **[rmx-referral-microservice](#rmx-referral-microservice)** - Referral management (85 files)
- **[rmx-cs-admin](#rmx-cs-admin)** - Admin & CS tools (49 files)
- **[sbtech-rewards-point-calculator](#sbtech-rewards-point-calculator)** - Points calculator (43 files)
- **[argyll-bet-stake-to-rmx-points-calculator-api](#argyll-bet-stake) ** - Bet stake conversion (19 files)

#### Stella Waysun Platform
- **[gmx-microservice-virtual-shop](#gmx-microservice-virtual-shop)** - Shop API (96 files)
- **[gmx-waysun-virtual-store](#gmx-waysun-virtual-store)** - Enhanced store (115 files)
- **[gmx-waysun-user-context](#gmx-waysun-user-context)** - User context (29 files)

### By Topic

#### API & Routing
- Detailed API endpoint mappings for all services
- Django URL patterns with regex
- HTTP method specifications
- View class implementations
- Request/response structures

#### Data Models
- 50+ Django ORM model definitions
- Database schema patterns
- Relationships and constraints
- Migration strategy

#### Authentication & Authorization
- OIDC/OAuth2 integration
- Bearer token patterns
- Service-to-service authentication
- Token exchange flows

#### Messaging
- Kafka event publishing
- Event types and payloads
- Producer implementation (KafkaService)
- Consumer patterns
- Event-driven workflows

#### Business Logic
- Wallet balance calculations
- Referral tree management
- Commission computation
- Points calculation
- Virtual shop integration
- Payment processing

#### Configuration
- 20+ environment variables per service
- Database connection settings
- Cache configuration
- Logging setup
- Kafka broker configuration

#### Deployment
- Docker containerization
- Database migrations
- Environment-based config
- Health checks

---

## Document Sections

### Section 1: Introduction
- Purpose and scope
- Target audience (Codex AI for Go translation)
- Document generation date

### Section 2: RMX Rewards Platform Details

#### 2.1 rmx-wallet-service
- API endpoint table (8 main endpoints)
- Database models (5 core models)
- Services and utilities
- Business logic breakdown
- Environment variables (20+)
- Migration history

#### 2.2 rmx-referral-microservice
- Referral API endpoints (5)
- Referral tree management
- Event processing
- Bonus calculation
- 23 database migrations

#### 2.3 gmx-wallet-service
- Parallel GMX implementation
- Model parity with rmx-wallet
- 16 database migrations

#### 2.4 rmx-pc-service
- 167 Python files
- Multiple processing modules:
  - process_free_bets_and_spins
  - process_virtual_shop_to_cameleon
  - new_process_free_bets_and_spins
  - common_process (state machine)
  - reports (analytics)
- Process workflow diagram
- State machine patterns

#### 2.5 rmx-pc-service-tini
- Lightweight variant
- Same models as rmx-pc-service

#### 2.6 rmx-cs-admin
- Admin panel backend
- Partner configuration
- 1 database migration

#### 2.7 sbtech-rewards-point-calculator
- SBTech integration
- Points calculation logic
- Environment-based configuration

#### 2.8 argyll-bet-stake-to-rmx-points-calculator-api
- Bet stake conversion API
- Minimal service (19 files)

### Section 3: Detailed API Mappings

**Key Sections:**
- rmx-referral-microservice complete URL map
- rmx-pc-service main routing structure
- Kafka event architecture
- Event publishing patterns
- Event types
- Producer implementation
- Consumer architecture

### Section 4: Authentication & Token Exchange
- OIDC configuration
- Token exchange flows (3 types)
- Bearer authorization class
- Service-to-service auth

### Section 5: Process Management Architecture
- State machine pattern
- ProcessModel lifecycle
- ProcessStepModel execution
- ProcessLogModel audit trail
- ProcessKeyStorageModel state management
- Process execution flow diagram

### Section 6: Virtual Shop Integration
- Product models
- Shop processing workflow
- Cameleon system integration
- Real-time synchronization

### Section 7: Commission Calculation
- CommissionConfig model
- Calculation flow
- Multi-tier support
- Silent charge (BPR) implementation
- Chaney payment integration

### Section 8: Stella Waysun Platform

#### 8.1 gmx-microservice-virtual-shop
- 21 API endpoints (detailed table)
- 14 view classes
- Product management
- Payment integration
- Admin functions

#### 8.2 gmx-waysun-virtual-store
- Payment gateway API
- Inventory management
- Event streaming (WebSocket)
- Store configuration

#### 8.3 gmx-waysun-user-context
- Session management
- User profiles
- Feature flags
- Context propagation
- Session lifecycle diagram

### Section 9: Cross-Cutting Concerns
- Authentication patterns
- Messaging patterns
- Database ORM patterns
- Schema evolution
- Configuration management
- Inter-service communication
- Concurrency patterns
- Error handling

### Section 10: Go Translation Strategy

#### 10.1 Repository Structure
- Recommended directory layout
- Package organization
- File structure example

#### 10.2 Key Go Dependencies
- Web framework (Echo/Chi)
- Database ORM (GORM)
- Kafka (segmentio/kafka-go)
- Auth (coreos/go-oidc)
- Config (viper)
- Migrations (golang-migrate)

#### 10.3 API Handler Translation
- Django views → Go handlers
- Complete code examples
- ListWallets handler
- CreateWallet handler

#### 10.4 Business Logic Translation
- Signals → Callbacks pattern
- Complete code examples
- Event publishing
- Side effect handling

#### 10.5 Database Repository Pattern
- GORM repository pattern
- Query translation examples
- Aggregation queries
- Relationship handling
- Get single record
- List with filters
- Aggregation queries
- Related objects

#### 10.6 Concurrency & Async Processing
- Goroutines vs Celery
- Channel-based task queues
- Worker pool pattern
- Complete code example

#### 10.7 Testing Strategy
- Unit test pattern
- Integration test pattern
- Mock patterns

#### 10.8 Deployment & Configuration
- Docker multi-stage build
- Environment configuration
- Viper configuration loading

#### 10.9 Error Handling
- Custom error types
- Validation errors
- Service errors
- Error propagation

#### 10.10 Performance Optimization
- Connection pooling
- Caching strategies
- Batch operations
- Index optimization

#### 10.11 Monitoring & Observability
- Structured logging (zerolog)
- Prometheus metrics
- Performance tracking

#### 10.12 Python to Go Mapping Table
- Quick reference guide (10+ mappings)

---

## Key Statistics

### Code Volume
- Total Python files analyzed: 903
- RMX platform: 663 files
- Stella platform: 240 files

### Database Models
- 50+ Django ORM models identified
- Standard UUID primary keys
- Timestamp tracking on all models
- Foreign key relationships
- Many-to-many relationships

### API Endpoints
- 100+ REST endpoints
- 5-20 endpoints per service
- RESTful patterns
- Query parameters
- Path parameters

### Kafka Topics
- 5 event types identified
- Structured event payloads
- Singleton producer pattern
- Event-driven consumers

### Authentication Patterns
- OIDC/OAuth2
- Bearer tokens
- Service-to-service auth
- Token exchange flows

### Configuration
- 20-25 environment variables per service
- Database (RDS)
- Caching (Redis)
- Message broker (Kafka)
- Authentication (OIDC)

### Database Migrations
- 13+ migrations per service
- Backward compatible
- Schema evolution tracked
- Data migration support

---

## Usage Guide for Go Translation

### For Code Generation (Codex)

1. **Start with Repository Structure** (Section 10.1)
   - Create Go project layout
   - Set up package organization

2. **Map Models** (Section 10.5)
   - Read Django models
   - Generate GORM structs
   - Set up database layer

3. **Map Handlers** (Section 10.3)
   - Read Django views
   - Generate Echo handlers
   - Implement HTTP routing

4. **Map Services** (Section 10.4)
   - Read business logic
   - Convert to Go services
   - Implement callbacks instead of signals

5. **Setup Messaging** (Section 3)
   - Implement Kafka producer
   - Define event types
   - Set up consumer listeners

6. **Configuration** (Section 10.8)
   - Create viper config
   - Load environment variables
   - Set up connection pools

7. **Testing** (Section 10.7)
   - Write unit tests
   - Write integration tests
   - Mock databases

### For Architecture Understanding

1. **Start with services overview** (RMX/Stella sections)
2. **Understand data flow** (Cross-cutting concerns)
3. **Review authentication** (Section 6)
4. **Study event architecture** (Kafka section)
5. **Review business logic** (Specific service sections)

---

## Important Patterns

### State Machine (rmx-pc-service)
```
ProcessModel → ProcessStepModel → Result
                     ↓
              ProcessLogModel (audit)
                     ↓
              ProcessKeyStorageModel (state)
```

### Event Flow
```
API Request → Business Logic → Event Creation → Kafka Publish
                                                      ↓
                                              Consumer Service
                                                    ↓
                                            Process Event + Database Update
                                                    ↓
                                            Optional: Publish Follow-up Event
```

### Authentication Flow
```
Client Request → Bearer Token → OIDC Verification → User Context → Business Logic
```

### Wallet Transaction Flow
```
POST /wallet/line/create → CreateWalletLine View → 
    Create WalletLine model →
    Update balance cache →
    Publish WALLET_NEW_LINE event →
    Trigger referral processor →
    Update commissions
```

---

## Related Files

- **Main Document:** `/sessions/busy-happy-mccarthy/rmx_wallet_extraction.md`
- **This Index:** `/sessions/busy-happy-mccarthy/rmx_wallet_extraction_index.md`

---

## How to Use This Reference

### For Developers
1. Find your target service in "By Repository"
2. Review its API endpoints
3. Study the data models
4. Read the business logic description
5. Check the Go translation section for patterns

### For Architects
1. Review "Cross-Cutting Concerns"
2. Study the service architecture diagrams
3. Understand authentication flows
4. Review messaging patterns

### For Code Generation (AI Agents)
1. Start with "Go Translation Strategy"
2. Use code templates provided
3. Reference specific service details
4. Follow the mapping table

---

**Document Last Updated:** March 7, 2026  
**Total Pages:** ~50+ (in PDF form)  
**Reading Time:** 2-3 hours (full document)  
**Skim Time:** 15-30 minutes (sections only)

