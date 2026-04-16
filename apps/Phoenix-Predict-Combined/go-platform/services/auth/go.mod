module phoenix-revival/auth

go 1.25.0

require phoenix-revival/platform v0.0.0

require (
	github.com/alicebob/miniredis/v2 v2.37.0 // indirect
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	github.com/redis/go-redis/v9 v9.18.0 // indirect
	github.com/yuin/gopher-lua v1.1.1 // indirect
	go.uber.org/atomic v1.11.0 // indirect
	golang.org/x/crypto v0.50.0 // indirect
)

replace phoenix-revival/platform => ../../modules/platform
