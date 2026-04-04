module github.com/phoenixbot/phoenix-realtime

go 1.22

require (
	github.com/go-chi/chi/v5 v5.0.11
	github.com/golang-jwt/jwt/v5 v5.3.1
	github.com/gorilla/websocket v1.5.1
	github.com/phoenixbot/phoenix-common v0.0.0
	github.com/shopspring/decimal v1.4.0
	go.uber.org/zap v1.27.0
)

require (
	github.com/confluentinc/confluent-kafka-go/v2 v2.4.0 // indirect
	github.com/google/uuid v1.6.0 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	golang.org/x/net v0.22.0 // indirect
)

replace github.com/phoenixbot/phoenix-common => ../phoenix-common
