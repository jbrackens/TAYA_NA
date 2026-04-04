# Phoenix Sportsbook: Pre-Launch Verification Checklist

Complete checklist for production launch readiness. All items must be verified and signed off before going live.

## Infrastructure & Environment Setup

### Kubernetes Cluster
- [ ] Cluster is provisioned and healthy (1.28+)
- [ ] Appropriate number of nodes allocated (minimum 3 per availability zone)
- [ ] Cluster networking configured (VPC, subnets, security groups)
- [ ] RBAC policies configured for service accounts
- [ ] Pod security policies in place
- [ ] Network policies configured to restrict traffic
- [ ] Node auto-scaling configured for high availability
- [ ] Cluster monitoring enabled (metrics-server, kube-state-metrics)

**Sign-off:** _____________ Date: _______

### PostgreSQL Database
- [ ] Database instance provisioned (16+)
- [ ] Database created: `phoenix_sportsbook`
- [ ] Primary database running and accessible
- [ ] Read replicas configured in alternate regions/zones
- [ ] Automatic backups configured (daily, 30+ day retention)
- [ ] Point-in-time recovery tested and working
- [ ] Replication lag is < 1 second
- [ ] Connection pooling configured
- [ ] SSL/TLS connections enforced
- [ ] Network access restricted to application subnets only
- [ ] Encryption at rest enabled
- [ ] Parameter groups configured (max_connections=500+, work_mem adequate)

**Sign-off:** _____________ Date: _______

### Redis Cache
- [ ] Redis 7+ instance provisioned
- [ ] Cluster mode enabled for high availability
- [ ] Data persistence enabled (RDB and AOF)
- [ ] Memory allocation adequate (8GB+ initial)
- [ ] Replication across 3+ nodes
- [ ] Automatic failover configured
- [ ] Backup strategy in place
- [ ] SSL/TLS connections enforced
- [ ] Network access restricted to application subnets
- [ ] Eviction policy configured (allkeys-lru)

**Sign-off:** _____________ Date: _______

### Storage & CDN
- [ ] Cloud storage bucket created for backups
- [ ] CDN configured for static assets
- [ ] CDN cache policies set appropriately
- [ ] SSL/TLS certificates configured in CDN
- [ ] Geo-distribution for low-latency access
- [ ] Backup storage in separate region

**Sign-off:** _____________ Date: _______

### Networking & DNS
- [ ] DNS records created for all domains:
  - [ ] api.example.com → Load balancer
  - [ ] app.example.com → Load balancer
  - [ ] admin.example.com → Load balancer
- [ ] TLS certificates provisioned and installed
- [ ] Certificate auto-renewal configured (cert-manager)
- [ ] Load balancer configured with health checks
- [ ] Load balancer session affinity for WebSocket
- [ ] WAF rules configured and tested
- [ ] DDoS protection enabled
- [ ] VPN/bastion host configured for ops access

**Sign-off:** _____________ Date: _______

## Database Configuration

### Schema & Migrations
- [ ] All migrations applied to production database
- [ ] Schema matches expected version (run `SELECT max(version) FROM schema_migrations`)
- [ ] All tables created with correct constraints
- [ ] All indexes created and verified
- [ ] Foreign key relationships validated
- [ ] Triggers and procedures deployed (if any)
- [ ] Migrations tested on staging and rolled back successfully
- [ ] Rollback procedures documented and tested

**Verification Command:**
```sql
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';
```

### Seed Data
- [ ] Reference data loaded (sports, tournaments)
- [ ] Test users created
- [ ] Test accounts have realistic data
- [ ] Sample markets and fixtures created
- [ ] Admin accounts configured
- [ ] Seed data not interfering with production data

**Verification Command:**
```sql
SELECT COUNT(*) as sports FROM sports;
SELECT COUNT(*) as tournaments FROM tournaments;
SELECT COUNT(*) as fixtures FROM fixtures;
```

