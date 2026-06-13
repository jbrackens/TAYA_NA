FROM golang:1.24-bookworm AS build
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends git build-essential pkg-config librdkafka-dev && rm -rf /var/lib/apt/lists/*
COPY phoenix-common ./phoenix-common
COPY phoenix-cms ./phoenix-cms
WORKDIR /workspace/phoenix-cms
RUN go mod download && CGO_ENABLED=1 GOOS=linux go build -o server ./cmd/server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates librdkafka1 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /workspace/phoenix-cms/server /app/server
EXPOSE 8012
ENTRYPOINT ["/app/server"]
