SERVICE_NAME=phoenix-cms

.PHONY: run test build tidy

run:
	go run ./cmd/server

test:
	go test ./...

build:
	go build ./cmd/server

tidy:
	go mod tidy
