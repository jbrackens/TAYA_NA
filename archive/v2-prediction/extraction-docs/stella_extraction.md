# Stella/Waysun Scala Repos - Go Translation Reference

**Date**: March 7, 2026
**Scope**: 13 Scala microservices for translation to Go
**Framework**: Play Framework (REST APIs), Apache Flink (Event Processing), Slick (Database), Kafka (Messaging)

---

## Overview

This document catalogs key business logic, architecture patterns, and implementation details from 13 Scala microservices in the Stella/Waysun platform. This information is essential for accurate translation to Go.

### Key Architectural Patterns
- **API Services**: Play Framework REST APIs with Tapir for endpoint definition
- **Authentication**: JWT-based with permission system (project-scoped access)
- **Database**: PostgreSQL with Slick query DSL (type-safe queries)
- **Messaging**: Apache Kafka with Avro schemas
- **Event Processing**: Apache Flink streaming jobs
- **Dependency Injection**: Play Framework modules pattern

---

## 1. eeg-waysun-achievement

**Type**: Play Framework REST API
**Purpose**: Achievement event tracking, aggregation window management
**Files**: 48 Scala files

### API Routes
- **Route File**: `achievement/conf/routes`
- **Router**: `stella.achievement.routes.ApiRouter`
- **Endpoints Module**: `stella.achievement.routes.AchievementRoutes`

### API Endpoints (Tapir-based)

```scala
// GET /achievements/{achievement_rule_id}/windows
- getAggregationWindowsEndpoint
- Permission: AggregationWindowsReadPermission
- Response: Response[Seq[AggregationWindow]]
- Cache: SHA256-hashed key with configurable timeout

// GET /achievements/{achievement_rule_id}
- getAchievementEventsEndpoint
- Query Params:
  - field_value: Optional[String]
  - window_range_start: Optional[OffsetDateTime]
  - order_by: OrderByFilters
  - page_size: Int (1-1000, default 20)
  - page: Int (min 1, default 1)
  - count_pages: Boolean (default false)
- Response: Response[PaginatedResult[AchievementEvent]]
- Cache: SHA256-hashed key with configurable timeout
```

### Data Models

**Core Domain Models**:
- `AchievementEvent`: Achievement event result with action details, time windows, grouping field
- `AchievementActionDetails`: Union type for Event or Webhook actions
- `AchievementEventActionDetails`: Event-based achievement action with field mapping
- `AchievementWebhookActionDetails`: Webhook target with optional event config
- `EventField`: Field name, value type, and value triple
- `AchievementConfiguration`: Rules for achievement detection

**Key Properties**:
```scala
case class AchievementEvent(
  achievementOriginDate: OffsetDateTime,
  groupByFieldValue: String,
  windowRangeStart: Option[OffsetDateTime],
  windowRangeEnd: Option[OffsetDateTime],
  action: AchievementActionDetails,
  createdAt: OffsetDateTime
)

sealed trait AchievementActionDetailsPayload {
  def actionType: ActionType  // Event or Webhook
}

case class AchievementEventActionDetails(
  eventId: EventConfigurationPublicId,
  fields: List[EventField]
)

case class EventField(
  fieldName: String,
  valueType: FieldValueType,
  value: String
)
```

### Database Access

**Repository Pattern**:
- `AchievementEventRepository`: Trait defining contract
- `SlickAchievementEventRepository`: PostgreSQL implementation using Slick
- Base: `ExtendedPostgresProfile` (custom Postgres dialect)
- Mappers: `CommonMappers` (type conversions)

**Key Query Patterns**:
```scala
// Slick query DSL for PostgreSQL
transactionTable
  .filter(_.walletOwnerId === walletOwnerId)
  .filter(entity => entity.currencyId === currencyId || entity.exchangeToCurrencyId === currencyId)
  .filterIf(transactionTypes.nonEmpty)(_.transactionType.inSet(transactionTypes))
  .filterOpt(dateRangeStart)((entity, startDate) => entity.transactionDate >= startDate)
  .filterOpt(dateRangeEnd)((entity, endDate) => entity.transactionDate <= endDate)
  .sortBy(entity => (entity.transactionDate.desc, entity.id.desc))
  .result
```

