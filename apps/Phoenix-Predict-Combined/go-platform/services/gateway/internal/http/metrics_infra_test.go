package http

import (
	"strings"
	"testing"
)

func TestGatewayInfraMetricsRendersAllCounters(t *testing.T) {
	body := GatewayInfraMetrics()

	// Every infra counter must surface with its name, a # TYPE line, and a
	// sample. Counters start at 0, which is a valid (and expected) sample.
	for _, name := range []string{
		"gateway_geo_missing_signal_denials_total",
		"gateway_geo_edge_auth_denials_total",
		"gateway_audit_write_failures_total",
		"gateway_ws_messages_dropped_total",
		"gateway_ws_slow_clients_disconnected_total",
		"gateway_ws_broadcasts_dropped_total",
	} {
		if !strings.Contains(body, "# TYPE "+name+" counter") {
			t.Errorf("missing # TYPE line for %s\n%s", name, body)
		}
		if !strings.Contains(body, name+" ") {
			t.Errorf("missing sample line for %s\n%s", name, body)
		}
	}
}
