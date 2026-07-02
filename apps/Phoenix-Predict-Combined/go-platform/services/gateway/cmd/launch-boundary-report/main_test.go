package main

import (
	"strings"
	"testing"
)

func TestLaunchBoundaryReportProvesLegacyMoneyRoutesAbsent(t *testing.T) {
	t.Setenv(legacyMoneyRoutesEnv, "true")

	report := runLaunchBoundaryReport()
	if len(report.Failures) > 0 {
		t.Fatalf("expected launch boundary report to pass, got failures: %v", report.Failures)
	}
	if report.Status.PointMode != "non_redeemable_points" {
		t.Fatalf("unexpected point mode: %+v", report.Status)
	}
	if report.Status.LegacyMoneyRoutes != "disabled" {
		t.Fatalf("report must force launch mode even when env was set: %+v", report.Status)
	}
	if len(report.Probes) != len(prohibitedLegacyMoneyProbes) {
		t.Fatalf("expected %d probes, got %d", len(prohibitedLegacyMoneyProbes), len(report.Probes))
	}
	for _, result := range report.Probes {
		if !result.Pass || result.Status != 404 {
			t.Fatalf("expected %s %s to be absent, got %+v", result.Method, result.Path, result)
		}
	}
}

func TestLaunchBoundaryReportUsesPointSafeSummary(t *testing.T) {
	report := runLaunchBoundaryReport()
	rendered := renderReport(report)
	for _, required := range []string{
		"Gateway Launch Boundary Report",
		"non_redeemable_points",
		"Legacy money routes: `disabled`",
		"Prohibited route probes",
	} {
		if !strings.Contains(rendered, required) {
			t.Fatalf("rendered report missing %q:\n%s", required, rendered)
		}
	}
	for _, prohibitedDomain := range []string{"alpha_cashier", "crypto_payments"} {
		if strings.Contains(strings.Join(report.Status.LaunchRouteDomains, ","), prohibitedDomain) {
			t.Fatalf("launch domains must not include %s: %+v", prohibitedDomain, report.Status)
		}
	}
}