### Authentication & Authorization
- JWT-based using `StellaAuthContext`
- Permission hierarchy: `AggregationWindowsReadPermission`, `AchievementEventsReadPermission`
- Project-scoped access via `ProjectId`
- Directive: `TapirAuthDirectives.endpointWithJwtValidation`

### Configuration
- **File**: `achievement/conf/application.conf`
- Includes: http-server, play, slick configs
- Redis caching with configurable TTLs:
  - `cacheConfig.windowsTimeout`
  - `cacheConfig.achievementEventsTimeout`

### HTTP Response Wrapping
- Standard response wrapper: `Response.asSuccess(data)`
- Error response: `Response[ErrorOutput]` with status codes
- Pagination wrapper: `PaginatedResult[T]`

---

## 2. eeg-waysun-leaderboard

**Type**: Play Framework REST API
**Purpose**: Leaderboard and aggregation result queries
**Files**: 67 Scala files

### API Routes
- **Route File**: `server/conf/routes`
- **Router**: `stella.leaderboard.server.routes.ApiRouter`

### API Endpoints

```scala
// Multiple endpoints for leaderboard queries (12 endpoint files)
// Typical patterns:
- GET /leaderboards/{leaderboard_id}
- GET /leaderboards/{leaderboard_id}/rankings
- GET /leaderboards/{leaderboard_id}/user-rank
// All with pagination, filtering, and sorting support
```

### Data Models
- `AggregationResult`: Result of aggregation computation
- Leaderboard entities with ranking information
- User position/rank in leaderboards

### Database Access
- `AggregationResultRepository`: Query contract
- `SlickAggregationResultRepository`: Slick implementation
- Queries on aggregation results with ranking

### Key Features
- Pagination with optional page count calculation
- Redis caching of results
- Permission-based access control
- Real-time ranking calculations

---

## 3. eeg-waysun-user-context

**Type**: Play Framework REST API (with Akka Actors)
**Purpose**: User context management and state tracking
**Files**: 37 Scala files

### API Routes
- **Route File**: `user-context/conf/routes`
- **Router**: `stella.usercontext.routes.ApiRouter`

### API Endpoints (10 endpoint files)
- User context retrieval and updates
- Session state management
- Context enrichment for user operations

### Architecture Pattern
- **Actors** (2 files): Akka-based concurrent state management
- Async context operations using actor system
- Future-based request/response patterns

### Data Models
- `UserContext`: User session and environment data
- Project-scoped context (multi-tenancy)
- JWT authentication context

---

## 4. eeg-waysun-wallet

**Type**: Play Framework REST API
**Purpose**: Digital wallet, currency management, transaction history
**Files**: 79 Scala files

### API Routes
- **Route File**: `wallet/conf/routes`
- **Router**: `stella.wallet.routes.ApiRouter`
- **Sub-routers**:
  - `CurrencyRoutes`
  - `WalletRoutes`
  - `TransactionHistoryRoutes`

### API Endpoints (26 endpoint files)

```scala
// Currency Management
- GET /currencies
- GET /currencies/{currency_id}
- POST /currencies
- PUT /currencies/{currency_id}

// Wallet Operations
- GET /wallets/{wallet_id}
- GET /wallets/{wallet_id}/balance
- POST /wallets
- POST /wallets/{wallet_id}/transfer

// Transaction History
- GET /transactions
- GET /transactions/{transaction_id}
- Query filters: date range, transaction type, currency, pagination
```

### Data Models

