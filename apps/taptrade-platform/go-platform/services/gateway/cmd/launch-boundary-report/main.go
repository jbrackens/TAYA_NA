package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"slices"
	"strings"

	gatewayhttp "taptrade/gateway/internal/http"
	"taptrade/platform/transport/httpx"
)

const legacyMoneyRoutesEnv = "TAPTRADE_LEGACY_MONEY_ROUTES_ENABLED"

type probeCase struct {
	Method string
	Path   string
	Body   string
}

type probeResult struct {
	Method string
	Path   string
	Status int
	Pass   bool
}

type statusPayload struct {
	Service            string   `json:"service"`
	Status             string   `json:"status"`
	PointMode          string   `json:"pointMode"`
	LegacyMoneyRoutes  string   `json:"legacyMoneyRoutes"`
	LaunchRouteDomains []string `json:"launchRouteDomains"`
}

type boundaryReport struct {
	Status   statusPayload
	Probes   []probeResult
	Failures []string
}

var prohibitedLegacyMoneyProbes = []probeCase{
	{http.MethodGet, "/api/v1/cashier/alpha/config", ""},
	{http.MethodGet, "/api/v1/cashier/alpha/wallet/challenge", ""},
	{http.MethodPost, "/api/v1/cashier/alpha/wallet/connect", `{}`},
	{http.MethodGet, "/api/v1/cashier/alpha/wallets", ""},
	{http.MethodPost, "/api/v1/cashier/alpha/deposit-intents", `{"amountPoints":100}`},
	{http.MethodPost, "/api/v1/cashier/alpha/deposit-intents/intent-1/submit-tx", `{"txHash":"0xabc"}`},
	{http.MethodPost, "/api/v1/cashier/alpha/withdrawal-requests", `{"destinationAddress":"0xabc","amountPoints":100}`},
	{http.MethodPost, "/api/v1/cashier/alpha/withdrawal-requests/request-1/cancel", `{}`},
	{http.MethodGet, "/api/v1/admin/cashier/alpha/preflight", ""},
	{http.MethodGet, "/api/v1/admin/cashier/alpha/deposits", ""},
	{http.MethodGet, "/api/v1/admin/cashier/alpha/reconciliation", ""},
	{http.MethodGet, "/api/v1/admin/cashier/alpha/withdrawals", ""},
	{http.MethodGet, "/api/v1/admin/cashier/alpha/audit-events", ""},
	{http.MethodPost, "/api/v1/admin/cashier/alpha/withdrawals/request-1/approve", `{}`},
	{http.MethodPost, "/api/v1/payments/deposit", `{"amountPoints":100,"paymentMethod":"card"}`},
	{http.MethodPost, "/api/v1/payments/withdraw", `{"userId":"u-1","amountPoints":100,"paymentMethod":"card"}`},
	{http.MethodGet, "/api/v1/payments/methods", ""},
	{http.MethodGet, "/api/v1/payments/status?transactionId=dep-1", ""},
	{http.MethodPost, "/api/v1/payments/webhook", `{}`},
	{http.MethodGet, "/api/v1/payments/crypto/config", ""},
	{http.MethodGet, "/api/v1/payments/crypto/deposit-address", ""},
}

func main() {
	report := runLaunchBoundaryReport()
	fmt.Print(renderReport(report))
	if len(report.Failures) > 0 {
		os.Exit(1)
	}
}

func runLaunchBoundaryReport() boundaryReport {
	previousLegacyMoneyValue, hadLegacyMoneyValue := os.LookupEnv(legacyMoneyRoutesEnv)
	_ = os.Unsetenv(legacyMoneyRoutesEnv)
	defer func() {
		if hadLegacyMoneyValue {
			_ = os.Setenv(legacyMoneyRoutesEnv, previousLegacyMoneyValue)
		}
	}()

	mux := http.NewServeMux()
	gatewayhttp.RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	report := boundaryReport{}
	report.Status = fetchStatus(handler, &report)
	for _, tc := range prohibitedLegacyMoneyProbes {
		result := probePath(handler, tc)
		report.Probes = append(report.Probes, result)
		if !result.Pass {
			report.Failures = append(report.Failures, fmt.Sprintf("%s %s returned %d, want 404", result.Method, result.Path, result.Status))
		}
	}
	validateStatus(report.Status, &report)
	return report
}

func fetchStatus(handler http.Handler, report *boundaryReport) statusPayload {
	req := httptest.NewRequest(http.MethodGet, "/api/v1/status", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		report.Failures = append(report.Failures, fmt.Sprintf("/api/v1/status returned %d", res.Code))
		return statusPayload{}
	}
	var payload statusPayload
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		report.Failures = append(report.Failures, fmt.Sprintf("decode /api/v1/status: %v", err))
	}
	return payload
}

func probePath(handler http.Handler, tc probeCase) probeResult {
	req := httptest.NewRequest(tc.Method, tc.Path, strings.NewReader(tc.Body))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	return probeResult{
		Method: tc.Method,
		Path:   tc.Path,
		Status: res.Code,
		Pass:   res.Code == http.StatusNotFound,
	}
}

func validateStatus(status statusPayload, report *boundaryReport) {
	if status.PointMode != "non_redeemable_points" {
		report.Failures = append(report.Failures, fmt.Sprintf("pointMode=%q, want non_redeemable_points", status.PointMode))
	}
	if status.LegacyMoneyRoutes != "disabled" {
		report.Failures = append(report.Failures, fmt.Sprintf("legacyMoneyRoutes=%q, want disabled", status.LegacyMoneyRoutes))
	}
	for _, domain := range []string{"alpha_cashier", "payments", "crypto_payments"} {
		if slices.Contains(status.LaunchRouteDomains, domain) {
			report.Failures = append(report.Failures, fmt.Sprintf("status advertises prohibited route domain %s", domain))
		}
	}
	for _, domain := range []string{"prediction", "orders", "point_wallet", "responsible_play", "loyalty", "leaderboards", "auth"} {
		if !slices.Contains(status.LaunchRouteDomains, domain) {
			report.Failures = append(report.Failures, fmt.Sprintf("status missing launch route domain %s", domain))
		}
	}
}

func renderReport(report boundaryReport) string {
	var b strings.Builder
	fmt.Fprintf(&b, "# Gateway Launch Boundary Report\n\n")
	fmt.Fprintf(&b, "- Point mode: `%s`\n", report.Status.PointMode)
	fmt.Fprintf(&b, "- Legacy money routes: `%s`\n", report.Status.LegacyMoneyRoutes)
	fmt.Fprintf(&b, "- Launch route domains: `%s`\n", strings.Join(report.Status.LaunchRouteDomains, ", "))
	fmt.Fprintf(&b, "- Prohibited route probes: %d\n", len(report.Probes))
	fmt.Fprintf(&b, "- Failures: %d\n\n", len(report.Failures))
	fmt.Fprintf(&b, "| Method | Path | Status | Result |\n")
	fmt.Fprintf(&b, "|---|---|---:|---:|\n")
	for _, result := range report.Probes {
		outcome := "Pass"
		if !result.Pass {
			outcome = "Fail"
		}
		fmt.Fprintf(&b, "| %s | `%s` | %d | %s |\n", result.Method, result.Path, result.Status, outcome)
	}
	if len(report.Failures) > 0 {
		fmt.Fprintf(&b, "\n## Failures\n\n")
		for _, failure := range report.Failures {
			fmt.Fprintf(&b, "- %s\n", failure)
		}
	}
	return b.String()
}
