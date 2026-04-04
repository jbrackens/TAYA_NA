# Phoenix Sportsbook: Production Deployment Guide

Complete guide for deploying Phoenix Sportsbook to production using Kubernetes and cloud infrastructure.

## Infrastructure Requirements

### Kubernetes Cluster

- **Version:** 1.28 or later
- **Node Pools:**
  - Gateway pool: 3+ nodes (n1-standard-4 or equivalent)
  - General pool: 3+ nodes (n1-standard-2 or equivalent)
  - Database pool: 2+ nodes (optional, for DB operators)
- **Capacity:** Minimum 12 CPU cores and 48 GB RAM total
- **Network:** VPC with private subnets for services

### Database (PostgreSQL 16)

- **Deployment:** Cloud SQL (GCP) or RDS (AWS) or managed Postgres
- **Instance:** db-custom-8-32000 (8 CPU, 32 GB RAM) or equivalent
- **Storage:** 500 GB initial, auto-scaling enabled
- **Backup:** Daily automated backups with 30-day retention
- **Replication:** Read replicas in 2+ regions (recommended)

### Cache (Redis 7)

- **Deployment:** Cloud Memorystore or ElastiCache
- **Instance:** Redis 7.0 Cluster mode enabled
- **Capacity:** 8 GB initial (scaling based on session volume)
- **Persistence:** RDB snapshots every 6 hours
- **Replication:** 3+ node cluster for high availability

### Storage

- **Container Registry:** Google Artifact Registry or Docker Hub
- **CDN:** Cloud CDN or CloudFront for static assets
- **Logs:** Cloud Logging or ELK Stack
- **Backups:** Cloud Storage or S3 for database backups

## Environment Variables Reference

### Gateway Service

```bash
# Network & Basic Configuration
GATEWAY_PORT=18080                  # Port to listen on
GATEWAY_HOST=0.0.0.0               # Host to bind to
LOG_LEVEL=info                      # Logging level: debug, info, warn, error

# Database Configuration
GATEWAY_DB_DSN=postgres://user:pass@host:5432/sportsbook
GATEWAY_DB_MAX_OPEN_CONNS=100       # Connection pool size
GATEWAY_DB_MAX_IDLE_CONNS=25        # Idle connections to keep
GATEWAY_DB_CONN_MAX_LIFETIME=5m     # Max connection lifetime

# Redis Configuration
REDIS_URL=redis://host:6379/0       # Redis connection string
REDIS_PASSWORD=                     # Redis password (if required)
REDIS_MAX_RETRIES=3                 # Retry attempts
REDIS_POOL_SIZE=100                 # Connection pool size

# WebSocket Configuration
WS_MAX_CONNECTIONS=10000            # Max concurrent connections
WS_READ_TIMEOUT=60s                 # Read timeout
WS_WRITE_TIMEOUT=60s                # Write timeout
WS_PING_INTERVAL=30s                # Ping interval

# Security
JWT_SECRET=your-secret-key          # Must match Auth Service
CORS_ORIGINS=https://app.example.com,https://admin.example.com
RATE_LIMIT_REQUESTS=1000            # Requests per minute per IP
RATE_LIMIT_WINDOW=1m

# Auth Service Integration
AUTH_SERVICE_URL=http://auth:18081  # Internal Auth Service URL
AUTH_CACHE_TTL=5m                   # How long to cache auth results

# Feature Flags
ENABLE_FREEBETS=true
ENABLE_ODDSBOOSTS=true
ENABLE_LIVE_STREAMING=false
```

### Auth Service

```bash
# Network & Basic Configuration
AUTH_PORT=18081                     # Port to listen on
AUTH_HOST=0.0.0.0
LOG_LEVEL=info

# Database Configuration
AUTH_DB_DSN=postgres://user:pass@host:5432/sportsbook
AUTH_DB_MAX_OPEN_CONNS=50
AUTH_DB_MAX_IDLE_CONNS=10

# Redis Configuration
REDIS_URL=redis://host:6379/0
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your-secret-key          # MUST match Gateway service
JWT_EXPIRY=24h                      # Token lifetime
JWT_REFRESH_TTL=7d                  # Refresh token lifetime
JWT_ISSUER=phoenix-sportsbook

# Session Configuration
SESSION_TIMEOUT=24h                 # Session idle timeout
SESSION_MAX_AGE=604800              # Max session age (7 days)
SESSION_SECURE=true                 # Use secure cookies in production
SESSION_HTTP_ONLY=true              # Prevent JavaScript access

# Password Policy
PASSWORD_MIN_LENGTH=8
PASSWORD_REQUIRE_UPPERCASE=true
PASSWORD_REQUIRE_NUMBERS=true
PASSWORD_REQUIRE_SPECIAL=false
PASSWORD_MAX_AGE=90d                # Force password change every 90 days

# Rate Limiting
LOGIN_RATE_LIMIT=10                 # Max login attempts
LOGIN_RATE_WINDOW=15m
```

