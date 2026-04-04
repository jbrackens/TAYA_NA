# Code Extraction for Go Translation
## Phase 4 Repository Analysis - Storm, GSTech, and Fantasy Football

Generated: March 7, 2026

---

## 1. Java/Storm Flip-Leaderboard Repository

**Location:** `/sessions/busy-happy-mccarthy/mnt/johnb/Desktop/Phase 4/07_Flip-Leaderboard/flip-storm-topologies`

**Statistics:** 1,058 Java files, 19 Scala files

### 1.1 Architecture Overview

The Storm/Flip repository uses a modular architecture based on:
- **Apache Camel** for data routing and event processing
- **Akka** for distributed actor model processing
- **Kafka** for event streaming
- **Play Framework** for REST API layer
- **Guice** for dependency injection
- **Ebean ORM** for PostgreSQL database access

### 1.2 Core Components

#### A. Leaderboard Service (`lib/impl/leaderboards-impl`)

**File:** `/sessions/busy-happy-mccarthy/mnt/johnb/Desktop/Phase 4/07_Flip-Leaderboard/flip-storm-topologies/flip-storm-topologies/lib/impl/leaderboards-impl/src/main/java/com/flip/leaderboards/impl/LeaderboardServiceImpl.java`

**Key Business Logic:**
```
LeaderboardServiceImpl Interface Methods:
- sum(LBEvent event, Order order, int limit, int offset) -> List<Object>
- min(LBEvent event, Order order, int limit, int offset) -> List<Object>
- max(LBEvent event, Order order, int limit, int offset) -> List<Object>
```

**Data Model - LeaderboardItem:**
- name: String
- value: Long
- Created from SqlRow mapping: row.getString("name"), row.getLong("value")

**Database Queries:** (`PostgresLeaderboardQueries.java`)

*SUM_SQL Pattern:*
```sql
SELECT u.id, u.name, SUM(e.value) as value
FROM leaderboard_event_entries e
JOIN user_accounts u ON e.user_id = u.id
WHERE e.event_id = :event_id
GROUP BY u.id
ORDER BY value DESC
```

*MIN_SQL Pattern:*
```sql
SELECT u.id, u.name, MIN(e.value) as value
FROM leaderboard_event_entries e
JOIN user_accounts u ON e.user_id = u.id
WHERE e.event_id = :event_id
GROUP BY u.id
ORDER BY value ASC
```

*MAX_SQL Pattern:*
```sql
SELECT u.id, u.name, MAX(e.value) as value
FROM leaderboard_event_entries e
JOIN user_accounts u ON e.user_id = u.id
WHERE e.event_id = :event_id
GROUP BY u.id
ORDER BY value DESC
```

**Pagination:** Using offset/limit pattern for result windowing

**Go Translation Notes:**
- Implement three aggregation functions (SUM, MIN, MAX)
- Use database/sql with prepared statements for query optimization
- Implement pagination interface for offset/limit handling
- Create LeaderboardItem struct with Name (string) and Value (int64)

---

#### B. Event Processing (`lib/api/events`)

**File:** `/sessions/busy-happy-mccarthy/mnt/johnb/Desktop/Phase 4/07_Flip-Leaderboard/flip-storm-topologies/flip-storm-topologies/lib/api/events/src/main/java/com/flip/events/Event.java`

**Event Interface Definition:**
```
Event.Status Enum:
- READY
- SENDING
- RECEIVED
- COMPLETE
```

**Event Lifecycle Methods:**
- ready() / onReady(Consumer<Event> block)
- sending() / onSending(Consumer<Event> block)
- received() / onReceived(Consumer<Event> block)
- complete() / onComplete(Consumer<Event> block)

**Event.Broker Interface:**
- send(Event event) -> Event
- read(String body) -> void

**Event.Confirmation Interface:**
- ready(Event event)
- sending(Event event)
- received(Event event)
- complete(Event event)

**Event.Handler Interface:**
- handle(Event event)

**Event.Client Interface:**
- connect()
- send(String message)
- close()

**Key Constants:**
- HEADER_KEY_TYPE = "type"

**Serialization:**
- Uses Jackson @JsonTypeInfo for polymorphic deserialization
- Type info stored as "@class" property

**Go Translation Notes:**
- Implement state machine pattern for Event lifecycle
- Use callbacks/observer pattern for event hooks
- Event struct with ID, DisplayName, Status fields
- Broker pattern as interface for event routing
- Consider using channels for event streaming instead of callbacks

---

