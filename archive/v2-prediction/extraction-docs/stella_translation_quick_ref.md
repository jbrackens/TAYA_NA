# Stella/Waysun Scala → Go Translation Quick Reference

**Quick lookup for common patterns and their Go equivalents**

---

## API Endpoint Translation

### Tapir Endpoint Definition (Scala)
```scala
// Single endpoint definition
def getAchievementsEndpoint(implicit ec: ExecutionContext): PartialServerEndpoint[...] =
  endpointWithJwtValidation(AchievementEventsReadPermission).get
    .in(basePath / path[AchievementConfigurationRulePublicId](achievementRuleIdPathParam))
    .in(query[Option[String]](QueryParams.fieldValue).default(None))
    .out(statusCode(StatusCode.Ok))
    .out(jsonBody[Response[PaginatedResult[AchievementEvent]]])
    .name("getAchievementEvents")
    .description("Returns achievement events...")

// Server implementation
val endpoint = AchievementEndpoints.getAchievementEventsEndpoint.serverLogic { authContext =>
  { case (ruleId, fieldValue) =>
    boundedContext.getAchievementEvents(projectId, ruleId, fieldValue)
      .map(events => Right(Response.asSuccess(events)))
  }
}
```

### Go Equivalent
```go
// Route definition
func (r *Router) GetAchievementEvents(c *gin.Context) {
    ruleID := c.Param("achievement_rule_id")
    fieldValue := c.DefaultQuery("field_value", "")
    pageSize := c.DefaultQuery("page_size", "20")
    page := c.DefaultQuery("page", "1")

    // Extract auth context from middleware
    authCtx, exists := c.Get("auth")
    if !exists {
        c.JSON(http.StatusUnauthorized, ErrorResponse("unauthorized"))
        return
    }

    // Business logic
    events, err := r.service.GetAchievementEvents(
        c.Request.Context(),
        authCtx.ProjectID,
        ruleID,
        fieldValue,
    )
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse(err.Error()))
        return
    }

    // Response
    c.JSON(http.StatusOK, Response{
        Status: "success",
        Data:   events,
    })
}

// Authentication middleware
func AuthMiddleware(c *gin.Context) {
    token := c.GetHeader("Authorization")
    claims, err := jwt.ValidateToken(token)
    if err != nil {
        c.JSON(http.StatusUnauthorized, ErrorResponse("invalid token"))
        c.Abort()
        return
    }

    c.Set("auth", &AuthContext{
        UserID:          claims.UserID,
        ProjectID:       claims.ProjectID,
        Permissions:     claims.Permissions,
    })
    c.Next()
}
```

---

## Database Query Translation

### Slick Query (Scala)
```scala
// Repository implementation
override def getTransactionHistory(
    walletOwnerId: UserId,
    currencyId: CurrencyId,
    transactionTypes: Set[TransactionType],
    dateRangeStart: Option[OffsetDateTime],
    dateRangeEnd: Option[OffsetDateTime])(implicit ec: ExecutionContext): Future[Seq[TransactionEntity]] =
  db.run {
    transactionTable
      .filter(_.walletOwnerId === walletOwnerId)
      .filter(entity => entity.currencyId === currencyId || entity.exchangeToCurrencyId === currencyId)
      .filterIf(transactionTypes.nonEmpty)(_.transactionType.inSet(transactionTypes))
      .filterOpt(dateRangeStart)((entity, startDate) => entity.transactionDate >= startDate)
      .filterOpt(dateRangeEnd)((entity, endDate) => entity.transactionDate <= endDate)
      .sortBy(_.transactionDate.desc)
      .result
  }
```

