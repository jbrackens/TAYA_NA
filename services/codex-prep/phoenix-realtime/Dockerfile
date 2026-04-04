FROM golang:1.22-bookworm AS builder
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends git build-essential pkg-config librdkafka-dev && rm -rf /var/lib/apt/lists/*
COPY phoenix-common ./phoenix-common
COPY phoenix-realtime ./phoenix-realtime
WORKDIR /workspace/phoenix-realtime
RUN go mod download
RUN CGO_ENABLED=1 GOOS=linux go build -o /out/phoenix-realtime ./cmd/server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates librdkafka1 wget && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /out/phoenix-realtime /app/phoenix-realtime
EXPOSE 8018
CMD ["/app/phoenix-realtime"]