#### C. Event Handling Pipeline (`app/camel-event-processor`)

**File:** `/sessions/busy-happy-mccarthy/mnt/johnb/Desktop/Phase 4/07_Flip-Leaderboard/flip-storm-topologies/flip-storm-topologies/app/camel-event-processor/src/main/java/com/flip/camel/events/EventHandlingProcessor.java`

**Processing Flow:**
```
Exchange Input -> EventHandlingProcessor.process()
  -> Extract body and headers
  -> Pass to Event.Broker.read(String)
  -> Set output with headers/body
```

**Camel Integration Pattern:**
- Implements org.apache.camel.Processor interface
- Process method receives/sends via Apache Exchange objects
- Message transformation at processing stage

**Go Translation Notes:**
- Use context.Context for message passing
- Implement processor pattern with Reader/Writer interfaces
- Use goroutines for async processing pipeline

---

#### D. Kafka Integration (`lib/api/kafka`)

**Files:**
- `/sessions/busy-happy-mccarthy/mnt/johnb/Desktop/Phase 4/07_Flip-Leaderboard/flip-storm-topologies/flip-storm-topologies/lib/api/kafka/src/main/java/com/flip/kafka/KafkaService.java`
- `/sessions/busy-happy-mccarthy/mnt/johnb/Desktop/Phase 4/07_Flip-Leaderboard/flip-storm-topologies/flip-storm-topologies/lib/api/kafka/src/main/java/com/flip/kafka/KafkaServiceImpl.java`

**KafkaService Interface:**
```
Extends: KafkaProducer

Methods:
- send(String topic, String message)
- close()
```

**Implementation Details:**
```java
@Singleton
public class KafkaServiceImpl implements KafkaService {
    final KafkaProducer producer;

    @Inject
    KafkaServiceImpl(KafkaProducer producer)

    public void send(String topic, String message) {
        producer.send(topic, message);
    }

    public void close() {
        Unchecked.wrap(() -> producer.close());
    }
}
```

**Go Translation Notes:**
- Create KafkaService interface with Send() and Close() methods
- Use github.com/segmentio/kafka-go or confluent-kafka-go
- Implement singleton pattern using sync.Once
- Topics and messages are strings (consider JSON for complex payloads)
- Error handling via unchecked exceptions pattern

---

#### E. Opta Data Processing (`app/camel-opta-data-processor`)

**Directory:** Contains feed processing modules for Opta sports data

**Key Components:**
- FeedProcessing.java
- DataProcessingRouteBuilder.java (Camel routes)
- DataProcessingModule.java (Guice bindings)
- S3ObjectKeyProcessor.java
- FlipObjectMessageFactory.java

**Pattern:** Camel route builder for streaming data transformation

**Go Translation Notes:**
- Route definition as configuration
- File watching and processing via goroutines
- S3 integration for object key processing

---

### 1.3 Challenge Matching Engine (`app/challenge-matcher`)

**Core Classes:**
- ChallengeMatcher.java (main entry)
- MatchingService.java (interface)
- MatchingServiceImpl.java (implementation)
- MatchingActor.java (Akka actor)
- GroupingActor.java (Akka actor)
- SupervisingActor.java (Akka actor)

**Pattern:** Akka actor system for distributed challenge matching

**Business Logic:**
- User challenge matching algorithm
- Challenge grouping and organization
- Supervision and actor management

**Go Translation Notes:**
- Implement actor model using goroutines + channels
- Consider using go-actor library or custom implementation
- Message-based communication between actors

---

### 1.4 Data Models and Serialization

**Key Models in Codebase:**
- LBEvent: Leaderboard event reference
- User: User account with ID and name
- Team: Sports team data
- Fixture: Match/game fixture information
- Player: Football player data
- Event: Generic event with lifecycle

**Serialization:**
- Jackson JSON with type information
- SQL Row mapping to POJOs
- Event polymorphism via @JsonTypeInfo

**Go Translation Notes:**
- Use struct tags for JSON marshaling
- Implement custom JSON marshalers for type info
- Interface types for polymorphism

---

### 1.5 Dependency Injection Pattern

**Framework:** Google Guice
- @Inject annotations on constructors
- @Singleton for lifecycle management
- @Provides methods for factory patterns

**Go Translation Notes:**
- Implement service locator or wire generation (go.uber.org/dig, Wire)
- Use struct composition for dependency passing
- Initialize services at startup

---

### 1.6 Database Access Layer

