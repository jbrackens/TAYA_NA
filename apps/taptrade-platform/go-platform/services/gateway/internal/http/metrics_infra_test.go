package http

import (
	"strings"
	"testing"
)

func TestGatewayInfraMetricsRendersAllCounters(t *testing.T) {
	t.Setenv(legacyMoneyRoutesEnv, "")

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

func TestLaunchInfraMetricsExcludeLegacyMoneyCollector(t *testing.T) {
	t.Setenv(legacyMoneyRoutesEnv, "")

	body := GatewayInfraMetrics()
	moneyPathToken := "money" + "-path"
	for _, token := range []string{
		"gateway_alpha_cashier_audit_write_failures_total",
		"alpha_cashier",
		"Alpha-cashier",
		moneyPathToken,
		"cashier",
		"payment",
		"crypto",
	} {
		if strings.Contains(body, token) {
			t.Fatalf("launch metrics must not advertise legacy money surface %q:\n%s", token, body)
		}
	}
}

func TestLegacyInfraMetricsRequiresExplicitOptIn(t *testing.T) {
	t.Setenv(legacyMoneyRoutesEnv, "true")

	body := GatewayInfraMetrics()
	const name = "gateway_alpha_cashier_audit_write_failures_total"
	if !strings.Contains(body, "# TYPE "+name+" counter") {
		t.Fatalf("legacy opt-in metrics should include # TYPE line for %s:\n%s", name, body)
	}
	if !strings.Contains(body, name+" ") {
		t.Fatalf("legacy opt-in metrics should include sample line for %s:\n%s", name, body)
	}
	moneyPathToken := "money" + "-path"
	if strings.Contains(body, moneyPathToken) {
		t.Fatalf("legacy opt-in metrics should avoid %q wording:\n%s", moneyPathToken, body)
	}
}
