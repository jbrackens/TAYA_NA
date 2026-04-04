package http

import (
	"fmt"
	stdhttp "net/http"
	"os"
	"strings"

	"phoenix-revival/gateway/internal/bets"
	"phoenix-revival/gateway/internal/provider"
	"phoenix-revival/platform/transport/httpx"
)

func registerFeedMetricsRoute(
	mux *stdhttp.ServeMux,
	service string,
	providerRuntime *provider.Runtime,
	betService *bets.Service,
) {
	thresholds := provider.FeedThresholdsFromEnv(os.Getenv)

	mux.Handle("/metrics/feed", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		payload := provider.RenderPrometheusFeedMetrics(service, providerRuntime, thresholds) +
			renderBetOfferPrometheusMetrics(service, betService) +
			renderCashoutPrometheusMetrics(service, betService)
		_, _ = w.Write([]byte(payload))
		return nil
	}))
}

func renderBetOfferPrometheusMetrics(service string, betService *bets.Service) string {
	if betService == nil {
		return ""
	}

	metrics, status := betService.AlternativeOfferMetricsSnapshot()
	builder := strings.Builder{}
	builder.WriteString("# HELP phoenix_bet_offer_created_total Total alternative-odds offers created.\n")
	builder.WriteString("# TYPE phoenix_bet_offer_created_total counter\n")
	builder.WriteString(fmt.Sprintf("phoenix_bet_offer_created_total{service=\"%s\"} %d\n", service, metrics.Created))

	builder.WriteString("# HELP phoenix_bet_offer_repriced_total Total alternative-odds offers repriced.\n")
	builder.WriteString("# TYPE phoenix_bet_offer_repriced_total counter\n")
	builder.WriteString(fmt.Sprintf("phoenix_bet_offer_repriced_total{service=\"%s\"} %d\n", service, metrics.Repriced))

	builder.WriteString("# HELP phoenix_bet_offer_accepted_total Total alternative-odds offers accepted.\n")
	builder.WriteString("# TYPE phoenix_bet_offer_accepted_total counter\n")
	builder.WriteString(fmt.Sprintf("phoenix_bet_offer_accepted_total{service=\"%s\"} %d\n", service, metrics.Accepted))

	builder.WriteString("# HELP phoenix_bet_offer_declined_total Total alternative-odds offers declined.\n")
	builder.WriteString("# TYPE phoenix_bet_offer_declined_total counter\n")
	builder.WriteString(fmt.Sprintf("phoenix_bet_offer_declined_total{service=\"%s\"} %d\n", service, metrics.Declined))

	builder.WriteString("# HELP phoenix_bet_offer_expired_total Total alternative-odds offers expired.\n")
	builder.WriteString("# TYPE phoenix_bet_offer_expired_total counter\n")
	builder.WriteString(fmt.Sprintf("phoenix_bet_offer_expired_total{service=\"%s\"} %d\n", service, metrics.Expired))

	builder.WriteString("# HELP phoenix_bet_offer_committed_total Total alternative-odds offers committed into placed bets.\n")
	builder.WriteString("# TYPE phoenix_bet_offer_committed_total counter\n")
	builder.WriteString(fmt.Sprintf("phoenix_bet_offer_committed_total{service=\"%s\"} %d\n", service, metrics.Committed))

	builder.WriteString("# HELP phoenix_bet_offer_status_total Current alternative-odds offers by status.\n")
	builder.WriteString("# TYPE phoenix_bet_offer_status_total gauge\n")
	builder.WriteString(fmt.Sprintf("phoenix_bet_offer_status_total{service=\"%s\",status=\"total\"} %d\n", service, status.Total))
	builder.WriteString(fmt.Sprintf("phoenix_bet_offer_status_total{service=\"%s\",status=\"open\"} %d\n", service, status.Open))
	builder.WriteString(fmt.Sprintf("phoenix_bet_offer_status_total{service=\"%s\",status=\"accepted\"} %d\n", service, status.Accepted))
	builder.WriteString(fmt.Sprintf("phoenix_bet_offer_status_total{service=\"%s\",status=\"declined\"} %d\n", service, status.Declined))
	builder.WriteString(fmt.Sprintf("phoenix_bet_offer_status_total{service=\"%s\",status=\"expired\"} %d\n", service, status.Expired))
	builder.WriteString(fmt.Sprintf("phoenix_bet_offer_status_total{service=\"%s\",status=\"committed\"} %d\n", service, status.Committed))

	return builder.String()
}

func renderCashoutPrometheusMetrics(service string, betService *bets.Service) string {
	if betService == nil {
		return ""
	}

	metrics := betService.CashoutMetricsSnapshot()
	builder := strings.Builder{}
	builder.WriteString("# HELP phoenix_cashout_quote_created_total Total cashout quotes created.\n")
	builder.WriteString("# TYPE phoenix_cashout_quote_created_total counter\n")
	builder.WriteString(fmt.Sprintf("phoenix_cashout_quote_created_total{service=\"%s\"} %d\n", service, metrics.QuotesCreated))

	builder.WriteString("# HELP phoenix_cashout_quote_accepted_total Total cashout quotes accepted.\n")
	builder.WriteString("# TYPE phoenix_cashout_quote_accepted_total counter\n")
	builder.WriteString(fmt.Sprintf("phoenix_cashout_quote_accepted_total{service=\"%s\"} %d\n", service, metrics.QuotesAccepted))

	builder.WriteString("# HELP phoenix_cashout_quote_expired_total Total cashout quotes expired.\n")
	builder.WriteString("# TYPE phoenix_cashout_quote_expired_total counter\n")
	builder.WriteString(fmt.Sprintf("phoenix_cashout_quote_expired_total{service=\"%s\"} %d\n", service, metrics.QuotesExpired))

	builder.WriteString("# HELP phoenix_cashout_quote_stale_reject_total Total stale cashout quote rejections.\n")
	builder.WriteString("# TYPE phoenix_cashout_quote_stale_reject_total counter\n")
	builder.WriteString(fmt.Sprintf("phoenix_cashout_quote_stale_reject_total{service=\"%s\"} %d\n", service, metrics.StaleRejects))

	builder.WriteString("# HELP phoenix_cashout_quote_conflict_total Total cashout quote state conflicts.\n")
	builder.WriteString("# TYPE phoenix_cashout_quote_conflict_total counter\n")
	builder.WriteString(fmt.Sprintf("phoenix_cashout_quote_conflict_total{service=\"%s\"} %d\n", service, metrics.QuoteStateConflicts))
	return builder.String()
}