**ORM:** Ebean
- API: io.ebean.EbeanServer
- Query execution: createSqlQuery()
- Parameters: setParameter() with named parameters
- Pagination: setFirstRow(offset), setMaxRows(limit)
- Results: findList() returns List<SqlRow>

**Go Translation Notes:**
- Use database/sql with prepared statements
- Implement query builder or use sqlc for type safety
- Row scanning to struct mapping

---

## 2. Node.js GSTech/Idefix Platform

**Location:** `/sessions/busy-happy-mccarthy/mnt/johnb/Desktop/Phase 4/04_Idefix-GSTech-Platform`

**Structure:**
- gstech (1,729 JS files - main platform)
- brandserver-backend (224 JS files)
- brandserver-lambda (1 JS file)
- gstech-backoffice
- event_analysis

### 2.1 WalletServer Module (`gstech/packages/gstech-walletserver`)

**API Routes File:** `/sessions/busy-happy-mccarthy/mnt/johnb/Desktop/Phase 4/04_Idefix-GSTech-Platform/gstech/gstech/packages/gstech-walletserver/server/routes.js`

**Handler Pattern:**
```javascript
type WalletServerRoutesHandlerFn = (providers: { [GameProvider]: GameProviderApi }) => (
  req: express$Request,
  res: express$Response,
) => Promise<express$Response>;
```

**Key Routes and Handlers:**

1. **launchGameHandler**
   - Path: POST /:manufacturerId/launchGame
   - Request validation: launchGameSchema
   - Delegates to provider.launchGame(request)
   - Response: gameLaunchInfo JSON
   - Error handling: 400 (validation), 500 (execution)

2. **launchDemoGameHandler**
   - Path: POST /:manufacturerId/launchDemoGame
   - Parameters: brandId, manufacturerId
   - Request validation: launchDemoGameSchema
   - Delegates to provider.launchDemoGame(brandId, request)

3. **creditFreeSpinsHandler**
   - Path: POST /:manufacturerId/creditFreeSpins
   - Request validation: creditFreeSpinsSchema
   - Method: provider.creditFreeSpins(brandId, request)
   - Player username and bonus code in error logging

4. **Additional Routes (partial):**
   - createFreeSpinsHandler
   - getJackpotsHandler

**Logging Pattern:**
```javascript
const logPrefix = `${manufacturerId} handlerName`;
logger.debug(`>>> ${logPrefix}`, { body: req.body });
logger.debug(`<<< ${logPrefix}`, { response });
logger.error(`XXX ${logPrefix}`, { request, error });
```

**Error Response Format:**
```javascript
{ error: { code: 201, message: e.message } }
```

**Go Translation Notes:**
- Use gin or chi for HTTP routing
- Implement provider pattern for game providers
- Logging with structured fields
- Validation middleware layer

---

### 2.2 Request/Response Schemas (`gstech/packages/gstech-walletserver/server/schemas.js`)

**Validation Framework:** Joi (schema validation)

**Schema Definitions:**

1. **sessionSchema**
   ```javascript
   {
     sessionId: string (required, trimmed),
     type: string (optional, trimmed, nullable),
     parameters: object,
     manufacturerId: string (required, trimmed)
   }
   ```

2. **launchGameSchema**
   ```javascript
   {
     player: object (required),
     game: object (required),
     sessions: array of sessionSchema,
     sessionId: number (required),
     parameters: object,
     playTimeInMinutes: number (required),
     client: {
       ipAddress: string (optional, valid IPv4/IPv6),
       userAgent: string (required),
       isMobile: boolean (required)
     }
   }
   ```

3. **launchDemoGameSchema**
   ```javascript
   {
     currencyId: string (required),
     languageId: string (required),
     game: object (required),
     parameters: object,
     client: {...} // same as launchGameSchema
   }
   ```

4. **creditFreeSpinsSchema**
   ```javascript
   {
     player: object (required),
     sessionId: number (required),
     bonusCode: string (required),
     metadata: object (optional),
     spinValue: number (optional, nullable),
     spinType: string (optional, nullable),
     spinCount: number (optional, nullable),
     id: string (optional),
     client: {...},
     games: array of {
       manufacturerGameId: string (required),
       mobileGame: boolean (required)
     }
   }
   ```

5. **createFreeSpinsSchema**
   ```javascript
   {
     bonusCode: string (required),
     tableId: string (required)
   }
   ```

6. **getJackpotsSchema**
   ```javascript
   {
     games: array of {
       manufacturerGameId: string (required),
       gameId: string (required)
     },
     currencies: array of string (required)
   }
   ```

