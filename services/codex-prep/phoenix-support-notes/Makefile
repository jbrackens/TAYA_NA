.PHONY: run test test-race build fmt

run:
	go run ./cmd/server

test:
	go test ./...

test-race:
	go test -race ./...

build:
	go build ./cmd/server

fmt:
	gofmt -w ./cmd ./internal
