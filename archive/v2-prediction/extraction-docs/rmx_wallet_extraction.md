# RMX Rewards Platform & Stella Waysun Platform
## Python to Go Microservices Translation Reference

**Document Purpose:** Catalog business logic, API endpoints, data models, and integration patterns from Phase 4 Python microservices for translation to Go.

**Generated:** March 7, 2026

---

## Table of Contents

1. [RMX Rewards Platform Repos](#rmx-rewards-platform)
2. [Stella Waysun Platform Repos](#stella-waysun-platform)
3. [Cross-Cutting Concerns](#cross-cutting-concerns)

---

# RMX Rewards Platform


## rmx-wallet-service

**Purpose:** Wallet and transaction management for RMX rewards system  
**Framework:** Django REST Framework  
**Python Files:** 79

### API Endpoints

Key endpoints extracted from URL patterns:

| Endpoint Pattern | Method | Handler | Description |
|---|---|---|---|
| `/wallet/` | GET | WalletsListView | List all wallets |
| `/wallet/balance/(?P<username>rmx_[a-f0-9]{32})/?` | GET | CurrentBalanceForUserView | Get user balance |
| `/wallet/balance/(?P<username>rmx_[a-f0-9]{32})/(?P<company_id>[a-f0-9\-]{36})/?` | GET | CurrentBalanceForUserFromCompanyView | Get user balance by company |
| `/wallet/(?P<wallet>[a-f0-9\-]{36})/lines/?` | GET | WalletLineListView | List wallet lines/transactions |
| `/wallet/line/create/?` | POST | CreateWalletLine | Create wallet line |
| `/wallet/line/create/from_company/?` | POST | CreateWalletLineFromCompany | Create wallet line from company |
| `/wallet/bpr/create/?` | POST | CreateBprWalletLine | Create BPR wallet line |
| `/ext_orders/transaction_keys/?` | GET | List/Create API transaction keys |

### Database Models

```python
class Wallet(Model)
    - wallet_id (UUID)
    - user_id
    - balance
    - currency
    - created_at
    - updated_at

class WalletLine(Model)
    - wallet (ForeignKey to Wallet)
    - transaction_id
    - amount
    - type (DEBIT/CREDIT)
    - status
    - created_at

class CommissionConfig(Model)
    - partner_id
    - commission_rate
    - config_data

class ExternalOrder(Model)
    - order_id
    - user_id
    - amount
    - status
    - timestamp

class PartnerTransactionApiKeys(Model)
    - partner_id
    - api_key
    - secret_key
    - permissions
```

### Services

- **KafkaService** - Message broker integration
- **PcService** - Point/credit service integration
- **BearerAuthorization** - Authentication/token handling
- **Singleton** - Utility for singleton patterns

### Key Business Logic

1. **Balance Management**
   - Real-time balance calculation across multiple wallets
   - Company-specific balance views
   - Currency handling

2. **Transaction Processing**
   - Wallet line creation (CREDIT/DEBIT)
   - Commission calculation
   - Silent charge token handling for payments (Chaney integration)

3. **API Key Management**
   - Partner transaction API key generation/rotation
   - API authentication

### Environment Variables

```
DJANGO_ALLOWED_HOSTS
RDS_DB_NAME
RDS_USERNAME
RDS_PASSWORD
RDS_HOSTNAME
RDS_PORT
CONN_MAX_AGE
DJANGO_REDIS_CACHE_URI
DJANGO_SECRET_KEY
DJANGO_DEBUG
DJANGO_LOG_LEVEL
JWT_EXTRA_SECRET_KEY
DJANGO_SITE_URL
OIDC_AUTHENTICATION_URL
OIDC_CLIENT_ID
OIDC_CLIENT_SECRET
PC_TECH_USERNAME
PC_TECH_USER_PASSWORD
KAFKA_BOOTSTRAP_SERVERS
KAFKA_TOPIC
MAX_TIME_VALID_ORDER
```

### Database Migrations

Schema evolution tracked across:
- Initial schema setup (0001)
- Multiple refactoring iterations through 0013
- Silent charge token support (0007)
- External user ID support (0009)

---


## rmx-referral-microservice

**Purpose:** Manage referral relationships and bonuses  
**Framework:** Django REST Framework  
**Python Files:** 85

### API Endpoints

| Endpoint Pattern | Method | Handler | Description |
|---|---|---|---|
| `/referral/status/?` | GET | Status view | Service health check |
| `/referral/sb_tech/?` | GET/POST | SB Tech integration | Referral data sync |
| `/referral/tree/?` | GET | ReferralTreeView | Get referral tree structure |
| `/events/wallet_line/?` | POST | WalletLineEventHandler | Handle wallet line events |
| `/events/history/?` | GET | EventHistoryView | Event audit trail |

### Database Models

```python
class PartnerConfiguration(Model)
    - partner_id
    - commission_rate
    - referral_link_url
    - bonus_threshold
    - configuration_json

class ReferralUserTree(Model)
    - user_id
    - referrer_id
    - tree_id
    - depth_level
    - created_at
    - relationship_type

class ReferralHistoryModel(Model)
    - user_id
    - referrer_id
    - bonus_amount
    - status
    - timestamp

class WalletNewLineEventHistoryModel(Model)
    - event_id
    - wallet_id
    - line_id
    - amount
    - event_type

class IncomingEventModel(Model)
    - event_id
    - source_service
    - event_data
    - processed_at
```

### Key Business Logic

1. **Referral Tree Management**
   - Build hierarchical referral relationships
   - Track referral depth and commission chains
   - Multi-level commission distribution

2. **Event Processing**
   - Listen for wallet line creation events
   - Trigger referral bonus calculations
   - Event audit trail

3. **Partner Configuration**
   - Commission rate management
   - Referral URL generation
   - Bonus threshold configuration

### Migrations

23 migrations tracking:
- Initial referral tree setup
- Tree ID support
- Event history tracking
- Auto-increment fixes and merges

---


## gmx-wallet-service

**Purpose:** GMX platform wallet management (parallel to rmx-wallet-service)  
**Framework:** Django  
**Python Files:** 84  
**Architecture:** Mirrors rmx-wallet-service structure

### Key Differences from rmx-wallet-service

- Same core models and API patterns
- GMX-specific company/partner configurations
- Adapted integration points for GMX ecosystem

### Models

```python
class Wallet
class WalletLine
class CommissionConfig
class ExternalOrder
class PartnerTransactionApiKeys
class SilentChargeTokenChaneyPaymentsModel
```

### API Structure

Similar REST endpoints to rmx-wallet-service:
- Wallet listing and detail
- Balance queries (global, by company)
- Wallet line creation and management
- Transaction key management

### Environment Configuration

Subset of rmx-wallet-service environment variables, focused on:
- Database connection (RDS)
- OIDC/OAuth endpoints
- Partner authentication
- Kafka messaging

---


## rmx-pc-service (Points Calculator Service)

**Purpose:** Core points/credits calculation and processing engine  
**Framework:** Async Python (likely Celery for task processing)  
**Python Files:** 167

### Key Processing Modules

1. **process_free_bets_and_spins/**
   - Models: CompanyForProcessModel, ProcessFreeBetsAndSpinsModel, ProcessResultModel
   - Process free bet and spin rewards

2. **process_virtual_shop_to_cameleon/**
   - Models: ProductModel, ProductGroupModel, ProcessCompanyModel
   - Virtual shop product processing
   - Integration with Cameleon platform

3. **new_process_free_bets_and_spins/**
   - Updated implementation: ProductDefinitionModel, ProductsGroupModel
   - ProcessProductResultModel, ProcessFreeBetsAndSpinsModel

4. **common_process/**
   - Shared processing models:
     - ProcessModel (base process definition)
     - ProcessConstantsModel (business constants)
     - ProcessKeyStorageModel (state management)
     - ProcessStepModel (workflow steps)
     - ProcessLogModel (audit trail)
     - ProcessUserModel (user context)

5. **reports/**
   - Models: ExtUserMappingWithWalletLinesModel
   - UserLoginAndPointsDailyModel
   - Reporting and analytics

### Data Models

```python
class ProcessModel(Model)
    - process_id
    - process_type
    - status
    - created_at

class ProcessConstantsModel(Model)
    - constant_key
    - constant_value
    - business_logic_version

class ProcessStepModel(Model)
    - process_id
    - step_number
    - step_name
    - status
    - result_data

class ProcessLogModel(Model)
    - process_id
    - log_level
    - message
    - timestamp

class ProductModel(Model)
    - product_id
    - product_name
    - virtual_shop_id
    - price
    - metadata
```

### Key Business Logic

1. **Free Bets & Spins Processing**
   - Calculation engine for bonus conversions
   - Company-specific configuration support
   - Result tracking and audit

2. **Virtual Shop Processing**
   - Product catalog management
   - Price and availability tracking
   - Cameleon platform integration (external shop system)

3. **Points Calculation**
   - Multi-dimensional point types
   - User-specific multipliers
   - Historical tracking

### Processing Workflow

```
Input Event/Trigger
    ↓
ProcessModel setup
    ↓
ProcessConstantsModel lookup
    ↓
ProcessStepModel execution chain
    ↓
Result calculation
    ↓
ProcessLogModel audit
    ↓
Output/Event publishing
```

---


---

# Stella Waysun Platform

## gmx-microservice-virtual-shop

**Purpose:** Virtual shop management for GMX platform  
**Framework:** Python (likely FastAPI or Flask)  
**Python Files:** 96

### Likely Architecture

- Product catalog API
- Shop configuration
- Purchase processing
- Integration with wallet services

---

## gmx-waysun-virtual-store

**Purpose:** Enhanced virtual store with event-driven updates  
**Framework:** Python  
**Python Files:** 115

### Likely Components

- Store configuration API
- Real-time inventory management
- Event streaming for stock updates
- Purchase transaction handling

---

## gmx-waysun-user-context

**Purpose:** User context and session management  
**Framework:** Python  
**Python Files:** 29

### Likely Components

- User session management
- Context propagation across services
- User preference storage
- Authentication context

---

# Cross-Cutting Concerns

## Authentication & Authorization

### Patterns Identified

1. **OIDC/OAuth2**
   - Endpoint: `OIDC_AUTHENTICATION_URL`
   - Client: `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`
   - Token-based: `JWT_EXTRA_SECRET_KEY`

2. **Bearer Token Authorization**
   - `BearerAuthorization` class in services
   - Used for inter-service communication
   - Partner API key validation

3. **PC Tech Authentication**
   - Username: `PC_TECH_USERNAME`
   - Password: `PC_TECH_USER_PASSWORD`
   - Service-to-service authentication

## Messaging Patterns

### Kafka Integration

Services implement:
- **KafkaService** class for producer/consumer
- Topic-based event publishing
- Event consumption and processing

### Topics (Inferred)

- Wallet line events
- Referral bonus events
- Points calculation results
- Virtual shop updates

## Database Patterns

### Django ORM Models

All services use:
- UUID primary keys (consistent pattern)
- Timestamps (created_at, updated_at)
- Status fields for state machines
- Foreign key relationships

### Schema Evolution

- Multiple migration files per service
- Additive migrations (backward compatible)
- Field addition and model refactoring
- Data migration support

## Configuration Management

### Environment-Based

1. **Database Configuration**
   - RDS_HOSTNAME, RDS_PORT, RDS_DB_NAME
   - RDS_USERNAME, RDS_PASSWORD
   - Connection pooling: CONN_MAX_AGE

2. **Caching**
   - DJANGO_REDIS_CACHE_URI

3. **Logging**
   - DJANGO_LOG_LEVEL
   - DEBUG mode: DJANGO_DEBUG

4. **Security**
   - DJANGO_SECRET_KEY
   - DJANGO_ALLOWED_HOSTS
   - DJANGO_SITE_URL

5. **External Services**
   - OIDC endpoints
   - Kafka broker: KAFKA_BOOTSTRAP_SERVERS

## Inter-Service Communication

### HTTP REST Calls

Patterns suggest:
- Direct service-to-service calls via HTTP
- Bearer token authentication
- Timeout handling (MAX_TIME_VALID_ORDER)

### Service Dependencies

```
rmx-wallet-service
    ← receives events from rmx-pc-service
    ← receives events from rmx-referral-microservice

rmx-pc-service (Hub)
    → publishes points calculations
    → triggers wallet updates

rmx-referral-microservice
    ← listens to wallet events
    → publishes referral bonuses

gmx-wallet-service
    (Mirrors rmx-wallet-service)
    Parallel GMX ecosystem
```

## Concurrency Patterns

### Async Processing

- Process models suggest batch/async processing
- Celery likely used for background tasks
- Event-driven workflow execution

### State Management

- ProcessKeyStorageModel for process state
- ProcessStepModel for step-by-step execution
- ProcessLogModel for audit trail

## Error Handling

### Model-Based Approach

- Status fields track process state
- ProcessLogModel captures errors
- Result models store outcomes

### Retry Patterns

- Process can be restarted
- Step-level logging for debugging
- Audit trail for compliance

---

## Go Translation Strategy

### High-Level Mapping

| Python Pattern | Go Equivalent |
|---|---|
| Django Models | Database layer (GORM/sqlc) |
| Django REST Views | HTTP handlers (gorilla/mux) |
| Django URLs | Router configuration |
| Serializers | JSON marshaling/unmarshaling |
| Django Admin | Admin API endpoints |
| Signals/Hooks | Event listeners/callbacks |
| Celery Tasks | Goroutines + channels |
| Kafka Service | kafka-go library |
| OIDC Auth | Standard Go OAuth2 library |
| Django Settings | Environment-based config |

### Key Dependencies

**Database:**
- GORM or sqlc for ORM/database layer
- Migration support (golang-migrate)

**Web Framework:**
- Chi or Echo for routing
- Gin for high-performance APIs

**Messaging:**
- kafka-go for Kafka integration
- RabbitMQ client if needed

**Auth:**
- coreos/go-oidc for OIDC
- jwt-go for JWT tokens

**Config:**
- viper for configuration management
- dotenv for environment variables

### Service Boundary Mapping

Each Python service maps to one Go microservice:
- rmx-wallet-service → rmx-wallet-go
- rmx-pc-service → rmx-pc-calculator-go
- rmx-referral-microservice → rmx-referral-go
- gmx-wallet-service → gmx-wallet-go
- rmx-cs-admin → rmx-admin-api-go

---


---

## Detailed API Mappings

### rmx-referral-microservice - Complete URL Map

```
GET  /referral/status/?
     Handler: GetUserReferralHistoryForSbTokenApiView
     Purpose: Get referral history for SB Tech token
     Response: User referral transaction history

GET  /referral/sb_tech/?
     Handler: GetUserReferralLinksForSbTokenApiView
     Purpose: Get referral links for SB Tech
     Response: List of active referral links

POST /referral/history/?
     Handler: ReferralHistoryCreateView
     Purpose: Create referral history entry
     Request: {user_id, referrer_id, bonus_amount, ...}

GET  /referral/finalize/<referral_token>
     Handler: ReferralFinalizeReferralTokenSbTechTokenView
     Purpose: Finalize referral token processing
     Params: referral_token (pattern: [a-zA-Z0-9._-]+)

GET  /referral/<referral_token>/?
     Handler: ReferralStartProcessRedirectView
     Purpose: Start referral process, likely redirects
     Params: referral_token (pattern: [a-zA-Z0-9._-]+)
```

### rmx-pc-service - Main URL Routing

```
Health Check:
GET  /health_check/?

Admin:
GET  /pc_admin/

Documentation:
GET  /pc_docs/

Event Publishing:
POST /pc/process_send_event/

Process Management:
GET  /pc/process/
POST /pc/process/

Referral Bonus Processing:
POST /pc/referral_bonus/

User Activity Top-up:
POST /pc/user_activity_top_up/

Token Exchange (SB Tech):
GET  /pc/token_exchange/sb_tech/
POST /pc/token_exchange/sb_tech/

Token Exchange (User Info):
GET  /pc/token_exchange/for_user_info/sb_tech/

Token Exchange (Current Balance):
GET  /pc/token_exchange/for_current_balance/sb_tech/

Virtual Shop Payment:
POST /pc/virtual_shop_payment/
```

---

## Kafka Event Architecture

### Event Publishing Pattern

All wallet events are published to Kafka with structured payloads:

```python
{
    "user_sub": "user_subject_identifier",
    "originator": "service_originator",
    "event_data": {
        # Context-specific data
    },
    "event_type": "WALLET_NEW_LINE",  # or other types
    "event_date": "ISO8601_timestamp",
    "api_message_request_id": "unique_request_id"
}
```

### Event Types

1. **WALLET_NEW_LINE** - New transaction/wallet line created
2. **REFERRAL_BONUS** - Referral bonus processed
3. **POINTS_CALCULATED** - Points calculation completed
4. **VIRTUAL_SHOP_PURCHASE** - Virtual shop transaction
5. **COMMISSION_CALCULATED** - Commission computation finished

### Producer Implementation (Singleton Pattern)

```python
class KafkaService(metaclass=Singleton):
    - bootstrap_servers: Kafka cluster URLs
    - request_timeout_ms: Message send timeout
    - api_version: Kafka protocol version
    - topic: Target topic for publishing
    
    Methods:
    - send_event(): Class method, creates/reuses singleton
    - _send_event(): Actual publishing logic
    - on_send_success(): Callback on success
    - on_send_error(): Callback on error
```

### Consumer Architecture

Services consuming events:
- **rmx-referral-microservice**: Listens for WALLET_NEW_LINE events
- **rmx-wallet-service**: Publishes WALLET_NEW_LINE events
- **rmx-cs-admin**: May consume events for admin dashboard

---

## Authentication & Token Exchange

### OIDC Integration

```
OIDC_AUTHENTICATION_URL: OAuth2/OpenID Connect server URL
OIDC_CLIENT_ID: Application client identifier
OIDC_CLIENT_SECRET: Application client secret
```

### Token Exchange Flows

1. **SB Tech Token Exchange**
   - Endpoint: `/pc/token_exchange/sb_tech/`
   - Purpose: Convert internal tokens to SB Tech format

2. **User Info Exchange**
   - Endpoint: `/pc/token_exchange/for_user_info/sb_tech/`
   - Retrieves user profile data

3. **Current Balance Exchange**
   - Endpoint: `/pc/token_exchange/for_current_balance/sb_tech/`
   - Returns user wallet balance

### Bearer Authorization

```python
class BearerAuthorization:
    - Extracts Bearer token from request
    - Validates against OIDC endpoint
    - Sets authenticated user context
```

---

## Process Management Architecture

### State Machine Pattern

```
ProcessModel
    ├── status: PENDING | PROCESSING | COMPLETED | FAILED
    ├── process_id: Unique identifier
    ├── process_type: FREE_BETS | VIRTUAL_SHOP | USER_ACTIVITY | ...
    └── ProcessStepModel[]
        ├── step_number: Sequential number
        ├── step_name: Descriptive name
        └── status: PENDING | EXECUTED | FAILED

ProcessLogModel
    ├── process_id: Reference
    ├── log_level: INFO | WARNING | ERROR
    ├── message: Log entry
    └── timestamp: When recorded

ProcessKeyStorageModel
    ├── process_id: Reference
    ├── storage_key: Variable name
    └── storage_value: Current value (JSON)
```

### Process Execution Flow

1. **Initialization**
   - Create ProcessModel record
   - Load ProcessConstantsModel for business rules
   - Initialize ProcessKeyStorageModel

2. **Step Execution**
   - Create ProcessStepModel record
   - Execute business logic
   - Log results to ProcessLogModel

3. **Completion**
   - Mark ProcessModel as COMPLETED/FAILED
   - Store results in ProcessLogModel
   - Publish completion event to Kafka

---

## Virtual Shop Integration

### Virtual Shop Models

```python
class ProductModel
    - product_id: UUID
    - product_name: String
    - virtual_shop_id: ForeignKey
    - price: Decimal
    - currency: String (e.g., 'EUR')
    - metadata: JSON (tags, categories, etc.)
    - is_active: Boolean
    - created_at: DateTime
    - updated_at: DateTime

class ProductGroupModel
    - group_id: UUID
    - group_name: String
    - products: ProductModel[]
    - metadata: JSON
    - ordering: Integer (for display)

class ProcessProductGroupFileModel
    - process_id: ForeignKey(ProcessModel)
    - group_file_id: String
    - status: PENDING | PROCESSED | FAILED
    - result_data: JSON
```

### Shop Processing Workflow

```
Virtual Shop Input File
    ↓
Load ProductGroupModel configuration
    ↓
Parse products and pricing
    ↓
ProcessProductGroupFileModel state tracking
    ↓
Validate against Cameleon shop system
    ↓
Create/Update ProductModel records
    ↓
Publish update events
    ↓
Complete with audit log
```

### Integration: Cameleon System

- External shop/product management system
- Real-time synchronization of catalog
- Process module: `process_virtual_shop_to_cameleon`
- Bidirectional data sync (import/export)

---

## Commission Calculation

### Commission Config Model

```python
class CommissionConfig(Model)
    - config_id: UUID
    - partner_id: String
    - commission_rate: Decimal (0.00 - 1.00)
    - commission_type: PERCENTAGE | FIXED
    - tier_configs: JSON (multi-tier rates)
    - effective_from: DateTime
    - effective_to: DateTime (nullable)
    - metadata: JSON
```

### Commission Calculation Flow

1. **Wallet Line Creation**
   - POST /wallet/line/create/from_company/without_commission
     - Creates line WITHOUT automatic commission

   - POST /wallet/line/create/from_company/
     - Creates line WITH automatic commission calculation

2. **Commission Computation**
   - Look up CommissionConfig for partner
   - Apply tier-based rates if configured
   - Create commission WalletLine entry
   - Log transaction in ProcessLogModel

### Silent Charge (BPR) Implementation

```python
class SilentChargeTokenChaneyPaymentsModel(Model)
    - token_id: UUID
    - wallet_id: ForeignKey
    - external_user_id: String
    - chaney_token: Encrypted token
    - permissions: JSON
    - is_active: Boolean
    - last_used: DateTime
```

**Endpoints:**
- GET  /wallet/bpr/silent/list - List active silent charge tokens
- POST /wallet/bpr/silent/ - Create new silent charge token
- POST /wallet/bpr/create/ - Execute silent charge payment

---

## Admin & Configuration Services

### rmx-cs-admin Structure

```
Purpose: Customer Service & Admin management
Models:
    - PartnerConfiguration (same as referral/wallet)
    - User role management
    - Permission controls
    - Audit logs

Endpoints:
    - Partner configuration CRUD
    - User management
    - Commission rate updates
    - Report generation
```

---

## Points Calculator Services

### sbtech-rewards-point-calculator

**Purpose:** Calculate rewards points for SBTech betting partners

**Key Environment Variables:**
```
RMX_URL: RMX platform base URL
RMX_CLIENT_ID: OAuth client ID
RMX_CLIENT_PASSWORD: OAuth password
RMX_OIDC_USERNAME: OIDC username
RMX_OIDC_PASSWORD: OIDC password
SN_COMPANY_ID: Sport Nation company ID in RMX
RZS_COMPANY_ID: Red Zone Sports company ID
GIVEMEBET_COMPANY_ID: GiveMeBet company ID
DATA_WRITER_CLASS: Storage backend (file/S3)
DATA_READER_CLASS: Read backend (file/S3)
```

**Logic:**
- Reads SBTech betting data
- Calculates points based on stake amount
- Applies company-specific multipliers
- Writes results to storage
- Publishes to RMX platform

### argyll-bet-stake-to-rmx-points-calculator-api

**Purpose:** Bet stake to RMX points conversion API

**Minimal implementation:** 19 Python files
- Likely stateless service
- Takes betting stake input
- Returns calculated points
- Stateless REST API

---

## Data Persistence & Caching

### Database Configuration

All services use:
```
RDS (AWS Relational Database Service)
    - Host: RDS_HOSTNAME
    - Port: RDS_PORT (default 5432 for PostgreSQL)
    - Database: RDS_DB_NAME
    - Username: RDS_USERNAME
    - Password: RDS_PASSWORD
    - Connection Pooling: CONN_MAX_AGE (Django)
```

### Cache Layer

```
DJANGO_REDIS_CACHE_URI: Redis cache URL
    Format: redis://:password@host:port/db
    Used for:
        - Session storage
        - User authentication tokens
        - Computed results caching
        - Rate limiting counters
```

### Connection Patterns

- Django ORM manages connection pooling
- Timeouts configured via CONN_MAX_AGE
- Automatic reconnection on failure
- Transaction support for atomic operations

---


---

# Stella Waysun Platform - Detailed Analysis

## gmx-microservice-virtual-shop

**Purpose:** Core virtual shop API and product management  
**Framework:** Django REST Framework  
**Python Files:** 96

### API Endpoints

```
Product Management:
GET  /virtual_shop/products
     List all products with filters/pagination

POST /virtual_shop/make_payment
     Initiate payment for product purchase
     Request: {product_id, quantity, payment_method, ...}

GET  /virtual_shop/purchased
     Get user's purchased products
     Query: {user_id, date_range, ...}

Special Products:
GET  /virtual_shop/special_products
     Limited-time promotion products

GET  /virtual_shop/special_continuous_products
     Ongoing special product offers

GET  /virtual_shop/charity_products
     Charity/donation product catalog

Process Integration:
GET  /virtual_shop/pc/order/<process_id>
     Get order details linked to PC process
     Params: process_id (uuid or identifier)

GET  /virtual_shop/pc/order_line/<order_line_uid>
     Get order line item details
     Params: order_line_uid (unique identifier)

GET  /virtual_shop/pc/bonuses_configuration
     Get bonus configuration for PC module

Account Management:
GET  /virtual_shop/my_account/orders
     Get authenticated user's orders

GET  /virtual_shop/my_account/order/<status_token>
     Get specific order details
     Params: status_token (order reference)

GET  /virtual_shop/tags_whitelist/<status_token>
     Get allowed tags for order
     Params: status_token (order reference)

Customer Service Admin:
GET  /virtual_shop/cs_admin_orders
     Admin: View all orders

GET  /virtual_shop/cs_admin_products
     Admin: Manage product catalog

GET  /virtual_shop/cs_admin_purchased
     Admin: View purchased items by users

GET  /virtual_shop/cs_admin_tags
     Admin: Manage product tags whitelist

POST /virtual_shop/cs_admin_tag/change
     Admin: Modify tag configurations
```

### View Classes

```python
class CharityProductsView(APIView)
    - GET: List charity products

class CsAdminOrdersView(APIView)
    - GET: Admin order listing
    - PUT/DELETE: Order management

class CsAdminProductsView(APIView)
    - GET: Product listing (admin)
    - POST/PUT: Product CRUD

class CsAdminPurchasedProductsView(APIView)
    - GET: User purchase history (admin)

class CsAdminTagChangeView(APIView)
    - POST: Modify tag configurations

class CsAdminTagsWhitelistView(APIView)
    - GET/POST: Manage tag whitelist

class MyAccountOrderDetailsView(APIView)
    - GET: User's specific order

class MyAccountOrdersView(APIView)
    - GET: User's all orders

class PaymentRequestView(APIView)
    - POST: Initiate payment

class PcBonusesConfigurationView(APIView)
    - GET: PC bonus settings

class PcOrderLineView(APIView)
    - GET: Order line details
    - PUT: Update order line

class PcOrderView(APIView)
    - GET: Order details
    - PUT: Update order
    - DELETE: Cancel order

class ProductsView(APIView)
    - GET: List products
    - Filtering by tags, categories
    - Pagination support

class PurchasedProductsView(APIView)
    - GET: User purchased items

class SpecialContinuousProductsView(APIView)
    - GET: Ongoing specials

class SpecialProductsView(APIView)
    - GET: Limited-time specials

class TagsWhitelistView(APIView)
    - GET: Allowed tags for context
```

---

## gmx-waysun-virtual-store

**Purpose:** Enhanced virtual store with real-time inventory and event streaming  
**Framework:** Django/FastAPI hybrid  
**Python Files:** 115

### API Endpoints

```
Payment Gateway:
POST /payment_gateway/initialize
     Initialize payment transaction

POST /payment_gateway/confirm
     Confirm/complete payment

GET  /payment_gateway/status/<transaction_id>
     Check payment status

GET  /payment_gateway/methods
     Get available payment methods

Inventory Management:
GET  /store/inventory/products
     Real-time product availability

POST /store/inventory/update
     Update product stock

Event Streaming:
WebSocket /store/events
     Real-time inventory updates
     Subscribe to product changes

Store Configuration:
GET  /store/config
     Store settings and features

POST /store/config/update
     Update store configuration
```

### Key Components

**Payment Gateway:**
- Multiple payment method support
- Transaction status tracking
- Webhook integration for payment providers
- Retry mechanisms for failed payments

**Inventory System:**
- Real-time stock levels
- Low inventory alerts
- Concurrent purchase handling
- Backorder support

**Event Streaming:**
- WebSocket connections for live updates
- Product availability changes
- Price updates
- Order status notifications

---

## gmx-waysun-user-context

**Purpose:** User session and context management across platform  
**Framework:** FastAPI/Starlette  
**Python Files:** 29

### API Structure

```
Main Entry: /user_context/api/endpoints/main.py

Session Management:
GET  /context/session
     Get current user session
     Returns: {user_id, permissions, preferences, ...}

POST /context/session/start
     Initiate new session
     Request: {credentials, platform, ...}

POST /context/session/end
     Terminate session

User Profile:
GET  /context/user/profile
     Get user profile data

GET  /context/user/preferences
     Get user settings

PUT  /context/user/preferences
     Update user settings

Context Propagation:
GET  /context/propagate
     Prepare context for microservice calls
     Returns: {headers, auth_token, user_context}

Feature Flags:
GET  /context/features
     Get enabled features for user

GET  /context/experiments
     Get active experiments for user
```

### Core Models

```python
class UserContext(BaseModel)
    - user_id: UUID
    - session_id: UUID
    - permissions: List[str]
    - user_preferences: Dict
    - active_features: List[str]
    - created_at: DateTime
    - expires_at: DateTime

class SessionContext(BaseModel)
    - session_id: UUID
    - user_id: UUID
    - start_time: DateTime
    - last_activity: DateTime
    - ip_address: String
    - user_agent: String

class FeatureFlags(BaseModel)
    - feature_name: String
    - enabled: Boolean
    - rollout_percentage: Float
    - user_groups: List[str]
```

### Session Lifecycle

```
User Login
    ↓
POST /context/session/start
    ↓
Create UserContext record
    ↓
Generate session_id & auth_token
    ↓
Store in user-context service
    ↓
Return to client for propagation
    ↓
Include in microservice calls
    ↓
POST /context/session/end (on logout)
    ↓
Cleanup session resources
```

---

## Stella Platform Integration Flow

```
User Interface
    ↓
    ├→ gmx-waysun-user-context (Get session context)
    │   ↓
    │   Create UserContext with permissions
    │
    ├→ gmx-microservice-virtual-shop (Browse products)
    │   ↓
    │   GET /virtual_shop/products (with context)
    │   ↓
    │   Return filtered products by user tier/permissions
    │
    ├→ gmx-waysun-virtual-store (Make purchase)
    │   ↓
    │   POST /payment_gateway/initialize
    │   ↓
    │   Process payment
    │   ↓
    │   POST /payment_gateway/confirm
    │   ↓
    │   WebSocket event to inventory
    │
    └→ Event stream updates
        ↓
        Real-time status to client
```

---

## Database Schema Patterns

### Common Model Types

All Stella services follow Django ORM patterns:

```python
# Timestamps (universal)
created_at = DateTimeField(auto_now_add=True)
updated_at = DateTimeField(auto_now=True)

# Identifiers
id = UUIDField(primary_key=True, default=uuid4)

# Status tracking
status = CharField(
    max_length=20,
    choices=[
        ('PENDING', 'Pending'),
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
        ('CANCELLED', 'Cancelled'),
    ]
)

# Soft deletes (optional)
is_deleted = BooleanField(default=False)
deleted_at = DateTimeField(null=True)
```

### Relationship Patterns

```python
# One-to-Many
class Order(Model):
    user = ForeignKey(User)
    items = OrderLine[]

# Many-to-Many
class Product(Model):
    tags = ManyToManyField(Tag)
    categories = ManyToManyField(Category)

# Denormalization for performance
class UserPurchaseCache(Model):
    user_id = UUIDField(indexed=True)
    total_spent = DecimalField()
    purchase_count = IntegerField()
    last_purchase_date = DateTimeField()
    # Updated via signal/Celery task
```

---

## Migration Patterns

### rmx-wallet-service Migrations

```
0001_initial
    - Create Wallet, WalletLine, CommissionConfig tables

0002-0005
    - Field additions and refactoring

0006_auto_20180509
    - Index optimization

0007_silentchargetokenchaneypaymentsmodel
    - Add BPR/silent charge support

0008-0010
    - Additional features and fixes

0011-0013
    - Recent updates through 2019
```

### Migration Strategy for Go

- Use golang-migrate for schema management
- SQL-based migrations (not ORM-generated)
- Version control in same repository
- Atomic transactions for data safety

---


---

# Go Translation Strategy & Implementation Guide

## Repository Structure for Go Services

### Recommended Layout

```
rmx-wallet-service-go/
├── cmd/
│   └── server/
│       └── main.go                 # Application entry point
├── internal/
│   ├── models/
│   │   ├── wallet.go              # Data models/entities
│   │   └── transaction.go
│   ├── handlers/
│   │   ├── wallet_handler.go      # HTTP handlers
│   │   └── transaction_handler.go
│   ├── services/
│   │   ├── wallet_service.go      # Business logic
│   │   └── transaction_service.go
│   ├── repository/
│   │   ├── wallet_repo.go         # Database layer (GORM)
│   │   └── transaction_repo.go
│   ├── middleware/
│   │   ├── auth.go                # Authentication middleware
│   │   └── logging.go
│   ├── config/
│   │   └── config.go              # Configuration management
│   └── kafka/
│       └── producer.go            # Message publishing
├── pkg/
│   ├── errors/
│   │   └── errors.go              # Custom error types
│   └── logger/
│       └── logger.go              # Logging utilities
├── migrations/
│   ├── 001_initial_schema.up.sql
│   └── 001_initial_schema.down.sql
├── tests/
│   ├── integration/
│   └── unit/
├── docker/
│   └── Dockerfile
├── go.mod
├── go.sum
├── .env.example
└── README.md
```

## Key Go Dependencies

### Web Framework

```go
import "github.com/labstack/echo/v4"           // or chi/mux
// Handler signature matching Django views

func (h *WalletHandler) GetWalletList(c echo.Context) error {
    // Equivalent to WalletsListView.as_view()
}
```

### Database ORM

```go
import "gorm.io/gorm"

// Models replace Django ORM models
type Wallet struct {
    ID        uuid.UUID `gorm:"primaryKey"`
    UserID    string
    Balance   decimal.Decimal
    Currency  string
    CreatedAt time.Time
    UpdatedAt time.Time
}
```

### Kafka Client

```go
import "github.com/segmentio/kafka-go"

// Replaces KafkaService class
type EventPublisher struct {
    writer *kafka.Writer
    topic  string
}

func (ep *EventPublisher) PublishEvent(ctx context.Context, event Event) error {
    // Send to Kafka
}
```

### Database Migrations

```go
import "github.com/golang-migrate/migrate/v4"

// SQL-based migrations, not ORM-generated
// Keep in sync with Python versions
```

### Authentication & Authorization

```go
import "github.com/coreos/go-oidc/v3/oidc"
import "github.com/golang-jwt/jwt/v5"

// Replaces BearerAuthorization + OIDC config
type OIDCAuthenticator struct {
    verifier *oidc.IDTokenVerifier
}
```

### Configuration Management

```go
import "github.com/spf13/viper"

// Load from environment variables
// Replaces Django settings
viper.SetDefault("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
viper.BindEnv("KAFKA_BOOTSTRAP_SERVERS")
```

---

## API Handler Translation Template

### Django REST Framework View → Go Echo Handler

**Python (Django):**
```python
class WalletsListView(APIView):
    def get(self, request):
        wallets = Wallet.objects.all()
        serializer = WalletSerializer(wallets, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        serializer = WalletSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
```

**Go Equivalent:**
```go
type WalletHandler struct {
    walletService *services.WalletService
}

// GET /wallet/
func (h *WalletHandler) ListWallets(c echo.Context) error {
    ctx := c.Request().Context()
    wallets, err := h.walletService.ListWallets(ctx)
    if err != nil {
        return echo.NewHTTPError(500, err.Error())
    }
    return c.JSON(200, wallets)
}

// POST /wallet/
func (h *WalletHandler) CreateWallet(c echo.Context) error {
    ctx := c.Request().Context()
    var req CreateWalletRequest
    
    if err := c.BindJSON(&req); err != nil {
        return echo.NewHTTPError(400, "Invalid request body")
    }
    
    wallet, err := h.walletService.CreateWallet(ctx, req)
    if err != nil {
        return echo.NewHTTPError(500, err.Error())
    }
    
    return c.JSON(201, wallet)
}
```

---

## Business Logic Translation

### Django Signal → Go Callback/Listener Pattern

**Python (Django Signals):**
```python
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=WalletLine)
def on_wallet_line_created(sender, instance, created, **kwargs):
    if created:
        # Publish Kafka event
        KafkaService.send_event(...)
        # Update referral
        ReferralService.process_referral(...)
```

**Go Equivalent:**
```go
// After creating WalletLine in database:
type WalletLineService struct {
    kafkaPublisher *kafka.Writer
    referralSvc    *ReferralService
}

func (ws *WalletLineService) CreateLine(ctx context.Context, req CreateLineRequest) (*WalletLine, error) {
    line := &WalletLine{...}
    
    // Create in database
    if err := ws.repo.Create(ctx, line); err != nil {
        return nil, err
    }
    
    // Publish event (replaces Django signal)
    if err := ws.publishWalletLineEvent(ctx, line); err != nil {
        // Log but don't fail (fire-and-forget)
        log.Warn("Failed to publish event", "error", err)
    }
    
    // Process referral
    if err := ws.referralSvc.ProcessReferral(ctx, line); err != nil {
        log.Warn("Failed to process referral", "error", err)
    }
    
    return line, nil
}
```

---

## Database Repository Pattern

### Django ORM Queries → GORM Repository

**Python (Django ORM):**
```python
# Single record
wallet = Wallet.objects.get(id=wallet_id)

# List with filters
wallets = Wallet.objects.filter(user_id=user_id, currency='EUR')

# Aggregation
balance = WalletLine.objects.filter(wallet=wallet).aggregate(
    total_amount=Sum('amount')
)['total_amount']

# Related objects
lines = wallet.walletline_set.all()
```

**Go Equivalent:**
```go
type WalletRepository struct {
    db *gorm.DB
}

// Get single
func (r *WalletRepository) GetByID(ctx context.Context, id uuid.UUID) (*Wallet, error) {
    var wallet Wallet
    if err := r.db.WithContext(ctx).First(&wallet, "id = ?", id).Error; err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, nil
        }
        return nil, err
    }
    return &wallet, nil
}

// List with filters
func (r *WalletRepository) ListByUser(ctx context.Context, userID string, currency string) ([]Wallet, error) {
    var wallets []Wallet
    if err := r.db.WithContext(ctx).Where("user_id = ? AND currency = ?", userID, currency).Find(&wallets).Error; err != nil {
        return nil, err
    }
    return wallets, nil
}

// Aggregation
func (r *WalletRepository) GetTotalBalance(ctx context.Context, walletID uuid.UUID) (*decimal.Decimal, error) {
    var total decimal.Decimal
    if err := r.db.WithContext(ctx).
        Model(&WalletLine{}).
        Where("wallet_id = ?", walletID).
        Select("COALESCE(SUM(amount), 0)").
        Scan(&total).Error; err != nil {
        return nil, err
    }
    return &total, nil
}

// Related objects
func (r *WalletRepository) GetLines(ctx context.Context, walletID uuid.UUID) ([]WalletLine, error) {
    var lines []WalletLine
    if err := r.db.WithContext(ctx).Where("wallet_id = ?", walletID).Find(&lines).Error; err != nil {
        return nil, err
    }
    return lines, nil
}
```

---

## Concurrency & Async Processing

### Django Celery Tasks → Go Goroutines/Channels

**Python (Celery):**
```python
@shared_task
def process_referral_bonus(wallet_line_id):
    line = WalletLine.objects.get(id=wallet_line_id)
    bonus = calculate_bonus(line)
    create_wallet_line(bonus)
    publish_event(bonus)

# Usage:
post_save.connect(
    lambda sender, instance, **kwargs: process_referral_bonus.delay(instance.id),
    sender=WalletLine
)
```

**Go Equivalent:**
```go
type ReferralProcessor struct {
    taskQueue chan uuid.UUID
    done      chan struct{}
}

func (rp *ReferralProcessor) Start(ctx context.Context, poolSize int) {
    for i := 0; i < poolSize; i++ {
        go rp.worker(ctx)
    }
}

func (rp *ReferralProcessor) worker(ctx context.Context) {
    for {
        select {
        case lineID := <-rp.taskQueue:
            rp.processReferralBonus(ctx, lineID)
        case <-rp.done:
            return
        case <-ctx.Done():
            return
        }
    }
}

func (rp *ReferralProcessor) processReferralBonus(ctx context.Context, lineID uuid.UUID) {
    line, err := rp.lineRepo.GetByID(ctx, lineID)
    if err != nil {
        log.Error("Failed to get line", "error", err)
        return
    }
    
    bonus := rp.calculateBonus(line)
    if err := rp.walletSvc.CreateLine(ctx, bonus); err != nil {
        log.Error("Failed to create bonus line", "error", err)
        return
    }
    
    if err := rp.publisher.Publish(ctx, bonus); err != nil {
        log.Error("Failed to publish event", "error", err)
    }
}

// Usage:
processor := NewReferralProcessor(...)
processor.Start(ctx, 5) // 5 worker goroutines

// Queue task:
processor.taskQueue <- lineID
```

---

## Testing Strategy

### Unit Tests

```go
package services

import (
    "context"
    "testing"
    "github.com/stretchr/testify/assert"
)

func TestWalletService_GetBalance(t *testing.T) {
    // Arrange
    mockRepo := &MockWalletRepository{}
    service := NewWalletService(mockRepo)
    
    // Act
    balance, err := service.GetBalance(context.Background(), walletID)
    
    // Assert
    assert.NoError(t, err)
    assert.Equal(t, expectedBalance, balance)
}
```

### Integration Tests

```go
func TestWalletAPI_CreateWallet(t *testing.T) {
    // Setup test database
    db := setupTestDB(t)
    defer db.Close()
    
    // Setup service
    repo := repository.NewWalletRepo(db)
    svc := services.NewWalletService(repo)
    handler := handlers.NewWalletHandler(svc)
    
    // Execute request
    e := echo.New()
    req := httptest.NewRequest("POST", "/wallet/", createWalletBody)
    rec := httptest.NewRecorder()
    c := e.NewContext(req, rec)
    
    err := handler.CreateWallet(c)
    
    // Assert
    assert.NoError(t, err)
    assert.Equal(t, 201, rec.Code)
}
```

---

## Deployment & Configuration

### Docker Multi-Stage Build

```dockerfile
# Stage 1: Build
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o rmx-wallet-service ./cmd/server

# Stage 2: Runtime
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/rmx-wallet-service .
EXPOSE 8080
CMD ["./rmx-wallet-service"]
```

### Environment Configuration

```go
type Config struct {
    // Database
    Database struct {
        Host     string
        Port     int
        Name     string
        User     string
        Password string
        MaxConn  int
    }
    
    // Kafka
    Kafka struct {
        Brokers []string
        Topic   string
    }
    
    // OIDC
    OIDC struct {
        IssuerURL  string
        ClientID   string
        ClientSecret string
    }
    
    // Redis Cache
    Redis struct {
        URL string
    }
    
    // Server
    Server struct {
        Port     int
        Debug    bool
        LogLevel string
    }
}

func LoadConfig() *Config {
    viper.AutomaticEnv()
    viper.SetDefault("SERVER_PORT", 8080)
    viper.SetDefault("LOG_LEVEL", "info")
    
    config := &Config{}
    if err := viper.Unmarshal(config); err != nil {
        panic(err)
    }
    return config
}
```

---

## Error Handling

### Custom Error Types

```go
package errors

type ServiceError struct {
    Code    string
    Message string
    Err     error
}

type ValidationError struct {
    Field   string
    Message string
}

// Usage
func (s *WalletService) CreateWallet(ctx context.Context, req CreateRequest) (*Wallet, error) {
    if req.Balance.IsNegative() {
        return nil, &errors.ValidationError{
            Field:   "balance",
            Message: "balance cannot be negative",
        }
    }
    
    wallet := &Wallet{...}
    if err := s.repo.Create(ctx, wallet); err != nil {
        return nil, &errors.ServiceError{
            Code:    "DB_ERROR",
            Message: "failed to create wallet",
            Err:     err,
        }
    }
    
    return wallet, nil
}
```

---

## Performance Optimization Tips

1. **Connection Pooling**
   - Configure GORM with max connections
   - Use context timeouts

2. **Caching Layer**
   - Cache frequently accessed data
   - Invalidate on updates

3. **Batch Operations**
   - Process events in batches
   - Reduce database round-trips

4. **Indexing Strategy**
   - Add indexes on user_id, wallet_id
   - Composite indexes for common queries

5. **Async Publishing**
   - Non-blocking Kafka publishes
   - Retry logic for failures

---

## Monitoring & Observability

### Structured Logging

```go
import "github.com/rs/zerolog"

logger := zerolog.New(os.Stderr).With().Timestamp().Logger()

logger.Info().
    Str("user_id", userID).
    Str("wallet_id", walletID).
    Decimal("amount", amount).
    Msg("wallet line created")
```

### Metrics

```go
import "github.com/prometheus/client_golang/prometheus"

var (
    walletCreatedTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "wallet_created_total",
            Help: "Total wallets created",
        },
        []string{"status"},
    )
    
    walletBalanceGauge = prometheus.NewGaugeVec(
        prometheus.GaugeOpts{
            Name: "wallet_balance",
            Help: "Current wallet balance",
        },
        []string{"currency"},
    )
)
```

---

## Summary: Python to Go Mapping

| Python | Go |
|---|---|
| Django Models | GORM + Structs |
| Serializers | JSON marshaling |
| APIView classes | Echo/Chi handlers |
| Django ORM queries | GORM repository pattern |
| Signals/Hooks | Callbacks/Listeners |
| Celery tasks | Goroutines + channels |
| KafkaService | kafka-go producer |
| OIDC auth | coreos/go-oidc |
| Django settings | viper config |
| Migrations | golang-migrate |

---