**Go Translation Notes:**
- Use struct tags for validation
- Implement validator package or use go-playground/validator
- IP validation with net.ParseIP()
- Optional fields using *Type pointers or json.Unmarshaler

---

### 2.3 Game Provider API Interface (`gstech/packages/gstech-walletserver/server/types.js`)

**Type Definition:**
```javascript
type GameProviderApi = {
  launchGame(request: LaunchGameRequest): Promise<GameLaunchInfo>,
  launchDemoGame(brandId: BrandId, request: LaunchDemoGameRequest): Promise<GameLaunchInfo>,
  creditFreeSpins?(brandId: BrandId, request: CreditFreeSpinsRequest): Promise<Result>,
  getJackpots?(request: GetJackpotsRequest): Promise<JackpotsResult>
}
```

**Implemented Providers:**
- Habanero
- Netent
- Yggdrasil

**Go Translation Notes:**
- Define interface with required and optional methods
- Use interface{} or concrete types for responses
- Provider factory pattern

---

### 2.4 Brandserver Backend (`brandserver-backend`)

**Main Entry:** `/sessions/busy-happy-mccarthy/mnt/johnb/Desktop/Phase 4/04_Idefix-GSTech-Platform/brandserver-backend/brandserver-backend/web.js`

**Startup Pattern:**
```javascript
if(process.env.LD_ENV === 'worker') {
  require('./src/worker/app');
} else {
  require('./src/server/common/app');
}
```

**Two Modes:**
- Worker mode: Background job processing
- Server mode: HTTP API server

**Frameworks:**
- Express (HTTP)
- Mongoose (MongoDB ODM)
- Flow types (TypeScript-like)
- DataDog tracing (`dd-trace`)

**Campaign Routes Module:** `/sessions/busy-happy-mccarthy/mnt/johnb/Desktop/Phase 4/04_Idefix-GSTech-Platform/brandserver-backend/brandserver-backend/src/server/common/campaign-routes.js`

**Key Business Logic:**

1. **Query Building Pattern (Dynamic Filter Construction)**
   ```javascript
   prepareQuery(bq, addDefaults, extraFlags)
   - Mode: 'query' (standard filters), 'advanced' (JSON), 'email', 'idlist'
   - Flag handling: $in for inclusion, $nin for exclusion
   - Field parsing: JSON values, objects, arrays
   - Default queries: transactional, special-campaign, mobile, personal
   ```

2. **Filter Modes:**
   - Standard Query: Build MongoDB $in/$nin operators
   - Advanced: Parse JSON query from form
   - Email List: Extract emails from comma/whitespace separated input
   - ID List: Extract IDs from list input

3. **Email Parsing:**
   ```javascript
   filterEmails(emails) -> Array<string>
   - Split on comma, space, tab
   - Lowercase and trim
   - Filter empty strings
   ```

4. **Marketing vs. Transactional:**
   - Determines default query set
   - Special campaigns use different unsubscribe flags
   - SMS vs. email selection

**Go Translation Notes:**
- Query builder pattern for MongoDB/SQL filters
- Flag management system for user segmentation
- Email extraction and validation
- JSON query parsing and validation

---

### 2.5 User Model (Mongoose)

**Type:** Flow-typed Mongoose schema
- Email-based user records
- Flags array for segmentation
- Campaign targeting fields
- SMS/email subscription flags

**Go Translation Notes:**
- Use struct with field tags for document mapping
- Implement query builder for complex user filters
- Index strategy for performance

---

### 2.6 Middleware and Infrastructure

**Logging Pattern:**
- Three-tier logging (>>>, <<<, XXX prefixes)
- Log prefix includes operation context
- Structured logging with request/response bodies

**Error Handling:**
- Error code system (201 for service errors)
- Validation errors (400 status)
- Execution errors (500 status)

**Go Translation Notes:**
- Structured logging with context
- Standard HTTP status codes
- Error type with code and message

---

## 3. Python Fantasy Football Backend

**Location:** `/sessions/busy-happy-mccarthy/mnt/johnb/Desktop/Phase 4/06_Fantasy-Football/ff_backend`

**Statistics:** 79 Python files

### 3.1 Data Models (`ff_opta_processor/models.py`)

**Core Models:**

1. **Competition**
   - id (IntegerField, primary key)
   - name (CharField, max_length=512)
   - season (IntegerField)
   - comp_id (IntegerField)
   - live (BooleanField, default=False)