### Player App

```bash
# Environment
NODE_ENV=production
ENV_NAME=production

# API Configuration
API_GLOBAL_ENDPOINT=https://api.example.com    # Gateway API
WS_GLOBAL_ENDPOINT=wss://api.example.com/ws    # WebSocket endpoint
NEXT_PUBLIC_SENTRY_DSN=https://...             # Error tracking

# Analytics
NEXT_PUBLIC_GA_ID=UA-XXXXXXXXX                 # Google Analytics
NEXT_PUBLIC_AMPLITUDE_KEY=                     # Amplitude (optional)

# Feature Flags
NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN=true
NEXT_PUBLIC_ENABLE_PAYMENT_METHODS=true
NEXT_PUBLIC_MAINTENANCE_MODE=false

# Asset Configuration
CDN_URL=https://cdn.example.com                # CDN for static assets
```

### Backoffice

```bash
# Environment
NODE_ENV=production

# API Configuration
API_ENDPOINT=https://api.example.com/api/v1
ADMIN_PANEL_SECRET=secret-key                  # For admin API access

# Features
ENABLE_MARKET_SUSPENSION=true
ENABLE_USER_SUSPENSION=true
ENABLE_PAYMENT_PROCESSING=true
ENABLE_COMPLIANCE_REPORTS=true
```

## Docker Image Builds

### Build All Images

```bash
# Build Go services
docker build -t gateway:1.0.0 ./go-platform/services/gateway
docker build -t auth:1.0.0 ./go-platform/services/auth

# Build Frontend services
docker build -t player-app:1.0.0 ./phoenix-frontend-brand-viegg/packages/app
docker build -t backoffice:1.0.0 ./talon-backoffice/packages/office

# Push to registry
docker tag gateway:1.0.0 gcr.io/project/gateway:1.0.0
docker push gcr.io/project/gateway:1.0.0
# ... repeat for other services
```

### Dockerfile Examples

**Gateway Service** (go-platform/services/gateway/Dockerfile):
```dockerfile
FROM golang:1.24-alpine AS builder
WORKDIR /build
COPY . .
RUN go build -o gateway ./cmd/gateway

FROM alpine:3.18
RUN apk add --no-cache ca-certificates postgresql-client
COPY --from=builder /build/gateway /usr/local/bin/
EXPOSE 18080
CMD ["gateway"]
```

**Player App** (phoenix-frontend-brand-viegg/packages/app/Dockerfile):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /build
COPY . .
RUN yarn install --frozen-lockfile
RUN yarn build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /build/.next /app/.next
COPY --from=builder /build/public /app/public
COPY --from=builder /build/package.json /app/
RUN yarn install --frozen-lockfile --production
EXPOSE 3002
CMD ["yarn", "start"]
```

## Kubernetes Manifests Overview

### Namespace

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: phoenix-sportsbook
```

### ConfigMap (Configuration)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: gateway-config
  namespace: phoenix-sportsbook
data:
  LOG_LEVEL: "info"
  WS_MAX_CONNECTIONS: "10000"
  RATE_LIMIT_REQUESTS: "1000"
```

### Secret (Sensitive Data)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gateway-secret
  namespace: phoenix-sportsbook
type: Opaque
stringData:
  JWT_SECRET: "your-secret-key-here"
  GATEWAY_DB_DSN: "postgres://user:pass@host:5432/sportsbook"
  REDIS_URL: "redis://host:6379/0"
```

