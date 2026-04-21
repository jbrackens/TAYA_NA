# Build context: go-platform/
FROM golang:1.25-alpine AS builder

WORKDIR /build

# Copy go.work and module definitions
COPY go.work ./
COPY modules/platform/go.mod modules/platform/go.sum* ./modules/platform/
COPY services/gateway/go.mod services/gateway/go.sum* ./services/gateway/
COPY services/auth/go.mod services/auth/go.sum* ./services/auth/

# Download dependencies
WORKDIR /build/services/gateway
RUN go mod download

# Copy all source code
WORKDIR /build
COPY modules/ ./modules/
COPY services/gateway/ ./services/gateway/

# Build the gateway binary
WORKDIR /build/services/gateway
RUN CGO_ENABLED=0 GOOS=linux go build -o /gateway ./cmd/gateway

# Runtime image
FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /gateway .
COPY services/gateway/migrations/ ./migrations/

EXPOSE 18080
CMD ["./gateway"]