2. **Team**
   - id (IntegerField, primary key)
   - opta_id (IntegerField, foreign key to Competition)
   - comp_id (ForeignKey to Competition)
   - country (CharField)
   - name (CharField)
   - short_name (CharField)

3. **Stadium**
   - id (IntegerField, primary key)
   - capacity (IntegerField, default=0)
   - name (CharField)
   - team_id (ForeignKey to Team, nullable)

4. **TeamOfficials**
   - id (CharField, primary key)
   - type (CharField)
   - first_name (CharField)
   - last_name (CharField)
   - birthday (DateField, nullable)
   - join_date (DateField, nullable)
   - team_id (ForeignKey to Team)

5. **Footballer**
   - id (IntegerField, primary key)
   - opta_id (IntegerField)
   - comp_id (ForeignKey to Competition)
   - full_name (CharField)
   - position (CharField)
   - first_name (CharField)
   - last_name (CharField)
   - birthday (DateField, nullable)
   - join_date (DateField, nullable)
   - birth_place (CharField)
   - weight (IntegerField)
   - height (IntegerField)
   - jersey_no (IntegerField)
   - country (CharField)
   - real_position (CharField)
   - real_position_side (CharField)
   - team_id (ForeignKey to Team)

6. **Fixture** (partial, from F1 format)
   - id (IntegerField, primary key)
   - opta_id (IntegerField)
   - comp_id (ForeignKey to Competition)
   - match_day (IntegerField)
   - time_zone (CharField)
   - period (CharField)
   - kickoff_datetime (DateTimeField)
   - type (CharField)
   - home_team_id (ForeignKey to Team)
   - home_ht_score (IntegerField)
   - [continues with away_team_id, scores, etc.]

**Go Translation Notes:**
- Use GORM or sqlc for model generation
- Implement relationships with foreign keys
- Datetime handling with time.Time
- Nullable fields with *Type or sql.NullString patterns
- Add struct tags for JSON serialization

---

### 3.2 Data Processing Pipeline (`ff_opta_processor/processors/`)

**Framework:** XML processing from Opta feeds

**Shared Utilities (`shared.py`):**

1. **DateTime Processing:**
   ```python
   process_datetime_as_unix_time(format) -> func
   - Parses datetime string to Unix milliseconds

   process_datetime_from_string(format) -> func
   - Returns datetime.datetime object

   process_date_from_string(format) -> func
   - Returns datetime.date object
   ```

2. **Data Type Conversions:**
   ```python
   normalize_uid(s: str) -> int
   - Remove prefix character if present

   normalize_id_with_prefix(prefix) -> func
   - Prepend prefix to ID

   partial_safe_cast(to_type, default) -> func
   - Type conversion with default fallback
   ```

3. **String Utilities:**
   ```python
   unicode_html_unescape(text) -> str
   - HTML entity decoding

   prefix_string(prefix) -> func
   - Prepend string prefix
   ```

4. **Collection Utilities:**
   ```python
   get_with_default(dict, key, default) -> value
   filter_none(list) -> list
   ```

5. **I/O Utilities:**
   ```python
   dump_to_json(data, file_path)
   - Write data structure to JSON file
   ```

**Processor Files:**
- f1.py - Match/fixture processing (F1 Opta format)
- f3.py - Match events (player actions)
- f4.py - Match substitutions
- f9.py - Team data (F40)
- f13m.py - Player match statistics
- f15.py - Player statistics
- f30.py - Player attributes
- f40.py - Team information
- Competition.py - Competition/season management

**Pattern:** Format-specific processors for Opta XML feeds

**Go Translation Notes:**
- XML unmarshaling with struct tags
- Interface{} or generic types for type conversions
- Functional options for processor factory
- Error handling for malformed data
- JSON marshaling for output

---

### 3.3 Event Processing Architecture (`ff_msg_service/`)

**Components:**
- models.py - Message/event models
- tasks.py - Celery async tasks
- backends/sendgrid_email.py - Email provider integration

**Message Service Pattern:**
- Asynchronous event handling via Celery
- External provider integration (SendGrid)
- Model-based message queue system

**Go Translation Notes:**
- Message queue integration (RabbitMQ, Redis)
- Worker pool pattern for async tasks
- Provider abstraction for email/SMS

---

### 3.4 Management Commands (`ff_opta_processor/management/commands/`)

**Available Commands:**
- run_match.py - Execute single match processing
- clear_opta_match_data.py - Data cleanup
- create_challenges.py - Challenge/contest generation
- process_data.py - Batch data processing

