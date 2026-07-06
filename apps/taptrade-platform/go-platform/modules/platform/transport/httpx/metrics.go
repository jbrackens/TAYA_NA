package httpx

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

type RequestMetric struct {
	Method          string
	Path            string
	StatusCode      int
	Count           int64
	DurationMsSum   int64
	LastObservedUTC string
}

type MetricsRegistry struct {
	mu         sync.RWMutex
	metrics    map[string]RequestMetric
	collectors []func() string
	started    time.Time
	hostname   string
}

func NewMetricsRegistry() *MetricsRegistry {
	return &MetricsRegistry{
		metrics: make(map[string]RequestMetric),
		started: time.Now().UTC(),
	}
}

func (r *MetricsRegistry) Observe(method string, path string, statusCode int, duration time.Duration) {
	key := metricKey(method, path, statusCode)
	durationMs := duration.Milliseconds()
	observedAt := time.Now().UTC().Format(time.RFC3339)

	r.mu.Lock()
	defer r.mu.Unlock()

	current, ok := r.metrics[key]
	if !ok {
		current = RequestMetric{
			Method:     method,
			Path:       path,
			StatusCode: statusCode,
		}
	}
	current.Count++
	current.DurationMsSum += durationMs
	current.LastObservedUTC = observedAt
	r.metrics[key] = current
}

func (r *MetricsRegistry) Snapshot() []RequestMetric {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]RequestMetric, 0, len(r.metrics))
	for _, metric := range r.metrics {
		out = append(out, metric)
	}

	sort.Slice(out, func(i, j int) bool {
		if out[i].Path != out[j].Path {
			return out[i].Path < out[j].Path
		}
		if out[i].Method != out[j].Method {
			return out[i].Method < out[j].Method
		}
		return out[i].StatusCode < out[j].StatusCode
	})
	return out
}

// RegisterCollector adds an auxiliary metrics source whose Prometheus text
// output is appended to the /metrics body after the built-in HTTP request
// metrics. Use it to surface domain or infrastructure counters that live
// outside this registry — WebSocket drop counts, geo-gate denials, etc. —
// without coupling those packages to the HTTP layer. Each collector must
// return valid Prometheus text (its own # HELP/# TYPE lines included), or
// "" to contribute nothing. Collectors are invoked at scrape time, not at
// registration time. Safe for concurrent use; a nil collector is ignored.
func (r *MetricsRegistry) RegisterCollector(c func() string) {
	if c == nil {
		return
	}
	r.mu.Lock()
	r.collectors = append(r.collectors, c)
	r.mu.Unlock()
}

// collectorSnapshot returns a copy of the registered collectors so they can
// be invoked without holding the registry lock (a collector must never block
// HTTP metric observation).
func (r *MetricsRegistry) collectorSnapshot() []func() string {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]func() string, len(r.collectors))
	copy(out, r.collectors)
	return out
}

func Metrics(registry *MetricsRegistry) Middleware {
	if registry == nil {
		registry = NewMetricsRegistry()
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			started := time.Now()
			recorder := newStatusRecorder(w)

			next.ServeHTTP(recorder, r)

			registry.Observe(r.Method, r.URL.Path, recorder.statusCode, time.Since(started))
		})
	}
}

func MetricsHandler(registry *MetricsRegistry, service string) http.Handler {
	if registry == nil {
		registry = NewMetricsRegistry()
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			WriteError(w, r, MethodNotAllowed(r.Method, http.MethodGet))
			return
		}

		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		_, _ = w.Write([]byte("# HELP taptrade_http_requests_total Total HTTP requests processed.\n"))
		_, _ = w.Write([]byte("# TYPE taptrade_http_requests_total counter\n"))
		_, _ = w.Write([]byte("# HELP taptrade_http_request_duration_ms_sum Total request duration in milliseconds.\n"))
		_, _ = w.Write([]byte("# TYPE taptrade_http_request_duration_ms_sum counter\n"))

		for _, metric := range registry.Snapshot() {
			status := strconv.Itoa(metric.StatusCode)
			labels := fmt.Sprintf(
				`service="%s",method="%s",path="%s",status="%s"`,
				prometheusEscape(service),
				prometheusEscape(metric.Method),
				prometheusEscape(metric.Path),
				prometheusEscape(status),
			)
			_, _ = w.Write([]byte(fmt.Sprintf("taptrade_http_requests_total{%s} %d\n", labels, metric.Count)))
			_, _ = w.Write([]byte(fmt.Sprintf("taptrade_http_request_duration_ms_sum{%s} %d\n", labels, metric.DurationMsSum)))
		}

		// Append any registered domain/infrastructure collectors.
		for _, collect := range registry.collectorSnapshot() {
			if text := collect(); text != "" {
				_, _ = w.Write([]byte(text))
			}
		}
	})
}

func metricKey(method string, path string, statusCode int) string {
	return method + "|" + path + "|" + strconv.Itoa(statusCode)
}

func prometheusEscape(value string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `"`, `\"`, "\n", `\n`)
	return replacer.Replace(value)
}
