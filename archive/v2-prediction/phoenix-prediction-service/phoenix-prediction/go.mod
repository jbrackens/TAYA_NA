module github.com/phoenixbot/phoenix-prediction

go 1.22

require (
	github.com/go-chi/chi/v5 v5.0.11
	github.com/golang-jwt/jwt/v5 v5.3.1
	github.com/google/uuid v1.6.0
	github.com/jackc/pgx/v5 v5.5.5
	github.com/phoenixbot/phoenix-common v0.0.0
	github.com/shopspring/decimal v1.3.1
	go.uber.org/zap v1.27.0
)

require (
	github.com/confluentinc/confluent-kafka-go/v2 v2.4.0 // indirect
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20221227161230-091c0ba34f0a // indirect
	github.com/jackc/puddle/v2 v2.2.1 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	golang.org/x/crypto v0.21.0 // indirect
	golang.org/x/sync v0.6.0 // indirect
	golang.org/x/text v0.14.0 // indirect
)

replace github.com/phoenixbot/phoenix-common => ../phoenix-common
