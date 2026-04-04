FROM golang:1.24-bookworm AS builder

WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends git build-essential pkg-config librdkafka-dev && rm -rf /var/lib/apt/lists/*
COPY phoenix-common ./phoenix-common
COPY phoenix-betting-engine ./phoenix-betting-engine
WORKDIR /workspace/phoenix-betting-engine
RUN go mod download
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o phoenix-betting-engine ./cmd/server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget librdkafka1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /workspace/phoenix-betting-engine/phoenix-betting-engine .
EXPOSE 8004
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3   CMD wget --no-verbose --tries=1 --spider http://localhost:8004/health || exit 1
CMD ["./phoenix-betting-engine"]