**Pattern:** Django management command framework for scheduled/manual jobs

**Go Translation Notes:**
- CLI command framework (cobra, urfave/cli)
- Command registration and execution
- Parameter passing and argument parsing

---

## 4. Cross-Repo Translation Patterns

### 4.1 Dependency Injection

**Java/Storm:** Guice with @Inject, @Singleton, @Provides
**Node.js:** Constructor injection, factory functions
**Python:** Django dependency system

**Go Pattern:**
- Use wire or dig for compile-time DI
- OR use constructor functions with explicit dependencies
- Service registry pattern for runtime resolution

---

### 4.2 Event Processing

**Java/Storm:** Event interface with lifecycle (READY -> SENDING -> RECEIVED -> COMPLETE)
**Node.js:** Request/response via Express middleware
**Python:** Message queue via Celery

**Go Pattern:**
- Channel-based event streaming
- Context propagation for request lifecycle
- Goroutine worker pools for async processing

---

### 4.3 Data Serialization

**Java/Storm:** Jackson with @JsonTypeInfo, polymorphic types
**Node.js:** JSON with Flow type annotations
**Python:** Django model serialization, XML parsing

**Go Pattern:**
- Struct tags for JSON marshaling
- Interface{} with type assertion for polymorphism
- Custom JSON marshalers/unmarshalers

---

### 4.4 Database Patterns

**Java/Storm:** Ebean ORM with named parameters
**Node.js:** Mongoose ODM for MongoDB
**Python:** Django ORM

**Go Pattern:**
- Use sqlc for type-safe SQL
- GORM for ORM operations
- Prepared statements for parameterized queries
- Transaction support via sql.Tx or GORM

---

### 4.5 Error Handling

**Java/Storm:** Exceptions with wrapping (Unchecked.wrap)
**Node.js:** Try-catch with error codes and messages
**Python:** Django exceptions, try-except

**Go Pattern:**
- Explicit error returns (err != nil pattern)
- Error wrapping with context (errors.Wrap)
- Error types for specific conditions
- Structured error responses with code and message

---

### 4.6 Configuration Management

**Java/Storm:** Guice modules, dependency wiring
**Node.js:** Environment variables with fallbacks (LD_ENV)
**Python:** Django settings, environment configuration

**Go Pattern:**
- Environment-based configuration
- Config struct with defaults
- YAML/TOML configuration files
- Viper for configuration management

---

### 4.7 Logging Infrastructure

**Java/Storm:** SLF4J with log prefix patterns
**Node.js:** Structured logging with operation prefixes (>>>, <<<, XXX)
**Python:** Django logging

**Go Pattern:**
- Structured logging with zap or slog
- Context field injection
- Log level management
- Correlation IDs for tracing

---

### 4.8 HTTP API Patterns

**Java/Storm:** Play Framework controllers
**Node.js:** Express route handlers with validation
**Python:** Django views with REST framework

**Go Pattern:**
- Chi or Gin for routing
- Middleware pipeline for cross-cutting concerns
- Request validation layer
- Standard response envelope with errors

---

## 5. Translation Priority Order (For Codex)

### Phase 1: Core Data Models
1. Define Go structs for all domain models
2. Implement database schema mappings (sqlc or GORM)
3. Create JSON serialization tags

### Phase 2: Database Layer
1. Implement leaderboard queries (SUM, MIN, MAX aggregations)
2. Build query builder for user filtering
3. Implement pagination helpers

### Phase 3: Event System
1. Implement Event interface and state machine
2. Create Event.Broker for routing
3. Build Kafka producer/consumer integration

### Phase 4: HTTP API Layer
1. Define route handlers for wallet server
2. Implement request validation (Joi -> validator)
3. Create standardized error responses
4. Build middleware for logging and tracing

### Phase 5: Async Processing
1. Implement event processing pipeline
2. Build worker pool for background jobs
3. Integrate message queue (Kafka/RabbitMQ)
4. Implement retry logic

### Phase 6: Provider Abstraction
1. Define GameProvider interface
2. Implement specific provider adapters (Habanero, Netent, Yggdrasil)
3. Build provider factory pattern

### Phase 7: Campaign Management
1. Implement user query builder
2. Build segmentation engine
3. Create campaign targeting logic

---

## 6. Key Integration Points for Go Implementation

### Storm Services Integration
- `KafkaService` - Message publishing
- `LeaderboardService` - Query and aggregation
- `EventBroker` - Event routing
- `EventHandler` - Event consumption