**Financial Core**:
```scala
case class Transaction(
  transactionType: TransactionType,  // Deposit, Withdrawal, Transfer, Exchange
  fromCurrency: CurrencyId,
  toCurrency: CurrencyId,
  amount: PositiveBigDecimal,
  exchangeRate: Option[BigDecimal],
  timestamp: OffsetDateTime
)

case class Wallet(
  id: WalletId,
  ownerId: UserId,
  currencyId: CurrencyId,
  balance: PositiveBigDecimal,
  createdAt: OffsetDateTime
)

case class Currency(
  id: CurrencyId,
  code: String,
  name: String,
  symbol: String,
  precision: Int  // Decimal places
)

type PositiveBigDecimal = BigDecimal  // Domain constraint
```

**Transaction Type Enumeration**:
- `Deposit`: Money added to wallet
- `Withdrawal`: Money removed from wallet
- `Transfer`: Money moved between wallets
- `Exchange`: Currency conversion

**Query Parameters**:
```scala
case class BaseFetchTransactionParams(
  walletOwnerId: UserId,
  currencyId: CurrencyId,
  transactionTypes: Set[TransactionType],
  dateRangeStart: Option[OffsetDateTime],
  dateRangeEnd: Option[OffsetDateTime],
  sortFromNewestToOldest: Boolean
)
```

### Database Access

**Repository Pattern**:
```scala
trait TransactionReadRepository {
  def getTransactionHistory(
    walletOwnerId: UserId,
    currencyId: CurrencyId,
    transactionTypes: Set[TransactionType],
    dateRangeStart: Option[OffsetDateTime],
    dateRangeEnd: Option[OffsetDateTime],
    sortFromNewestToOldest: Boolean
  ): Future[Seq[TransactionEntity]]
}

trait TransactionWriteRepository {
  def persist(transaction: Transaction): Future[Unit]
}
```

**Slick Implementation**:
- `SlickTransactionReadRepository`: Queries with complex filtering
- `SlickTransactionWriteRepository`: Inserts with auto-generated IDs
- `SlickCurrencyRepository`: Currency lookups
- Table definitions with custom types (PositiveBigDecimal)

**Key Query Pattern**:
```scala
transactionTable
  .filter(_.walletOwnerId === walletOwnerId)
  .filter(entity => entity.currencyId === currencyId || entity.exchangeToCurrencyId === currencyId)
  .filterIf(transactionTypes.nonEmpty)(_.transactionType.inSet(transactionTypes))
  .filterOpt(dateRangeStart)((entity, startDate) => entity.transactionDate >= startDate)
  .filterOpt(dateRangeEnd)((entity, endDate) => entity.transactionDate <= endDate)
  .sortBy(entity => if (sortFromNewestToOldest) (entity.transactionDate.desc, entity.id.desc)
                     else (entity.transactionDate.asc, entity.id.asc))
  .result
```

### Akka Actors (2 files)
- Actor-based state management for concurrent operations
- Async message passing for wallet operations

### Authentication & Authorization
- JWT-based with StellaAuthContext
- Permission scopes for read/write operations
- Project-scoped wallet access

### Configuration
- **File**: `wallet/conf/application.conf`
- Database connection pooling via Slick
- Redis caching for frequently accessed wallets

---

## 5. gmx-waysun-common

**Type**: Shared Library
**Purpose**: Common utilities, Kafka clients, HTTP infrastructure
**Files**: 68 Scala files

### Kafka Infrastructure

**Kafka Publication Service** (`KafkaPublicationService.scala`):
```scala
trait KafkaPublicationService[K, V >: Null] {
  def publish(key: K, value: Option[V])(implicit ec: ExecutionContext)
    : EitherT[Future, EventSubmissionError, KafkaPublicationInfo]

  def publishAndForget(key: K, value: Option[V])(implicit ec: ExecutionContext)
    : EitherT[Future, EventSubmissionError, Unit]

  def stopGracefully(): Unit
}
```