### Performance Validation
- [ ] Query execution times acceptable (< 100ms for standard queries)
- [ ] Table statistics updated (`ANALYZE`)
- [ ] Missing indexes identified and created
- [ ] Query plans reviewed with EXPLAIN
- [ ] Slow query log monitored

**Sign-off:** _____________ Date: _______

## Application Deployment

### Gateway Service
- [ ] Docker image built and pushed to registry
- [ ] Container runs successfully locally with docker-compose
- [ ] All environment variables documented
- [ ] Kubernetes deployment manifest configured
- [ ] Liveness probe configured and tested
- [ ] Readiness probe configured and tested
- [ ] Startup probe configured with appropriate timeout
- [ ] Resource requests/limits set appropriately
- [ ] HorizontalPodAutoscaler configured (min=3, max=10)
- [ ] Service mesh integration configured (if using Istio)
- [ ] Network policies applied
- [ ] ConfigMaps and Secrets created
- [ ] Service account configured with appropriate permissions
- [ ] Pod disruption budget configured (maxUnavailable=1)
- [ ] Deployment successfully rolls out to staging
- [ ] Rolling update strategy configured (maxSurge=1, maxUnavailable=0)

**Verification Command:**
```bash
kubectl get deployment gateway -n phoenix-sportsbook -o yaml | grep -E "replicas:|image:|readinessProbe:|livenessProbe:"
```

### Auth Service
- [ ] Docker image built and pushed
- [ ] Kubernetes deployment configured
- [ ] All probes configured and tested
- [ ] HPA configured (min=2, max=5)
- [ ] Successfully connects to database and Redis
- [ ] JWT_SECRET is strong and unique

**Verification Command:**
```bash
curl https://api-staging.example.com/auth/status
```

### Player App
- [ ] Next.js build completes successfully
- [ ] Docker image built and pushed
- [ ] Production environment variables set
- [ ] API endpoints configured correctly
- [ ] WebSocket endpoint configured correctly
- [ ] CDN URL configured for static assets
- [ ] Deployment configured for staging
- [ ] Assets are compressed and optimized
- [ ] Service worker configured (if applicable)

**Verification Command:**
```bash
curl -I https://app-staging.example.com/
# Should return 200 OK with gzip encoding
```

### Backoffice
- [ ] Next.js build completes successfully
- [ ] Docker image built and pushed
- [ ] API endpoint configured to Gateway
- [ ] Admin authentication working
- [ ] All admin features tested
- [ ] Deployment configured for staging

**Sign-off:** _____________ Date: _______

## API & Integration Testing

### REST API Endpoints
- [ ] GET /api/v1/status returns 200 with health info
- [ ] GET /api/v1/fixtures returns fixture data
- [ ] GET /api/v1/markets returns market data
- [ ] POST /api/v1/bets accepts and persists bets
- [ ] POST /auth/login issues valid JWT tokens
- [ ] GET /api/v1/account returns user account data
- [ ] All error responses follow standard format
- [ ] Rate limiting is enforced
- [ ] CORS headers are correct

### WebSocket Endpoints
- [ ] WebSocket connection established at /ws
- [ ] Authentication required (JWT token)
- [ ] Can subscribe to market odds updates
- [ ] Can receive real-time bet confirmations
- [ ] Can receive settlement notifications
- [ ] Auto-reconnect works after connection drop
- [ ] No memory leaks during long-running connections
- [ ] Handles concurrent connections (load tested)

### Database Queries
- [ ] All queries use parameterized statements (no SQL injection risk)
- [ ] Transaction handling correct for bet placement
- [ ] Wallet balance calculation accurate
- [ ] Ledger entries created for all transactions
- [ ] Cascade deletes working correctly

### Error Handling
- [ ] All error cases handled gracefully
- [ ] Meaningful error messages returned to client
- [ ] No sensitive information in error messages
- [ ] Errors are logged for debugging
- [ ] Rate limit errors trigger correctly

**Sign-off:** _____________ Date: _______

## Security Verification