### Gateway Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
  namespace: phoenix-sportsbook
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gateway
  template:
    metadata:
      labels:
        app: gateway
    spec:
      affinity:
        # Spread across nodes
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - gateway
              topologyKey: kubernetes.io/hostname
      containers:
      - name: gateway
        image: gcr.io/project/gateway:1.0.0
        ports:
        - containerPort: 18080
        env:
        - name: GATEWAY_PORT
          value: "18080"
        - name: GATEWAY_DB_DSN
          valueFrom:
            secretKeyRef:
              name: gateway-secret
              key: GATEWAY_DB_DSN
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: gateway-secret
              key: REDIS_URL
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: gateway-config
              key: LOG_LEVEL
        livenessProbe:
          httpGet:
            path: /api/v1/status
            port: 18080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/status
            port: 18080
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
```

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: gateway-hpa
  namespace: phoenix-sportsbook
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: gateway
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: gateway
  namespace: phoenix-sportsbook
spec:
  type: ClusterIP
  selector:
    app: gateway
  ports:
  - name: http
    port: 80
    targetPort: 18080
    protocol: TCP
  sessionAffinity: ClientIP  # Important for WebSocket connections
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: phoenix-ingress
  namespace: phoenix-sportsbook
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - api.example.com
    - app.example.com
    secretName: phoenix-tls
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gateway
            port:
              number: 80
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: player-app
            port:
              number: 80
```

## Database Migration Strategy for Production

### Pre-Deployment Checklist

```bash
# 1. Backup production database
pg_dump -h prod-db.example.com -U phoenix phoenix_sportsbook > backup-$(date +%Y%m%d-%H%M%S).sql

# 2. Validate migrations on staging first
GATEWAY_DB_DSN="postgres://user:pass@staging-db:5432/sportsbook" \
  go-platform/services/gateway/bin/migrate up

# 3. Test application against new schema
make qa-e2e-critical

# 4. Verify rollback procedure
go-platform/services/gateway/bin/migrate down
# Application should still work with previous schema
go-platform/services/gateway/bin/migrate up

# 5. Schedule maintenance window
# Notify users of planned maintenance
```

### Zero-Downtime Migration Strategy

```bash
# For backward-compatible migrations (adding columns, new tables):

# 1. Deploy new code that handles both old and new schema
kubectl apply -f k8s/gateway-deployment-v1.1.yaml

# 2. Run migration (no downtime)
kubectl exec -it migration-job -- /bin/migrate up

# 3. Monitor application logs
kubectl logs -f deployment/gateway

# 4. Once stable, remove backward-compatibility code in next release
```

### Blue-Green Deployment for Schema Changes

```bash
# For breaking schema changes:

# 1. Run migrations on blue environment
GATEWAY_DB_DSN="postgres://user:pass@blue-db:5432/sportsbook" \
  bin/migrate up

# 2. Deploy new application version to blue
kubectl set image deployment/gateway-blue \
  gateway=gcr.io/project/gateway:1.1.0

# 3. Run smoke tests
curl https://api-blue.example.com/api/v1/status

# 4. Switch traffic
kubectl patch service gateway -p '{"spec":{"selector":{"version":"blue"}}}'

# 5. Keep green environment ready for rollback
kubectl set image deployment/gateway-green \
  gateway=gcr.io/project/gateway:1.0.0
```

## Monitoring Setup

### Prometheus Endpoints

Each service exposes Prometheus metrics:

```
GET /metrics
```

**Gateway metrics:**
```
gateway_http_request_duration_seconds{method="POST",path="/api/v1/bets"}
gateway_websocket_connections{status="connected"}
gateway_database_query_duration_seconds
gateway_redis_operation_duration_seconds
gateway_active_bets{status="pending"}
```

**Auth service metrics:**
```
auth_login_total{status="success|failure"}
auth_token_validation_duration_seconds
auth_session_count
```

### Prometheus Configuration

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
- job_name: 'gateway'
  static_configs:
  - targets: ['gateway.phoenix-sportsbook.svc.cluster.local:18080']

- job_name: 'auth'
  static_configs:
  - targets: ['auth.phoenix-sportsbook.svc.cluster.local:18081']
```

### Grafana Dashboards

Create dashboards for:

1. **System Health**
   - Pod CPU/Memory usage
   - Disk usage
   - Network I/O

2. **Application Metrics**
   - Request rate (req/s)
   - Request latency (P50, P95, P99)
   - Error rate
   - Active connections

3. **Database Health**
   - Query latency
   - Connection pool usage
   - Replication lag
   - Backup status

4. **Business Metrics**
   - Bets placed per minute
   - Market suspension rate
   - User registration rate
   - Account balance distribution

## Health Check Endpoints

### Gateway Service

```
GET /api/v1/status
Returns: 200 OK if database and Redis are connected

GET /api/v1/health
Returns detailed health information:
{
  "status": "healthy",
  "components": {
    "database": "connected",
    "redis": "connected",
    "memory": "512MB/2GB"
  }
}