**Configuration**:
```scala
case class KafkaProducerConfig(
  bootstrapServers: String,
  topicName: String,
  producer: ProducerConfig,
  serializer: SerializerConfig
)

case class ProducerConfig(
  publicationTimeLimit: Option[Duration],
  compressionType: String,
  batchSize: Int,
  lingerMs: Int
)

case class KafkaProducerConsumerConfig(
  kafkaConsumerConfig: KafkaConsumerConfig,
  kafkaProducerConfig: KafkaProducerConfig
)
```

**Error Handling**:
```scala
sealed trait EventSubmissionError
case class EventSubmissionTimeoutException(underlying: Throwable) extends EventSubmissionError
case class UnexpectedEventSubmissionException(details: String, underlying: Throwable) extends EventSubmissionError
```

**Implementation Details**:
- Apache Kafka 3.x client
- Avro serialization with schema registry
- Async publishing with backpressure
- Graceful shutdown with producer.flush()
- Error recovery and retry logic

### Avro Schemas (2 files)
- Schema registry integration
- Data contract versioning
- Type-safe serialization

### HTTP Infrastructure
- `HttpServerConfig`: Base HTTP server configuration
- Shared authentication middleware
- Standard response format

### Common Models & IDs
- Tagged types for domain IDs (ProjectId, UserId, etc.)
- Type-safe ID handling

---

## 6. gmx-waysun-data-api

**Type**: Data API / Schema Registry
**Purpose**: Avro schema definitions and data contracts
**Files**: 5 Scala files

### Avro Schemas
- Event definitions (likely .avsc JSON schema files)
- Data contract versioning
- Schema validation

---

## 7. gmx-waysun-event-achievement

**Type**: Apache Flink Streaming Job
**Purpose**: Real-time achievement event processing and detection
**Files**: 76 Scala files

### Architecture
- Apache Flink DataStream API
- Kafka source for event input
- Aggregation logic for achievement detection
- Kafka sink for results

### Kafka Integration

**Source Topics**:
- `definition`: Event definition stream
- `aggregated`: Aggregated event data
- Schema Registry URL for Avro deserialization

**Target Topics**:
- `achievements`: Achievement results
- Schema Registry for serialization

### Configuration
```scala
case class AppConfig(
  kafka: KafkaProperties,
  sourceTopics: SourceTopics,
  targetTopics: TargetTopics
)

case class SourceTopics(
  definition: String,
  aggregated: String,
  schemaRegistry: String
)

case class TargetTopics(
  achievements: String,
  schemaRegistry: String
)
```

### Processing Pipeline
1. Read event definitions from Kafka
2. Join with aggregated event data
3. Detect achievement conditions
4. Output achievement events to sink topic

---

## 8. gmx-waysun-event-aggregator

**Type**: Apache Flink Streaming Job
**Purpose**: Event aggregation with time windowing and grouping
**Files**: 95 Scala files

### Kafka Integration

**Source Topics**:
```scala
case class SourceTopics(
  eventDefinition: String,
  validatedEvents: String,
  aggregationDefinition: String,
  aggregationControl: String,
  schemaRegistry: String
)
```

**Target Topics**:
```scala
case class TargetTopics(
  aggregationResult: String,
  schemaRegistry: String
)
```

### Configuration

```scala
case class AppConfig(
  kafka: KafkaProperties,
  sourceTopics: SourceTopics,
  targetTopics: TargetTopics,
  cleaningPolicy: Seq[CleaningPolicies] = Seq()
)

case class CleaningPolicies(
  interval: String,      // IntervalType name (hourly, daily, weekly, etc.)
  cyclesToKeep: Long     // Number of cycles to retain
)
```

### Processing Logic

**Key Models**:
- `Interval`: Time interval definition (hourly, daily, weekly, monthly)
- `Window`: Aggregation time window
- `Aggregation`: Aggregation result with statistics
- `AggregationControl`: Control messages for cleanup/recalculation
- `EventOccurrence`: Individual event occurrences
- `Field`: Event field with value

**Windowing Strategy**:
- Time-based windows (session, tumbling, sliding)
- Multiple interval types supported
- Cleanup policies for different intervals