### Go Equivalent (sqlc)
```go
// queries.sql (sqlc query file)
-- name: GetTransactionHistory :many
SELECT id, wallet_owner_id, currency_id, exchange_to_currency_id,
       transaction_type, amount, exchange_rate, transaction_date
FROM transactions
WHERE wallet_owner_id = $1
  AND (currency_id = $2 OR exchange_to_currency_id = $2)
  AND CASE
        WHEN sqlc.narg('transaction_types') IS NOT NULL
        THEN transaction_type = ANY(sqlc.arg('transaction_types')::text[])
        ELSE TRUE
      END
  AND CASE
        WHEN sqlc.narg('date_range_start') IS NOT NULL
        THEN transaction_date >= sqlc.arg('date_range_start')::timestamptz
        ELSE TRUE
      END
  AND CASE
        WHEN sqlc.narg('date_range_end') IS NOT NULL
        THEN transaction_date <= sqlc.arg('date_range_end')::timestamptz
        ELSE TRUE
      END
ORDER BY transaction_date DESC;

// Generated Go code (from sqlc)
func (q *Queries) GetTransactionHistory(ctx context.Context, arg GetTransactionHistoryParams) ([]Transaction, error) {
    rows, err := q.db.QueryContext(ctx, getTransactionHistory,
        arg.WalletOwnerID,
        arg.CurrencyID,
        pq.Array(arg.TransactionTypes),
        arg.DateRangeStart,
        arg.DateRangeEnd,
    )
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var items []Transaction
    for rows.Next() {
        var i Transaction
        if err := rows.Scan(&i.ID, &i.WalletOwnerID, &i.CurrencyID, ...); err != nil {
            return nil, err
        }
        items = append(items, i)
    }
    if err := rows.Close(); err != nil {
        return nil, err
    }
    if err := rows.Err(); err != nil {
        return nil, err
    }
    return items, nil
}

// Repository pattern in Go
type TransactionRepository interface {
    GetTransactionHistory(
        ctx context.Context,
        walletOwnerID string,
        currencyID string,
        transactionTypes []string,
        dateRangeStart *time.Time,
        dateRangeEnd *time.Time,
    ) ([]Transaction, error)
}

type postgresTransactionRepository struct {
    queries *sqlc.Queries
}

func (r *postgresTransactionRepository) GetTransactionHistory(
    ctx context.Context,
    walletOwnerID string,
    currencyID string,
    transactionTypes []string,
    dateRangeStart *time.Time,
    dateRangeEnd *time.Time,
) ([]Transaction, error) {
    return r.queries.GetTransactionHistory(ctx, sqlc.GetTransactionHistoryParams{
        WalletOwnerID:    walletOwnerID,
        CurrencyID:       currencyID,
        TransactionTypes: transactionTypes,
        DateRangeStart:   dateRangeStart,
        DateRangeEnd:     dateRangeEnd,
    })
}
```

---

## Kafka Publishing Translation

### Scala Implementation
```scala
// Configuration
case class KafkaProducerConfig(
  bootstrapServers: String,
  topicName: String,
  producer: ProducerConfig,
  serializer: SerializerConfig
)

// Service definition
trait KafkaPublicationService[K, V >: Null] {
  def publish(key: K, value: Option[V])(implicit ec: ExecutionContext)
    : EitherT[Future, EventSubmissionError, KafkaPublicationInfo]
}

// Implementation
class KafkaPublicationServiceImpl[K, V](kafkaConfig: KafkaProducerConfig)
    extends KafkaPublicationService[K, V] {

  private val producer = new KafkaProducer[K, V](properties)

  override def publish(key: K, value: Option[V])(implicit ec: ExecutionContext) = {
    EitherT {
      Future {
        val record = new ProducerRecord[K, V](kafkaConfig.topicName, key, value.orNull)
        try {
          val result = Await.result(Future(producer.send(record).get()), timeout)
          Right(KafkaPublicationInfo.fromRecordMetadata(result))
        } catch {
          case e: TimeoutException => Left(EventSubmissionTimeoutException(e))
          case e: Throwable => Left(UnexpectedEventSubmissionException("error", e))
        } finally {
          producer.flush()
        }
      }
    }
  }
}

// Usage
val result: EitherT[Future, EventSubmissionError, Unit] =
  kafkaService.publishAndForget(eventKey, Some(eventValue))
```