GET /api/v1/ready
Returns: 200 OK if service is ready to accept traffic
```

### Auth Service

```
GET /auth/status
GET /auth/health
GET /auth/ready
```

### Kubernetes Probes

```yaml
livenessProbe:          # Kill and restart if failing
  httpGet:
    path: /healthz
    port: 18080
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:         # Remove from load balancer if failing
  httpGet:
    path: /readyz
    port: 18080
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3

startupProbe:           # Allow time for startup before liveness checks
  httpGet:
    path: /startupz
    port: 18080
  periodSeconds: 10
  failureThreshold: 30  # Allow 5 minutes (10s * 30) for startup
```

## Scaling Guidelines

### Horizontal Scaling (Adding Pods)

**When to scale up:**
- CPU utilization > 70%
- Memory utilization > 80%
- Response latency > 200ms (P95)
- Requests queued in load balancer

**Scaling commands:**
```bash
# Manual scaling
kubectl scale deployment gateway --replicas=5

# Autoscaling (recommended)
kubectl autoscale deployment gateway \
  --min=3 --max=10 \
  --cpu-percent=70
```

### Vertical Scaling (Increasing Resources)

**When to scale up:**
- Single pod CPU hitting limits
- Memory pressure causing evictions
- Database connection pool exhausted

**Vertical scaling:**
```bash
# Update resource requests
kubectl set resources deployment gateway \
  --requests=cpu=1000m,memory=1Gi \
  --limits=cpu=2000m,memory=2Gi
```

### Database Scaling

**Read replicas for reporting:**
```bash
# Add read replica in GCP Cloud SQL
gcloud sql instances clone prod-db staging-db \
  --backup-configuration-backup-location=us-east1
```

**Connection pooling:**
- Implement PgBouncer for connection pooling
- Configure gateway `DB_MAX_OPEN_CONNS=100`

## Rollback Procedures

### Application Rollback

```bash
# Identify previous working version
kubectl rollout history deployment/gateway

# Rollback to previous version
kubectl rollout undo deployment/gateway

# Rollback to specific revision
kubectl rollout undo deployment/gateway --to-revision=3

# Monitor rollback progress
kubectl rollout status deployment/gateway
```

### Database Rollback

```bash
# If migration caused issues:

# 1. Identify previous schema version
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;

# 2. Rollback migration
GATEWAY_DB_DSN="postgres://..." bin/migrate down

# 3. Redeploy previous application version
kubectl set image deployment/gateway \
  gateway=gcr.io/project/gateway:1.0.0

# 4. Verify application is functional
curl https://api.example.com/api/v1/status
```

### Full System Rollback

```bash
# In case of critical failure:

# 1. Restore from backup
psql -h prod-db -U phoenix phoenix_sportsbook < backup-20240115-140000.sql

# 2. Rollback to previous Gateway and Auth images
kubectl set image deployment/gateway \
  gateway=gcr.io/project/gateway:1.0.0
kubectl set image deployment/auth \
  auth=gcr.io/project/auth:1.0.0

# 3. Verify health endpoints
curl https://api.example.com/api/v1/status
curl https://api.example.com/auth/status

# 4. Publish incident notification
# Send status update to users
```

## TLS Certificates

### Using cert-manager (Recommended)

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: phoenix-cert
  namespace: phoenix-sportsbook
spec:
  secretName: phoenix-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.example.com
  - app.example.com
  - admin.example.com
```

### Manual Certificate Management

```bash
# Generate certificate (valid 1 year)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365

# Create Kubernetes secret
kubectl create secret tls phoenix-tls \
  --cert=cert.pem \
  --key=key.pem \
  -n phoenix-sportsbook

# Update every 90 days (or use cert-manager for automation)
```

## DNS Configuration

### Production DNS Records

```
api.example.com          A/CNAME  -> Load balancer IP
app.example.com          A/CNAME  -> Load balancer IP
admin.example.com        A/CNAME  -> Load balancer IP
```

**Google Cloud DNS example:**
```bash
gcloud dns record-sets create api.example.com \
  --rrdatas=35.191.1.1 \
  --ttl=300 \
  --type=A \
  --zone=example-zone
```

## References

- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- See [RUNBOOKS.md](./RUNBOOKS.md) for operational procedures
- See `docker-compose.yml` for local development setup
- Kubernetes documentation: https://kubernetes.io/docs/
- PostgreSQL documentation: https://www.postgresql.org/docs/16/
- Redis documentation: https://redis.io/docs/