**Joining Strategy**:
- Event + Aggregation Definition join
- Control stream for dynamic behavior
- State management for active aggregations

---

## 9. gmx-waysun-event-ingestor

**Type**: Apache Flink Streaming Job + HTTP Server
**Purpose**: Event ingestion and persistence
**Files**: 39 Scala files

### HTTP Server

**Server Components**:
- `HttpServer.scala`: Base HTTP server wrapper
- `EventIngestorHttpServer.scala`: Custom ingestor implementation
- `StellaAkkaHttpServerOptions.scala`: Akka HTTP configuration
- Built with Akka HTTP (Play Framework alternative)

**HTTP Endpoints**:
- Event submission endpoints (likely POST /events)
- Health check endpoints
- Metrics exposure

### Services (2 files)

**Core Services**:
- `PersistenceService.scala`: Event persistence logic
- `KafkaConsumerService.scala`: Kafka consumer wrapper

**Event Processing Flow**:
1. Receive HTTP event submissions
2. Validate event format
3. Publish to Kafka for downstream processing
4. Persist to database if needed

### Kafka Consumer Integration

**Configuration**:
```scala
case class KafkaConsumerConfig(
  bootstrapServers: String,
  groupId: String,
  topicName: String,
  serializer: SerializerConfig
)
```

**Typical Consumer Pattern**:
- Poll events from Kafka
- Deserialize Avro messages
- Process and persist
- Offset management

### HTTP Clients (3 files)
- Integration with external services
- Schema Registry HTTP client
- Configuration service calls

---

## 10. gmx-waysun-event-validator

**Type**: Apache Flink Streaming Job
**Purpose**: Event validation against schema and business rules
**Files**: 53 Scala files

### Kafka Integration

**Source Topics**:
```scala
case class SourceTopics(
  definition: String,
  raw: String,
  schemaRegistry: String
)
```

**Target Topics**:
```scala
case class TargetTopics(
  validated: String,
  failed: String,
  schemaRegistry: String
)
```

### Processing Logic

**Validation Stages**:
1. Schema validation against event definition
2. Business rule validation
3. Field type checking
4. Required field presence

**Output Routes**:
- Valid events → `validated` topic
- Invalid events → `failed` topic (with error details)

### Configuration Pattern
```scala
case class AppConfig(
  kafka: KafkaProperties,
  sourceTopics: SourceTopics,
  targetTopics: TargetTopics
)
```

---

## 11. gmx-waysun-rule-configurator

**Type**: Play Framework REST API
**Purpose**: Rule and configuration management for event processing
**Files**: 95 Scala files

### API Routes
- **Route File**: `rule-configurator/conf/routes`
- **Router**: `stella.rules.routes.ApiRouter`
- **Sub-routers**:
  - `EventConfigurationRoutes`
  - `AggregationRuleConfigurationRoutes`
  - `AchievementRuleConfigurationRoutes`

### API Endpoints (42 endpoint files)

```scala
// Event Configuration
- GET /events
- GET /events/{event_id}
- POST /events
- PUT /events/{event_id}
- DELETE /events/{event_id}

// Aggregation Rules
- GET /aggregations
- GET /aggregations/{aggregation_id}
- POST /aggregations
- PUT /aggregations/{aggregation_id}

// Achievement Rules
- GET /achievements
- GET /achievements/{achievement_id}
- POST /achievements
- PUT /achievements/{achievement_id}
- PATCH /achievements/{achievement_id}
```

### Data Models (7 model files)

**Event Configuration**:
```scala
case class EventConfiguration(
  id: EventConfigurationPublicId,
  projectId: ProjectId,
  name: String,
  description: Option[String],
  fields: Seq[EventFieldDefinition],
  enabled: Boolean,
  createdAt: OffsetDateTime,
  updatedAt: OffsetDateTime
)

case class EventFieldDefinition(
  name: String,
  fieldType: FieldValueType,
  required: Boolean,
  description: Option[String]
)
```