### Authentication & Authorization
- [ ] JWT secret is strong (32+ characters, random)
- [ ] Token expiration time appropriate (24 hours)
- [ ] Token refresh mechanism working
- [ ] Session timeout enforced
- [ ] Password hashing uses bcrypt (not md5/sha1)
- [ ] CORS origins configured whitelist only
- [ ] API keys/secrets never logged
- [ ] Admin endpoints require admin role verification
- [ ] User cannot access other user's data

**Verification Command:**
```bash
# Test unauthorized access
curl https://api-staging.example.com/api/v1/account
# Should return 401 Unauthorized
```

### Data Security
- [ ] Database connections use TLS
- [ ] All data in transit encrypted
- [ ] Passwords stored as bcrypt hashes
- [ ] Sensitive fields (PII) encrypted at rest (if required)
- [ ] Database backups encrypted
- [ ] Log files don't contain sensitive data
- [ ] Secrets not in Git repository
- [ ] Secrets not in Docker images

### Network Security
- [ ] All external traffic uses HTTPS
- [ ] TLS 1.3 minimum (no older versions)
- [ ] SSL certificate is valid and trusted
- [ ] SSL certificate will auto-renew before expiration
- [ ] HTTP traffic redirects to HTTPS
- [ ] Security headers present (HSTS, CSP, X-Frame-Options)
- [ ] CORS properly configured
- [ ] CSRF protection enabled
- [ ] WAF rules blocking known attacks
- [ ] DDoS protection enabled

**Verification Command:**
```bash
curl -I https://api-staging.example.com/
# Check for security headers: HSTS, CSP, etc.
```

### Secrets Management
- [ ] All secrets stored in secure vault (not env files)
- [ ] Secrets rotation policy in place
- [ ] Database passwords are unique and strong
- [ ] JWT secrets never shared
- [ ] API keys have appropriate scopes
- [ ] Secrets access logs reviewed
- [ ] Backup passwords stored securely

**Sign-off:** _____________ Date: _______

## Testing & Quality Assurance

### Unit Tests
- [ ] All Go tests passing (`make go-test`)
- [ ] Go test coverage > 70%
- [ ] All TypeScript tests passing
- [ ] TypeScript test coverage > 60%
- [ ] No failing tests in CI/CD pipeline

**Verification Command:**
```bash
make go-test
# All tests should pass
```

### Integration Tests
- [ ] Database integration tests passing
- [ ] Redis integration tests passing
- [ ] Auth service integration tests passing
- [ ] API endpoint tests passing
- [ ] Tests run against staging database

### End-to-End Tests
- [ ] Critical path E2E tests passing (`make qa-e2e-critical`)
- [ ] User registration to bet placement works end-to-end
- [ ] Market settlement works end-to-end
- [ ] Account balance updates work correctly
- [ ] WebSocket connections and updates work

**Verification Command:**
```bash
make qa-e2e-critical
# All critical path tests should pass
```

### Load Testing
- [ ] Load test completed against staging
- [ ] Gateway can handle 10,000+ concurrent connections
- [ ] API throughput meets target (1,000+ req/s)
- [ ] Bet placement latency acceptable (< 100ms P95)
- [ ] WebSocket broadcast latency acceptable (< 100ms)
- [ ] Database connection pool sizing validated
- [ ] No memory leaks detected under load
- [ ] No database deadlocks under load

**Test Results:**
- Concurrent connections achieved: _______
- API throughput (req/s): _______
- Bet placement latency P95 (ms): _______
- WebSocket broadcast latency P95 (ms): _______

### Penetration Testing
- [ ] Security review completed by external firm (if required)
- [ ] No critical vulnerabilities found
- [ ] All identified vulnerabilities have mitigations
- [ ] OWASP Top 10 vulnerabilities tested for
- [ ] SQL injection tests passed
- [ ] XSS protection verified
- [ ] CSRF protection verified

**Sign-off:** _____________ Date: _______

## Monitoring & Observability

