.PHONY: build test run lint clean docker deps

BINARY_NAME=phoenix-prediction

build:
	go build -o bin/$(BINARY_NAME) ./cmd/server

test:
	go test -v -race -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

run: build
	./bin/$(BINARY_NAME)

lint:
	go fmt ./...
	go vet ./...

clean:
	rm -rf bin/
	rm -f coverage.out coverage.html

docker:
	docker build -t $(BINARY_NAME):latest .

deps:
	go mod download
	go mod tidy