**Aggregation Rule**:
```scala
case class AggregationRule(
  id: AggregationConfigurationPublicId,
  eventId: EventConfigurationPublicId,
  aggregationType: AggregationType,  // Sum, Count, Average, Custom
  groupByFields: Seq[String],
  interval: Interval,
  filters: Seq[FieldFilter]
)
```

**Achievement Rule**:
```scala
case class AchievementConfiguration(
  id: AchievementConfigurationPublicId,
  aggregationRuleId: AggregationConfigurationPublicId,
  condition: AchievementCondition,  // Threshold, Pattern, etc.
  action: AchievementAction  // Webhook, Event, etc.
)
```

### Database Access

**Repository Pattern** (6 database files):
- `EventConfigurationRepository`: Query/persist event definitions
- `AggregationRuleConfigurationRepository`: Aggregation rule CRUD
- `AchievementConfigurationRepository`: Achievement rule CRUD
- Slick-based implementations

**Key Query Features**:
- Project-scoped queries (multi-tenancy)
- Full-text search on rule names/descriptions
- Pagination with sorting
- Soft deletes or status tracking

### Database Relationships
```
Event Configuration (1) --> (N) Aggregation Rules
Aggregation Rules (1) --> (N) Achievement Rules
Achievement Rules --> Webhook Targets / Event Actions
```

### Configuration
- **File**: `rule-configurator/conf/application.conf`
- Database connection and pool settings
- Caching strategies for rule lookups

---

## 12. gmx-predictor-game

**Type**: Multi-Module Play Framework Application
**Purpose**: Prediction game platform with competition/leaderboard management
**Files**: 117 Scala files

### API Routes
- **Admin Routes**: `admin/conf/routes` → `apiV1.RoutesFile`
- **WebGateway Routes**: `webgateway/conf/routes`
  - `/api/v1` → `apiV1.Routes`
  - `/api/v2` → `apiV2.Routes`
  - `/api/v3` → `apiV3.Routes`
- Swagger/OpenAPI documentation at `/docs/swagger.json`

### Controllers (10+ service files)

**Admin Controllers**:
- `ReportController`: Report generation and export
- `HealthController`: Service health checks
- Standard admin operations

**WebGateway Controllers**:
- `CompetitionController`: Competition CRUD and details
- `LeaderboardController`: Leaderboard queries and rankings
- `PredictionController`: Prediction submission and validation
  - `PredictionControllerV1`: Legacy API
  - `PredictionControllerV2`: Enhanced API

### Services

**Authentication Service**:
```scala
trait IAuthenticationService {
  def authenticate(credentials: Credentials): Future[AuthToken]
  def validateToken(token: String): Future[ValidatedSession]
}

// Implementations
class RMXAuthenticationService: External OIDC provider (RMX)
class DevAuthenticationService: Development/testing implementation
```

**OIDC Integration** (`OIDCClient.scala`):
- Remote identity provider integration
- Token validation and refresh
- User profile retrieval

**Report Service**:
- Report generation logic
- Data aggregation for exports
- Scheduling support

**Business Services**:
- `IPredictionService`: Prediction validation and scoring
- `IUserService`: User profile and stats
- `ILeaderboardService`: Ranking calculations

### Data Models

**Core Game Entities**:
- `Competition`: Game round/competition definition
- `Prediction`: User's prediction for a competition
- `User`: Game participant
- `Leaderboard`: Ranking/score tracking
- `Round`: Time-period for predictions

**Database Repositories**:
- `UserRepository`: User profile persistence
- `PredictionRepository`: Prediction storage
- `RoundRepository`: Round/period management
- `LeaderboardRepository`: Ranking data
- `EventRepository`: Game event audit trail

### Configuration Files
- `admin/conf/application.conf`: Admin service config
- `webgateway/conf/application.conf`: Gateway config
- `security/src/main/resources/reference.conf`: Security config
- `utils/src/main/resources/application.conf`: Utility configs
- `eventprocessor/src/main/resources/application.conf`: Event processing