### Prometheus Metrics
- [ ] Prometheus instance running and scraping metrics
- [ ] Gateway metrics endpoint (/metrics) responding
- [ ] Auth service metrics endpoint working
- [ ] Metric dashboards created
- [ ] Alert rules configured
- [ ] Custom business metrics (bets placed, etc.) emitted

**Verification Command:**
```bash
curl http://gateway:18080/metrics | head -20
# Should see HELP and TYPE lines for metrics
```

### Grafana Dashboards
- [ ] System health dashboard created (CPU, memory, disk)
- [ ] Application metrics dashboard created
- [ ] Database performance dashboard created
- [ ] Business metrics dashboard created
- [ ] Dashboards rendering correctly
- [ ] Alert notifications configured

### Logging
- [ ] Structured logging configured
- [ ] Logs aggregated to central location (ELK, Cloud Logging)
- [ ] Log retention policy in place
- [ ] Logs searchable and indexed
- [ ] Sensitive data not logged (PII, passwords)
- [ ] Application errors visible in logs
- [ ] Transaction IDs tracked across services

### Alerting
- [ ] Alert rules configured for:
  - [ ] Service down (pod not running)
  - [ ] High error rate (5%+)
  - [ ] High latency (response time > 500ms)
  - [ ] High CPU/memory usage (>80%)
  - [ ] Database unavailable
  - [ ] Redis unavailable
  - [ ] Disk space critical (>90%)
  - [ ] Certificate expiration (30 days)
- [ ] Alert routing configured to on-call team
- [ ] Alert notification channels tested (email, Slack, PagerDuty)
- [ ] Alert escalation policy defined

**Sign-off:** _____________ Date: _______

## Health Checks & Readiness

### Service Health
- [ ] Gateway health endpoint returns 200 (GET /api/v1/status)
- [ ] Auth service health endpoint returns 200
- [ ] Database connectivity verified
- [ ] Redis connectivity verified
- [ ] All services pass liveness probes
- [ ] All services pass readiness probes

**Verification Commands:**
```bash
curl https://api-staging.example.com/api/v1/status
curl https://api-staging.example.com/auth/status
```

### Dependency Health
- [ ] Database replication lag < 1 second
- [ ] Redis replication working
- [ ] All external service dependencies healthy
- [ ] CDN content delivering
- [ ] DNS resolution working
- [ ] TLS certificate valid

### Graceful Shutdown
- [ ] Services shutdown gracefully within 30 seconds
- [ ] WebSocket connections drain cleanly
- [ ] In-flight requests complete or return error
- [ ] Database connections closed
- [ ] Transactions rolled back if needed
- [ ] No data loss on shutdown

**Sign-off:** _____________ Date: _______

## Compliance & Regulatory

### Data Privacy
- [ ] GDPR compliance verified (if serving EU users)
- [ ] Data retention policies documented
- [ ] User data export functionality working
- [ ] User account deletion process documented
- [ ] Privacy policy published and accessible
- [ ] Cookie consent implemented (if required)

### Fraud & AML
- [ ] KYC/AML verification hooks implemented
- [ ] Large transaction monitoring configured
- [ ] Suspicious activity detection rules configured
- [ ] Transaction limits enforced
- [ ] Account suspension capability verified
- [ ] Fraud response playbook documented

### Financial Compliance
- [ ] Audit logging comprehensive
- [ ] Ledger entries complete and accurate
- [ ] Settlement process documented
- [ ] Payout calculations verified
- [ ] Compliance reporting available
- [ ] Financial records retention policy in place

**Sign-off:** _____________ Date: _______

## Documentation & Runbooks

### Documentation Complete
- [ ] README.md written and reviewed
- [ ] ARCHITECTURE.md complete with diagrams
- [ ] DEVELOPMENT.md covers local setup
- [ ] DEPLOYMENT.md covers production setup
- [ ] RUNBOOKS.md covers operational procedures
- [ ] CHANGELOG.md documents all changes
- [ ] API documentation generated and accessible
- [ ] Database schema documented

