FROM golang:1.24-bookworm AS builder

WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends git build-essential pkg-config librdkafka-dev && rm -rf /var/lib/apt/lists/*
COPY phoenix-common ./phoenix-common
COPY phoenix-wallet ./phoenix-wallet
WORKDIR /workspace/phoenix-wallet
RUN go mod download
RUN CGO_ENABLED=1 GOOS=linux go build -a -installsuffix cgo -o phoenix-wallet ./cmd/server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates wget librdkafka1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /workspace/phoenix-wallet/phoenix-wallet .
EXPOSE 8002
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3   CMD wget --no-verbose --tries=1 --spider http://localhost:8002/health || exit 1
CMD ["./phoenix-wallet"]