### Time Service
- `TimeService.scala`: Centralized time handling
- Timezone management
- Competition scheduling

### Architecture

**Multi-Module Structure**:
1. **security**: Authentication and authorization
2. **admin**: Administrative operations
3. **webgateway**: Public API gateway
4. **domain**: Core domain models and repositories
5. **eventprocessor**: Event handling
6. **common**: Shared utilities
7. **utils**: Helper functions

### API Versioning
- Multiple API versions (v1, v2, v3) supported
- Backward compatibility maintained
- Swagger documentation for each version

---

## 13. gmx-data-api-reward-point

**Type**: Data API / Utility
**Purpose**: Reward points calculation and data access
**Files**: 4 Scala files

### Likely Components
- Reward point calculation logic
- Point aggregation queries
- Leaderboard integration
- Configuration models

---

## Cross-Cutting Concerns

### Authentication & Authorization Pattern

**JWT-Based Security**:
```scala
// Common context for all requests
case class StellaAuthContext(
  userId: UserId,
  primaryProjectId: ProjectId,
  permissions: Set[Permission],
  sessionToken: String
)

// Permission-based endpoints
case class Permission(value: String)

// Directive integration
TapirAuthDirectives.endpointWithJwtValidation(requiredPermission)
```

### Standard Response Format

```scala
// Success response
case class Response[T](
  status: String = "success",
  data: T,
  message: Option[String] = None,
  timestamp: OffsetDateTime
)

// Error response
case class Response[ErrorOutput](
  status: String = "error",
  error: ErrorOutput,
  message: String,
  timestamp: OffsetDateTime
)

case class ErrorOutput(
  code: String,
  details: Map[String, String]
)
```

### Pagination Pattern

```scala
case class PaginatedResult[T](
  items: Seq[T],
  pageNumber: Int,
  pageSize: Int,
  totalItems: Option[Long],  // Only if count_pages=true
  totalPages: Option[Int]
)

// Request parameters
QueryParams:
- page_size: Int (min 1, max varies by endpoint)
- page: Int (min 1)
- count_pages: Boolean (default false)
```

### Database Access Layer

**Core Patterns**:
1. **Repository Trait**: Abstract interface defining operations
2. **Slick Implementation**: Concrete PostgreSQL implementation
3. **Type-Safe Queries**: Compile-time verified SQL
4. **Connection Pooling**: Managed by Slick configuration
5. **Transaction Management**: Implicit EC for async operations

**Example Query Pattern**:
```scala
// Functional composition of filters
query
  .filter(_.status === status)
  .filterIf(hasCreatedFilter)(_.createdAt >= createdDate)
  .filterOpt(optionalDateRange)((entity, endDate) => entity.date <= endDate)
  .sortBy(_.createdAt.desc)
  .take(pageSize)
  .drop((pageNumber - 1) * pageSize)
  .result
```

### Caching Strategy

**Redis Integration**:
- Key generation with SHA256 hashing
- Configurable TTLs per endpoint
- Automatic cache invalidation on mutations
- Cache-aside pattern (load from cache, fallback to query)

### Kafka Event Publishing

**Standard Flow**:
1. Prepare event/message object
2. Create `ProducerRecord[K, V]` with topic name
3. Use `KafkaPublicationService` for publishing
4. Handle `EventSubmissionError` with recovery
5. Flush producer on shutdown

**Error Handling**:
- Timeout exceptions with configurable duration
- Unexpected exceptions with error context
- Either[T] monad for error propagation
- Graceful degradation for non-critical events

### Type Safety & Tagging

**Newtype Pattern for IDs**:
```scala
object Ids {
  case class ProjectId(value: String)
  case class UserId(value: String)
  case class EventConfigurationPublicId(value: String)
  // Tagged types prevent accidental ID type mixing
}
```

### Akka Actors Pattern

