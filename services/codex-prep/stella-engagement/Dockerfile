FROM golang:1.24-bookworm AS build
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends git build-essential pkg-config librdkafka-dev && rm -rf /var/lib/apt/lists/*
COPY phoenix-common ./phoenix-common
COPY stella-engagement ./stella-engagement
WORKDIR /workspace/stella-engagement
RUN go mod download && CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates librdkafka1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /workspace/stella-engagement/server /app/server
EXPOSE 8013
ENTRYPOINT ["/app/server"]
