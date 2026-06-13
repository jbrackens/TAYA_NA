.PHONY: build test run lint clean migrate help

BINARY_NAME=phoenix-gateway
GOFLAGS=-v

help:
	@echo "Available targets:"
	@echo "  make build       - Build the binary"
	@echo "  make test        - Run tests"
	@echo "  make run         - Run the service locally"
	@echo "  make lint        - Run linters"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make docker      - Build Docker image"

build:
	$(GOFLAGS) go build -o bin/$(BINARY_NAME) ./cmd/server

test:
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

run: build
	./bin/$(BINARY_NAME)

lint:
	golangci-lint run ./...
	go fmt ./...
	go vet ./...

clean:
	rm -rf bin/
	rm -f coverage.out coverage.html

docker:
	docker build -t $(BINARY_NAME):latest .

migrate:
	@echo "No migrations for gateway service"

deps:
	go mod download
	go mod tidy