### Go Equivalent (Sarama)
```go
import (
    "github.com/Shopify/sarama"
    "github.com/confluentinc/confluent-kafka-go/v2/kafka"
)

// Configuration
type KafkaProducerConfig struct {
    BootstrapServers string
    TopicName        string
    Compression      string
    BatchSize        int
}

// Service interface
type KafkaPublicationService interface {
    Publish(ctx context.Context, key, value []byte) (PartitionInfo, error)
    PublishAndForget(ctx context.Context, key, value []byte) error
    Close() error
}

// Implementation with Confluent
type kafkaProducerImpl struct {
    producer *kafka.Producer
    config   *KafkaProducerConfig
}

func NewKafkaProducer(config *KafkaProducerConfig) (KafkaPublicationService, error) {
    configMap := kafka.ConfigMap{
        "bootstrap.servers": config.BootstrapServers,
        "compression.type":  config.Compression,
        "batch.size":        config.BatchSize,
    }

    producer, err := kafka.NewProducer(&configMap)
    if err != nil {
        return nil, err
    }

    return &kafkaProducerImpl{
        producer: producer,
        config:   config,
    }, nil
}

func (k *kafkaProducerImpl) Publish(ctx context.Context, key, value []byte) (PartitionInfo, error) {
    deliveryChan := make(chan kafka.Event, 1)

    err := k.producer.Produce(&kafka.Message{
        TopicPartition: kafka.TopicPartition{
            Topic:     &k.config.TopicName,
            Partition: kafka.PartitionAny,
        },
        Key:   key,
        Value: value,
    }, deliveryChan)

    if err != nil {
        return PartitionInfo{}, &PublicationError{
            Code:    "timeout",
            Message: err.Error(),
        }
    }

    // Wait for delivery with context timeout
    select {
    case event := <-deliveryChan:
        msg := event.(*kafka.Message)
        if msg.TopicPartition.Error != nil {
            return PartitionInfo{}, &PublicationError{
                Code:    "delivery_failed",
                Message: msg.TopicPartition.Error.Error(),
            }
        }
        return PartitionInfo{
            Partition: int(msg.TopicPartition.Partition),
            Offset:    int64(msg.TopicPartition.Offset),
        }, nil
    case <-ctx.Done():
        return PartitionInfo{}, &PublicationError{
            Code:    "timeout",
            Message: "publication timeout",
        }
    }
}

func (k *kafkaProducerImpl) PublishAndForget(ctx context.Context, key, value []byte) error {
    deliveryChan := make(chan kafka.Event, 1)

    return k.producer.Produce(&kafka.Message{
        TopicPartition: kafka.TopicPartition{
            Topic:     &k.config.TopicName,
            Partition: kafka.PartitionAny,
        },
        Key:   key,
        Value: value,
    }, deliveryChan)
}

func (k *kafkaProducerImpl) Close() error {
    k.producer.Flush(30 * 1000)
    k.producer.Close()
    return nil
}

// Error handling
type PublicationError struct {
    Code    string
    Message string
}

func (e *PublicationError) Error() string {
    return e.Message
}
```

---

## Data Models Translation

### Scala Case Classes
```scala
case class Transaction(
  transactionType: TransactionType,
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

// Enumerations
sealed trait TransactionType
case object Deposit extends TransactionType
case object Withdrawal extends TransactionType
case object Transfer extends TransactionType
case object Exchange extends TransactionType
```

### Go Equivalent
```go
// JSON response wrappers with struct tags
type Transaction struct {
    ID                   string    `db:"id" json:"id"`
    TransactionType      string    `db:"transaction_type" json:"transaction_type"`
    FromCurrency         string    `db:"from_currency" json:"from_currency"`
    ToCurrency           string    `db:"to_currency" json:"to_currency"`
    Amount               Decimal   `db:"amount" json:"amount"`
    ExchangeRate         *Decimal  `db:"exchange_rate" json:"exchange_rate,omitempty"`
    Timestamp            time.Time `db:"timestamp" json:"timestamp"`
}

type Wallet struct {
    ID        string    `db:"id" json:"id"`
    OwnerID   string    `db:"owner_id" json:"owner_id"`
    CurrencyID string    `db:"currency_id" json:"currency_id"`
    Balance   Decimal   `db:"balance" json:"balance"`
    CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// Enumerations
type TransactionType string

const (
    TransactionTypeDeposit    TransactionType = "DEPOSIT"
    TransactionTypeWithdrawal TransactionType = "WITHDRAWAL"
    TransactionTypeTransfer   TransactionType = "TRANSFER"
    TransactionTypeExchange   TransactionType = "EXCHANGE"
)

// Validation
func (t TransactionType) IsValid() bool {
    switch t {
    case TransactionTypeDeposit, TransactionTypeWithdrawal,
         TransactionTypeTransfer, TransactionTypeExchange:
        return true
    default:
        return false
    }
}

// Custom decimal type for precision
type Decimal struct {
    decimal.Decimal
}

func (d Decimal) MarshalJSON() ([]byte, error) {
    return json.Marshal(d.String())
}

func (d *Decimal) UnmarshalJSON(b []byte) error {
    var s string
    if err := json.Unmarshal(b, &s); err != nil {
        return err
    }
    dec, err := decimal.NewFromString(s)
    if err != nil {
        return err
    }
    *d = Decimal{dec}
    return nil
}
```

---

## Pagination Pattern

