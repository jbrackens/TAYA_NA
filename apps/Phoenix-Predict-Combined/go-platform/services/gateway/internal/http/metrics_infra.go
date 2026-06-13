package http

import (
	"fmt"
	"strings"
	"sync/atomic"

	"phoenix-revival/gateway/internal/ws"
)

// auditWriteFailures counts provider-ops audit-log persistence failures
// (audit CMP-02/03). A nonzero value means a compliance audit entry was
// accepted in-memory but did NOT durably persist — the write silently
// degraded to a log line. Incremented in recordProviderOpsAuditEntry; an
// audit write must never fail unnoticed, so this drives a paging alert.
var auditWriteFailures atomic.Int64

// GatewayInfraMetrics renders gateway infrastructure counters — geo-gate
// denials (SEC-03 / GEO-01) and WebSocket fan-out drops (PERF-03) — in
// Prometheus text format. It is registered as a collector on the platform
// metrics registry in cmd/gateway/main.go (P3-05), so these counters surface
// on the canonical /metrics endpoint next to the HTTP request metrics rather
// than staying dark behind unexported package vars.
//
// Returns valid Prometheus text (each metric carries its own # HELP/# TYPE
// lines). Invoked at scrape time; safe for concurrent use.
func GatewayInfraMetrics() string {
	var b strings.Builder

	b.WriteString("# HELP gateway_geo_missing_signal_denials_total Money-path requests denied because the edge country signal was absent.\n")
	b.WriteString("# TYPE gateway_geo_missing_signal_denials_total counter\n")
	fmt.Fprintf(&b, "gateway_geo_missing_signal_denials_total %d\n", geoMissingSignalDenials.Load())

	b.WriteString("# HELP gateway_geo_edge_auth_denials_total Money-path requests denied for a missing or invalid edge-auth secret (direct-to-origin bypass attempt).\n")
	b.WriteString("# TYPE gateway_geo_edge_auth_denials_total counter\n")
	fmt.Fprintf(&b, "gateway_geo_edge_auth_denials_total %d\n", geoEdgeAuthDenials.Load())

	b.WriteString("# HELP gateway_audit_write_failures_total Provider-ops audit-log entries that failed to durably persist.\n")
	b.WriteString("# TYPE gateway_audit_write_failures_total counter\n")
	fmt.Fprintf(&b, "gateway_audit_write_failures_total %d\n", auditWriteFailures.Load())

	b.WriteString(ws.RenderMetrics())
	return b.String()
}
