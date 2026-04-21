# Build context: go-platform/
FROM golang:1.25-alpine AS builder

WORKDIR /build

# Copy go.work and module definitions
COPY go.work ./
COPY modules/platform/go.mod modules/platform/go.sum* ./modules/platform/
COPY services/auth/go.mod services/auth/go.sum* ./services/auth/
COPY services/gateway/go.mod services/gateway/go.sum* ./services/gateway/

# Download dependencies
WORKDIR /build/services/auth
RUN go mod download

# Copy all source code
WORKDIR /build
COPY modules/ ./modules/
COPY services/auth/ ./services/auth/

# Build the auth binary
WORKDIR /build/services/auth
RUN CGO_ENABLED=0 GOOS=linux go build -o /auth ./cmd/auth

# Runtime image
FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /auth .

EXPOSE 18081
CMD ["./auth"]