### Scala
```scala
def getAchievementEventsEndpoint(...) = endpoint
  .in(query[Int](QueryParams.pageSize)
    .default(defaultPageSize)
    .validate(Validator.all(Validator.min(minPageSize), Validator.max(maxPageSize))))
  .in(query[Int](QueryParams.page)
    .default(defaultPageNumber)
    .validate(Validator.min(minPageNumber)))
  .in(query[Boolean](QueryParams.countPages).default(defaultCountPages))
  .out(jsonBody[Response[PaginatedResult[AchievementEvent]]])

case class PaginatedResult[T](
  items: Seq[T],
  pageNumber: Int,
  pageSize: Int,
  totalItems: Option[Long],
  totalPages: Option[Int]
)
```

### Go Equivalent
```go
type PaginationParams struct {
    PageSize  int `form:"page_size" binding:"required,min=1,max=1000"`
    Page      int `form:"page" binding:"required,min=1"`
    CountPages bool `form:"count_pages"`
}

type PaginatedResult struct {
    Items      interface{} `json:"items"`
    PageNumber int         `json:"page_number"`
    PageSize   int         `json:"page_size"`
    TotalItems *int64      `json:"total_items,omitempty"`
    TotalPages *int        `json:"total_pages,omitempty"`
}

// Handler
func (r *Router) GetAchievementEvents(c *gin.Context) {
    var pagination PaginationParams
    if err := c.ShouldBindQuery(&pagination); err != nil {
        c.JSON(http.StatusBadRequest, ErrorResponse(err.Error()))
        return
    }

    // Database query with optional count
    offset := (pagination.Page - 1) * pagination.PageSize

    items, err := r.db.GetAchievementEvents(c.Request.Context(), offset, pagination.PageSize)
    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse(err.Error()))
        return
    }

    result := PaginatedResult{
        Items:      items,
        PageNumber: pagination.Page,
        PageSize:   pagination.PageSize,
    }

    if pagination.CountPages {
        total, err := r.db.CountAchievementEvents(c.Request.Context())
        if err == nil {
            totalPages := (int(total) + pagination.PageSize - 1) / pagination.PageSize
            result.TotalItems = &total
            result.TotalPages = &totalPages
        }
    }

    c.JSON(http.StatusOK, Response{
        Status: "success",
        Data:   result,
    })
}
```

---

## Caching Strategy

### Scala with Redis
```scala
lazy val getAchievementEvents: Routes = {
  val endpoint = AchievementEndpoints.getAchievementEventsEndpoint.serverLogic { authContext =>
    { case (ruleId, fieldValue, ...) =>
      val projectId = getProjectId(authContext)
      val key = getCacheKeyHash(s"getAchievementEvents::$projectId::$ruleId::$fieldValue")

      cache
        .getOrFuture(key, cacheConfig.achievementEventsTimeout)(
          boundedContext
            .getAchievementEventsPage(params, pageSize, pageNumber, countPages)
            .map(page => Right(Response.asSuccess(page)))
        )
        .transform(handleUnexpectedFutureError(...))
    }
  }
  serverInterpreter.toRoutes(endpoint)
}
```

### Go Equivalent
```go
import (
    "crypto/sha256"
    "fmt"
    "time"
    "github.com/redis/go-redis/v9"
)

type CacheService struct {
    redis *redis.Client
}

func (c *CacheService) GetOrFetch(ctx context.Context, key string, ttl time.Duration,
    fetchFn func() (interface{}, error)) (interface{}, error) {

    // Try cache first
    val, err := c.redis.Get(ctx, key).Result()
    if err == nil {
        var result interface{}
        if err := json.Unmarshal([]byte(val), &result); err == nil {
            return result, nil
        }
    }

    // Cache miss, fetch fresh data
    data, err := fetchFn()
    if err != nil {
        return nil, err
    }

    // Store in cache
    jsonData, _ := json.Marshal(data)
    c.redis.Set(ctx, key, string(jsonData), ttl)

    return data, nil
}

// Helper function for SHA256 hashing
func sha256Hash(s string) string {
    h := sha256.Sum256([]byte(s))
    return fmt.Sprintf("%x", h)
}

// Usage in handler
func (r *Router) GetAchievementEvents(c *gin.Context) {
    authCtx := c.MustGet("auth").(*AuthContext)
    ruleID := c.Param("achievement_rule_id")
    fieldValue := c.DefaultQuery("field_value", "")

    cacheKey := sha256Hash(fmt.Sprintf("getAchievementEvents::%s::%s::%s",
        authCtx.ProjectID, ruleID, fieldValue))

    result, err := r.cache.GetOrFetch(
        c.Request.Context(),
        cacheKey,
        15*time.Minute,  // achievementEventsTimeout
        func() (interface{}, error) {
            return r.service.GetAchievementEvents(c.Request.Context(),
                authCtx.ProjectID, ruleID, fieldValue)
        },
    )

    if err != nil {
        c.JSON(http.StatusInternalServerError, ErrorResponse(err.Error()))
        return
    }

    c.JSON(http.StatusOK, Response{
        Status: "success",
        Data:   result,
    })
}
```