**Usage in User Context Service**:
```scala
// Actor-based state management for concurrent operations
case class UserContextState(context: UserContext, updated: OffsetDateTime)

// Message-based communication
case class GetContextMessage(userId: UserId)
case class UpdateContextMessage(context: UserContext)

// Async request/response
actor ? message  // Returns Future[Response]
```

---

## Implementation Notes for Go Translation

### Key Translation Points

1. **Tapir Endpoints → Go Handlers/Routers**
   - Tapir endpoint definitions → Go http.Handler functions
   - Query parameter parsing → chi/gin router parameter binding
   - Response serialization → json.Marshal with struct tags

2. **Slick Queries → Go sqlc or Database/sql**
   - Type-safe query DSL → Generated SQL from sqlc or query builder
   - Implicit ExecutionContext → goroutine handling
   - Connection pooling → database/sql.DB with max connections

3. **Kafka Publication → Go Sarama or Confluent**
   - KafkaPublicationService trait → Interface with Publish method
   - Avro serialization → confluent-kafka-go with schema registry client
   - Error handling → Go error interface instead of Either monad

4. **JWT Authentication → Go JWT middleware**
   - StellaAuthContext → Go context.Context with auth info
   - Permission checking → Go middleware chain
   - Endpoint directives → Go middleware functions

5. **Flink Jobs → Go stream processors**
   - DataStream API → Kafka consumer groups
   - Window operations → Custom state aggregation
   - Join operations → Multi-stream correlation

6. **Play Framework → Go Echo/Gin/Chi**
   - Play routing → Standard Go HTTP routing
   - Dependency injection → Struct embedding or constructor functions
   - Configuration → YAML or environment-based config

7. **Async/Future → Go Goroutines**
   - Scala Future[T] → Go channels or goroutines
   - ExecutionContext → Context.Context
   - Promise resolution → Channel sends

---

## Summary Statistics

| Repository | Type | Files | Key Responsibility |
|------------|------|-------|-------------------|
| eeg-waysun-achievement | REST API | 48 | Achievement event queries, time windowing |
| eeg-waysun-leaderboard | REST API | 67 | Ranking and leaderboard queries |
| eeg-waysun-user-context | REST API | 37 | User session and context management |
| eeg-waysun-wallet | REST API | 79 | Financial transactions, wallet management |
| gmx-waysun-common | Library | 68 | Kafka, HTTP, shared utilities |
| gmx-waysun-data-api | Data API | 5 | Schema registry and data contracts |
| gmx-waysun-event-achievement | Flink Job | 76 | Real-time achievement detection |
| gmx-waysun-event-aggregator | Flink Job | 95 | Event aggregation with windowing |
| gmx-waysun-event-ingestor | Flink Job | 39 | Event ingestion and validation |
| gmx-waysun-event-validator | Flink Job | 53 | Schema validation, business rules |
| gmx-waysun-rule-configurator | REST API | 95 | Rule management and configuration |
| gmx-predictor-game | Multi-module | 117 | Prediction game platform |
| gmx-data-api-reward-point | Data API | 4 | Reward points calculations |
| **TOTAL** | | **954** | |

---

## Technology Stack Summary

### Backend Frameworks
- **Play Framework 2.8+**: REST APIs with Akka integration
- **Apache Flink 1.15+**: Stream processing
- **Akka 2.6+**: Actor model for concurrency

### Database
- **PostgreSQL 12+**: Primary data store
- **Slick 3.3+**: Type-safe query DSL
- **Redis**: Caching layer

### Messaging
- **Apache Kafka 3.x**: Event streaming
- **Avro**: Data serialization with schema registry

### HTTP & API
- **Tapir**: Functional endpoint definitions
- **Play Server**: HTTP server
- **Swagger/OpenAPI**: API documentation

### Testing & Configuration
- **HOCON** (application.conf): Configuration management
- **Typesafe Config**: Config loading

### Security
- **JWT**: Authentication
- **OIDC**: Identity provider integration
- **Custom permission system**: Fine-grained access control

---

**End of Document**
