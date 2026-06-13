FROM golang:1.24-bookworm AS builder
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends git build-essential pkg-config librdkafka-dev && rm -rf /var/lib/apt/lists/*
COPY phoenix-common ./phoenix-common
COPY phoenix-social ./phoenix-social
WORKDIR /workspace/phoenix-social
RUN go mod download && CGO_ENABLED=1 GOOS=linux go build -o /phoenix-social ./cmd/server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates librdkafka1 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /phoenix-social /phoenix-social
EXPOSE 8007
ENTRYPOINT ["/phoenix-social"]