---

## Async/Concurrency Pattern

### Scala with Futures
```scala
def getAchievementEventsPage(
    params: BaseFetchAchievementEventsParams,
    pageSize: Int,
    pageNumber: Int,
    countPages: Boolean)(implicit ec: ExecutionContext): Future[PaginatedResult[AchievementEvent]] = {

  for {
    items <- repository.fetch(params, pageSize, pageNumber)
    totalItems <- if (countPages) repository.count(params) else Future.successful(None)
  } yield PaginatedResult(
    items = items,
    pageNumber = pageNumber,
    pageSize = pageSize,
    totalItems = totalItems,
    totalPages = totalItems.map(total => (total.toInt + pageSize - 1) / pageSize)
  )
}
```

### Go Equivalent
```go
func (s *Service) GetAchievementEventsPage(ctx context.Context,
    params *FetchParams, pageSize, pageNumber int, countPages bool) (*PaginatedResult, error) {

    var totalItems *int64
    var totalPages *int

    // Fetch items
    items, err := s.repo.Fetch(ctx, params, pageSize, pageNumber)
    if err != nil {
        return nil, err
    }

    // Optionally count total items
    if countPages {
        total, err := s.repo.Count(ctx, params)
        if err != nil {
            return nil, err
        }
        totalItems = &total
        pages := int((total + int64(pageSize) - 1) / int64(pageSize))
        totalPages = &pages
    }

    return &PaginatedResult{
        Items:      items,
        PageNumber: pageNumber,
        PageSize:   pageSize,
        TotalItems: totalItems,
        TotalPages: totalPages,
    }, nil
}

// For concurrent operations
func (s *Service) FetchWithCount(ctx context.Context,
    params *FetchParams, pageSize, pageNumber int) (*PaginatedResult, error) {

    type result struct {
        items interface{}
        total int64
        err   error
    }

    resultChan := make(chan result, 2)

    // Fetch items concurrently
    go func() {
        items, err := s.repo.Fetch(ctx, params, pageSize, pageNumber)
        resultChan <- result{items: items, err: err}
    }()

    // Count total concurrently
    go func() {
        total, err := s.repo.Count(ctx, params)
        resultChan <- result{total: total, err: err}
    }()

    // Collect results
    var items interface{}
    var total int64
    for i := 0; i < 2; i++ {
        r := <-resultChan
        if r.err != nil {
            return nil, r.err
        }
        if r.items != nil {
            items = r.items
        } else {
            total = r.total
        }
    }

    pages := int((total + int64(pageSize) - 1) / int64(pageSize))
    return &PaginatedResult{
        Items:      items,
        PageNumber: pageNumber,
        PageSize:   pageSize,
        TotalItems: &total,
        TotalPages: &pages,
    }, nil
}
```

---

## File Locations Reference

| Scala Component | Typical Go Location |
|---|---|
| `app/stella/*/routes/ApiRouter.scala` | `internal/routes/router.go` |
| `app/stella/*/routes/*Routes.scala` | `internal/routes/` + lowercase |
| `app/stella/*/routes/*Endpoints.scala` | `internal/handlers/` + lowercase |
| `app/stella/*/db/*Repository.scala` | `internal/repository/` + lowercase |
| `app/stella/*/services/*Service.scala` | `internal/services/` + lowercase |
| `app/stella/*/models/*.scala` | `internal/models/` + lowercase |
| `common-kafka/src/main/scala/...` | `internal/kafka/` |
| `conf/routes` | `internal/routes/routes.go` |
| `conf/application.conf` | `config.yaml` or `.env` |

---

## Summary: Key Differences

| Aspect | Scala | Go |
|---|---|---|
| **Endpoint Definition** | Tapir DSL | Gin/Chi handlers |
| **Database** | Slick query DSL | sqlc + database/sql |
| **Kafka** | Akka Kafka Streams | Sarama or Confluent |
| **Async** | Future[T] + ExecutionContext | Goroutines + channels |
| **Type Safety** | Compile-time ADTs | Go generics (1.18+) |
| **Dependency Injection** | Play modules | Struct injection |
| **Error Handling** | Either[E, T] + Try | error interface |
| **Configuration** | HOCON | YAML or .env |
| **HTTP Server** | Play Framework | Gin/Echo/Chi |
| **Testing** | ScalaTest | Go testing package |

---

**End of Quick Reference**