### Runbooks Created
- [ ] Market settlement runbook
- [ ] User account suspension runbook
- [ ] Stuck bet recovery runbook
- [ ] Database recovery runbook
- [ ] Incident response playbook
- [ ] Scaling procedures documented
- [ ] Backup/restore procedures documented
- [ ] Rollback procedures tested

### Operations Team Trained
- [ ] Operations team reviewed architecture
- [ ] Operations team reviewed runbooks
- [ ] Operations team performed dry-run of common procedures
- [ ] Escalation procedures defined
- [ ] On-call rotation established
- [ ] Incident response contacts available

**Sign-off:** _____________ Date: _______

## Rollback Plan

### Rollback Procedures Tested
- [ ] Database rollback procedure tested on staging
- [ ] Application rollback procedure tested
- [ ] Full system rollback procedure tested
- [ ] Rollback time measured (target: < 15 minutes)
- [ ] Data integrity verified after rollback
- [ ] Users can log in after rollback

**Test Results:**
- Rollback time: _______ minutes
- Data integrity check: _______ PASS/FAIL
- Services recovered: _______ PASS/FAIL

### Rollback Decision Criteria
- [ ] Critical bug found after launch
- [ ] Unacceptable performance degradation
- [ ] Data corruption or loss detected
- [ ] Security vulnerability exploited
- [ ] Compliance violation discovered

**Sign-off:** _____________ Date: _______

## Disaster Recovery

### Backup Testing
- [ ] Full database backup created
- [ ] Backup file size and integrity verified
- [ ] Backup restoration tested on alternate database
- [ ] Data integrity verified after restore
- [ ] Backup encryption verified
- [ ] Backup retention policy enforced

**Test Results:**
- Backup size: _______ GB
- Restoration time: _______ minutes
- Data integrity: _______ PASS/FAIL

### Disaster Recovery Plan
- [ ] RTO (Recovery Time Objective) defined: _______ minutes
- [ ] RPO (Recovery Point Objective) defined: _______ minutes
- [ ] Disaster scenarios documented:
  - [ ] Single server failure
  - [ ] Database failure
  - [ ] Entire region failure
  - [ ] Data center power loss
- [ ] Recovery procedures tested for each scenario
- [ ] Communication plan for users defined

**Sign-off:** _____________ Date: _______

## Go-Live Approval

### Final Verification
- [ ] All checklist items completed
- [ ] All critical issues resolved
- [ ] All testing passed
- [ ] All documentation complete
- [ ] Operations team ready
- [ ] Support team ready
- [ ] Management approval obtained

### Pre-Launch Communication
- [ ] Status page created
- [ ] User communication prepared
- [ ] Maintenance window announced (if needed)
- [ ] Support contact information published
- [ ] Incident response team notified
- [ ] Third-party dependencies notified

### Launch Activities
- [ ] Final sanity check performed
- [ ] All services started in correct order
- [ ] Health checks passing
- [ ] Monitoring and alerting active
- [ ] Support team on-call and monitoring
- [ ] First set of users brought on
- [ ] User feedback monitored
- [ ] Error rates monitored

**Sign-off:** _____________ Date: _______

### Post-Launch
- [ ] Incident-free operation for 24 hours
- [ ] Performance metrics reviewed
- [ ] User feedback positive
- [ ] Load test plan for week 1 executed
- [ ] Post-mortem completed (if any issues)
- [ ] Team retrospective scheduled

## Sign-Off Authority

**Product Manager:** _____________ Date: _______

**Engineering Lead:** _____________ Date: _______

**Operations Lead:** _____________ Date: _______

**Security Officer:** _____________ Date: _______

**Compliance Officer:** _____________ Date: _______

**Executive Sponsor:** _____________ Date: _______

---

## Launch Decision

**GO / NO-GO:** _____________

**Decision Reason:** _____________________________________

**Launch Date/Time:** ___________________________________

**Rollback Plan Activated By:** ___________________________

**Notes:** _______________________________________________