### GSTech Services Integration
- `GameProviderApi` - Provider abstraction
- `WalletServerRoutes` - HTTP handlers
- `CampaignRoutes` - User targeting
- `UserModel` - User persistence

### Fantasy Football Integration
- `OptaProcessor` - XML feed parsing
- `DataModels` - Entity definitions
- `MessageService` - Event emission
- `Management Commands` - Batch operations

---

## 7. Go Library Recommendations

**Web Framework:** chi or Gin
**ORM:** GORM with sqlc for complex queries
**Kafka:** segmentio/kafka-go
**Validation:** go-playground/validator
**JSON:** encoding/json with custom marshalers
**Logging:** uber-go/zap
**DI:** go.uber.org/dig or Wire
**Database:** database/sql with pgx driver
**Testing:** testify, table-driven tests
**Configuration:** spf13/viper
**Error Handling:** pkg/errors or errors (Go 1.13+)

---

## 8. File References for Translation

### Storm/Java Files
- Leaderboards: `/flip-storm-topologies/lib/impl/leaderboards-impl/src/main/java/com/flip/leaderboards/impl/`
- Events: `/flip-storm-topologies/lib/api/events/src/main/java/com/flip/events/`
- Kafka: `/flip-storm-topologies/lib/api/kafka/src/main/java/com/flip/kafka/`
- Event Processing: `/flip-storm-topologies/app/camel-event-processor/src/main/java/com/flip/camel/events/`

### GSTech/Node.js Files
- WalletServer: `/gstech/packages/gstech-walletserver/server/`
- BrandServer: `/brandserver-backend/src/server/common/`
- Campaigns: `/brandserver-backend/src/server/common/campaign-routes.js`
- Models: `/brandserver-backend/src/server/common/model.js`

### Fantasy Football/Python Files
- Models: `/ff_backend/ff_opta_processor/models.py`
- Processors: `/ff_backend/ff_opta_processor/processors/`
- Message Service: `/ff_backend/ff_msg_service/`
- Shared Utils: `/ff_backend/ff_opta_processor/processors/shared.py`

---

**End of Extraction Report**

---

## APPENDIX A: File Structure Summary

### Storm Repository File Count by Module
```
flip-storm-topologies/
├── lib/
│   ├── api/
│   │   ├── events/ (10+ files)
│   │   ├── kafka/ (8+ files)
│   │   ├── leaderboards/ (5+ files)
│   │   └── [other APIs]
│   ├── impl/
│   │   ├── events-kafka/ (15+ files)
│   │   ├── leaderboards-impl/ (2 key files)
│   │   ├── opta-impl/ (20+ files)
│   │   ├── games-impl/ (15+ files)
│   │   └── [other impls]
│   └── [shared utilities]
├── app/
│   ├── akka-data-processor/ (12+ files)
│   ├── akka-opta-server/ (8+ files)
│   ├── camel-event-processor/ (10+ files)
│   ├── camel-event-server/ (15+ files)
│   ├── camel-opta/ (25+ files)
│   ├── camel-opta-data-processor/ (30+ files)
│   └── challenge-matcher/ (15+ files)
├── simulator/ (20+ files)
└── play/ (400+ files - REST API layer)

Total: 1,058 Java files, 19 Scala files
```

### GSTech Repository File Count
```
04_Idefix-GSTech-Platform/
├── gstech/ (1,729 JS files)
│   ├── packages/gstech-walletserver/ (350+ files)
│   ├── packages/gstech-core/ (600+ files)
│   ├── packages/gstech-backoffice/ (200+ files)
│   └── [other packages]
├── brandserver-backend/ (224 JS files)
│   ├── src/server/common/ (80+ files)
│   ├── src/server/luckydino/ (40+ files)
│   ├── src/server/jefe/ (40+ files)
│   ├── src/server/olaspill/ (40+ files)
│   ├── src/server/kalevala/ (24+ files)
│   └── [other server packages]
├── brandserver-client/ (80+ files)
├── brandserver-lambda/ (1 file)
├── event_analysis/ (5+ files)
└── gstech-campaignserver-client/ (20+ files)

Total: 1,729 JS files (gstech) + 224 JS files (brandserver-backend)
```

