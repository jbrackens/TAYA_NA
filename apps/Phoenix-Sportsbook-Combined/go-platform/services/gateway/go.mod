module phoenix-revival/gateway

go 1.24.0

require (
	github.com/lib/pq v1.10.9
	github.com/pressly/goose/v3 v3.17.0
	github.com/redis/go-redis/v9 v9.0.0
	phoenix-revival/platform v0.0.0
)

replace phoenix-revival/platform => ../../modules/platform