### Fantasy Football Repository File Count
```
06_Fantasy-Football/ff_backend/
├── ff_opta_processor/ (50+ files)
│   ├── processors/ (12 format processors)
│   ├── management/commands/ (4 commands)
│   ├── models.py (comprehensive domain models)
│   ├── file_processing.py (feed ingestion)
│   └── [utilities]
├── ff_msg_service/ (15+ files)
│   ├── backends/
│   ├── tasks.py (async tasks)
│   └── models.py (message models)
├── ff_gamesparks/ (20+ files)
└── [other modules]

Total: 79 Python files
```

---

## APPENDIX B: Key Interfaces and Contracts for Go Translation

### Storm Event System Contract
```go
type EventStatus int
const (
    Ready EventStatus = iota
    Sending
    Received
    Complete
)

type Event interface {
    ID() string
    DisplayName() string
    Status() EventStatus
    Ready()
    Sending()
    Received()
    Complete()
    OnReady(func(Event))
    OnSending(func(Event))
    OnReceived(func(Event))
    OnComplete(func(Event))
}

type EventBroker interface {
    Send(event Event) Event
    Read(body string)
}

type EventHandler interface {
    Handle(event Event)
}
```

### Leaderboard Query Contract
```go
type LeaderboardItem struct {
    Name  string
    Value int64
}

type LeaderboardQueries interface {
    Sum(eventID string, offset, limit int) ([]LeaderboardItem, error)
    Min(eventID string, offset, limit int) ([]LeaderboardItem, error)
    Max(eventID string, offset, limit int) ([]LeaderboardItem, error)
}
```

### Kafka Service Contract
```go
type KafkaService interface {
    Send(topic, message string) error
    Close() error
}
```

### HTTP Handler Contract (Node.js Pattern)
```go
type GameProviderAPI interface {
    LaunchGame(req LaunchGameRequest) (GameLaunchInfo, error)
    LaunchDemoGame(brandID string, req LaunchDemoGameRequest) (GameLaunchInfo, error)
    CreditFreeSpins(brandID string, req CreditFreeSpinsRequest) (interface{}, error)
    GetJackpots(req GetJackpotsRequest) (interface{}, error)
}
```

---

## APPENDIX C: Critical Translation Considerations

### 1. Type Safety
- Java uses strong typing; ensure Go structs are well-defined
- Flow types in Node.js translate to Go interfaces and concrete types
- Python's duck typing requires explicit interface definition in Go

### 2. Concurrency Model
- Java's threading model (Akka actors) maps to Go goroutines + channels
- Node.js async/await patterns translate to Go goroutines
- Python's GIL limitation not relevant in Go

### 3. Database Transactions
- Ebean transactions map to sql.Tx or GORM transaction blocks
- Ensure ACID properties are maintained
- Consider connection pooling configuration

### 4. Error Handling Philosophy
- Java exceptions -> Go error returns
- Must check all errors explicitly
- Implement error wrapping for debugging context

### 5. Deployment Strategy
- Microservice architecture suitable for Go (lower memory footprint)
- Consider containerization (Docker) for consistent deployment
- Kafka-based event streaming remains core pattern

### 6. Testing Requirements
- Unit test all query builders (especially aggregations)
- Integration tests for Kafka producer/consumer
- HTTP handler tests with mock providers
- Database schema validation tests

### 7. Performance Considerations
- Go garbage collector vs. Java GC tuning
- Memory usage optimization for leaderboard queries
- Connection pooling configuration
- Kafka consumer group management

---

## APPENDIX D: Migration Checklist

### Data Layer
- [ ] Define all domain models as Go structs
- [ ] Set up database connection and pooling
- [ ] Implement query builders for leaderboards
- [ ] Implement user filtering/segmentation queries
- [ ] Create database migration tools

### Event Processing
- [ ] Implement Event state machine
- [ ] Create EventBroker with routing logic
- [ ] Build Kafka producer integration
- [ ] Build Kafka consumer integration
- [ ] Implement event handlers

### HTTP API
- [ ] Set up HTTP router (chi/gin)
- [ ] Implement request validation middleware
- [ ] Build game provider interface
- [ ] Implement specific providers
- [ ] Create error response formatting

### Async Processing
- [ ] Set up message queue (Kafka/RabbitMQ)
- [ ] Implement worker pool pattern
- [ ] Build retry logic
- [ ] Create health checks

### Testing
- [ ] Write unit tests for queries
- [ ] Write integration tests for API
- [ ] Write end-to-end tests for workflows
- [ ] Set up test database
- [ ] Implement test fixtures

### Deployment
- [ ] Create Docker containers
- [ ] Set up configuration management
- [ ] Implement health checks
- [ ] Set up monitoring/logging
- [ ] Create deployment automation

---

