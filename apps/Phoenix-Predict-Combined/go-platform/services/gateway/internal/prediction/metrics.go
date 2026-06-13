package prediction

import (
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Metrics is the prediction-domain Prometheus-format counter registry. It
// lives next to (not inside) the platform's httpx.MetricsRegistry because
// the two have different label cardinality and lifecycle: HTTP metrics are
// per-endpoint, while prediction metrics are per-market and per-engine-event.
//
// All Record* methods are goroutine-safe and constant-time. Allocations
// happen only on first observation of a unique label set; subsequent
// observations only bump the int64 counter under a single map lookup.
//
// Cardinality: label sets are keyed on market_id, which we cap at the
// market count we operate (~hundreds today, low thousands at scale).
// Adding free-form labels would blow this up; resist the urge.
type Metrics struct {
	mu sync.RWMutex

	// Orders placed. Key fields: market_id|side|action|order_type|status.
	// `status` covers both accepted ("open"|"filled"|"partial") and rejected
	// ("rejected") outcomes so a single rate query can show acceptance %.
	orders map[orderKey]int64

	// Trades produced by the exchange engine. One row per Trade in a plan;
	// issuance trades produce a single row (the engine's complementary pair
	// shares a match_id but the metric reflects discrete fills).
	trades map[tradeKey]int64

	// Reconciler runs by outcome ("clean" | "drift" | "error").
	reconcilerRuns map[string]int64

	// Drift events per market.
	driftEvents map[string]int64

	// Settlements by (market_id, result, override).
	settlements map[settlementKey]int64

	// SMM skip counts — reasons the synthetic market maker chose not to
	// post a quote on a tick. Key is the reason string (kept opaque so
	// callers can add new reasons without touching this file).
	smmSkips map[smmSkipKey]int64

	// Operation latency histograms, keyed by a low-cardinality op name
	// ("place_order", "settlement"). Lets Prometheus compute p95/p99 via
	// histogram_quantile. Deliberately NOT keyed on market_id — latency
	// percentiles are a system-health signal, not a per-market one, and a
	// per-market histogram would multiply bucket cardinality by market count.
	opLatency map[string]*histogram
}

// latencyBucketsMs are the cumulative histogram upper bounds (the Prometheus
// `le` label), in milliseconds. Chosen to bracket the sub-millisecond to
// multi-second range a single PlaceOrder or settlement can span.
var latencyBucketsMs = []float64{1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000}

// histogram holds non-cumulative per-bucket counts plus the running sum and
// total. Cumulative bucket values (what Prometheus expects) are computed at
// render time. An observation larger than the largest explicit bound lands
// only in the implicit +Inf bucket (which always equals count).
type histogram struct {
	bucketCounts []int64 // len == len(latencyBucketsMs); obs falls in exactly one
	sumMs        float64
	count        int64
}

type smmSkipKey struct {
	market, side, reason string
}

type orderKey struct {
	market, side, action, orderType, status string
}

type tradeKey struct {
	market, tradeKind, engineKind string
}

type settlementKey struct {
	market, result, override string
}

// NewMetrics returns an initialised, empty registry.
func NewMetrics() *Metrics {
	return &Metrics{
		orders:         make(map[orderKey]int64),
		trades:         make(map[tradeKey]int64),
		reconcilerRuns: make(map[string]int64),
		driftEvents:    make(map[string]int64),
		settlements:    make(map[settlementKey]int64),
		smmSkips:       make(map[smmSkipKey]int64),
		opLatency:      make(map[string]*histogram),
	}
}

// RecordLatency observes one operation's wall-clock duration into the
// histogram for op (e.g. "place_order", "settlement"). Constant-time after
// the first observation of an op. nil receiver / empty op are no-ops.
func (m *Metrics) RecordLatency(op string, d time.Duration) {
	if m == nil || op == "" {
		return
	}
	ms := float64(d.Microseconds()) / 1000.0
	m.mu.Lock()
	h := m.opLatency[op]
	if h == nil {
		h = &histogram{bucketCounts: make([]int64, len(latencyBucketsMs))}
		m.opLatency[op] = h
	}
	for i, ub := range latencyBucketsMs {
		if ms <= ub {
			h.bucketCounts[i]++
			break
		}
	}
	h.sumMs += ms
	h.count++
	m.mu.Unlock()
}

// RecordSMMSkip increments a counter when the SMM declines to post a
// quote on a tick. Reasons are short opaque strings, e.g.:
//   - "position_cap"  — bot's accumulated position on this side has
//                       hit SMM_MAX_POSITION_QTY
//   - "price_band"    — market sits at the edge of [1, 99] and a
//                       symmetric quote would fall outside
//   - "stale_price"   — market.last_quote_at is older than threshold
//                       (Phase 2: not yet implemented)
//
// Side is the side the bot wanted to post on ("yes"|"no"), market
// is the market_id. nil receiver is safe (no-op).
func (m *Metrics) RecordSMMSkip(marketID, side, reason string) {
	if m == nil || marketID == "" || reason == "" {
		return
	}
	k := smmSkipKey{market: marketID, side: side, reason: reason}
	m.mu.Lock()
	m.smmSkips[k]++
	m.mu.Unlock()
}

// RecordOrder is called once per order placement, whether accepted or
// rejected. `status` should be the post-engine status: "open" (rests),
// "filled", "partial", or "rejected". `orderType` is "market" or "limit".
//
// Empty Metrics receiver is a no-op so callers can pass nil during tests
// that don't care about observability.
func (m *Metrics) RecordOrder(marketID string, side OrderSide, action OrderAction, orderType OrderType, status OrderStatus) {
	if m == nil {
		return
	}
	k := orderKey{
		market:    marketID,
		side:      string(side),
		action:    string(action),
		orderType: string(orderType),
		status:    string(status),
	}
	m.mu.Lock()
	m.orders[k]++
	m.mu.Unlock()
}

// RecordTrade is called once per Trade produced by the engine. For an
// issuance fill that mints YES+NO simultaneously, the engine creates two
// trade rows sharing a match_id and this method is called twice.
func (m *Metrics) RecordTrade(marketID string, kind TradeKind, engine EngineKind) {
	if m == nil {
		return
	}
	k := tradeKey{
		market:     marketID,
		tradeKind:  string(kind),
		engineKind: string(engine),
	}
	m.mu.Lock()
	m.trades[k]++
	m.mu.Unlock()
}

// RecordReconcilerRun tags one reconciler iteration with its outcome.
// The outcome string is opaque; recommended values are "clean", "drift",
// "error". A run is "clean" when invariants hold, "drift" when the
// reconciler wrote an adjustment ledger entry, "error" when the iteration
// failed before completing.
func (m *Metrics) RecordReconcilerRun(outcome string) {
	if m == nil {
		return
	}
	if outcome == "" {
		outcome = "unknown"
	}
	m.mu.Lock()
	m.reconcilerRuns[outcome]++
	m.mu.Unlock()
}

// RecordDriftEvent increments the per-market drift counter. Each call
// corresponds to one reconciler-detected discrepancy, regardless of size.
// Use prediction_collateral_ledger for amounts.
func (m *Metrics) RecordDriftEvent(marketID string) {
	if m == nil || marketID == "" {
		return
	}
	m.mu.Lock()
	m.driftEvents[marketID]++
	m.mu.Unlock()
}

// RecordSettlement is called once per market settlement. `override` is
// "true" when the admin had to provide an override reason (collateral
// imbalance), "false" otherwise. Tracking override rate is a leading
// indicator of upstream drift.
func (m *Metrics) RecordSettlement(marketID, result string, override bool) {
	if m == nil {
		return
	}
	o := "false"
	if override {
		o = "true"
	}
	k := settlementKey{market: marketID, result: result, override: o}
	m.mu.Lock()
	m.settlements[k]++
	m.mu.Unlock()
}

// Render emits Prometheus text format. Safe for concurrent readers.
//
// Stable ordering: keys are sorted lexicographically so diff'ing two
// snapshots is meaningful. Prometheus doesn't require this but humans
// reading curl output do.
func (m *Metrics) Render() string {
	if m == nil {
		return ""
	}
	m.mu.RLock()
	defer m.mu.RUnlock()

	var b strings.Builder

	// Orders
	b.WriteString("# HELP prediction_orders_total Orders placed, by outcome.\n")
	b.WriteString("# TYPE prediction_orders_total counter\n")
	orderKeys := make([]orderKey, 0, len(m.orders))
	for k := range m.orders {
		orderKeys = append(orderKeys, k)
	}
	sort.Slice(orderKeys, func(i, j int) bool { return orderKeyLess(orderKeys[i], orderKeys[j]) })
	for _, k := range orderKeys {
		fmt.Fprintf(&b,
			`prediction_orders_total{market_id=%q,side=%q,action=%q,order_type=%q,status=%q} %d`+"\n",
			esc(k.market), esc(k.side), esc(k.action), esc(k.orderType), esc(k.status), m.orders[k],
		)
	}

	// Trades
	b.WriteString("# HELP prediction_trades_total Trades produced by the engine, by kind.\n")
	b.WriteString("# TYPE prediction_trades_total counter\n")
	tradeKeys := make([]tradeKey, 0, len(m.trades))
	for k := range m.trades {
		tradeKeys = append(tradeKeys, k)
	}
	sort.Slice(tradeKeys, func(i, j int) bool { return tradeKeyLess(tradeKeys[i], tradeKeys[j]) })
	for _, k := range tradeKeys {
		fmt.Fprintf(&b,
			`prediction_trades_total{market_id=%q,trade_kind=%q,engine_kind=%q} %d`+"\n",
			esc(k.market), esc(k.tradeKind), esc(k.engineKind), m.trades[k],
		)
	}

	// Reconciler runs
	b.WriteString("# HELP prediction_reconciler_runs_total Reconciler iterations, by outcome.\n")
	b.WriteString("# TYPE prediction_reconciler_runs_total counter\n")
	rrKeys := sortedKeys(m.reconcilerRuns)
	for _, k := range rrKeys {
		fmt.Fprintf(&b,
			`prediction_reconciler_runs_total{outcome=%q} %d`+"\n",
			esc(k), m.reconcilerRuns[k],
		)
	}

	// Drift events
	b.WriteString("# HELP prediction_drift_events_total Collateral drift events detected, per market.\n")
	b.WriteString("# TYPE prediction_drift_events_total counter\n")
	deKeys := sortedKeys(m.driftEvents)
	for _, k := range deKeys {
		fmt.Fprintf(&b,
			`prediction_drift_events_total{market_id=%q} %d`+"\n",
			esc(k), m.driftEvents[k],
		)
	}

	// Settlements
	b.WriteString("# HELP prediction_settlements_total Markets settled, by result and override flag.\n")
	b.WriteString("# TYPE prediction_settlements_total counter\n")
	sKeys := make([]settlementKey, 0, len(m.settlements))
	for k := range m.settlements {
		sKeys = append(sKeys, k)
	}
	sort.Slice(sKeys, func(i, j int) bool { return settlementKeyLess(sKeys[i], sKeys[j]) })
	for _, k := range sKeys {
		fmt.Fprintf(&b,
			`prediction_settlements_total{market_id=%q,result=%q,override=%q} %d`+"\n",
			esc(k.market), esc(k.result), esc(k.override), m.settlements[k],
		)
	}

	// SMM skips
	b.WriteString("# HELP prediction_smm_skips_total SMM ticks where a quote was suppressed, by market/side/reason.\n")
	b.WriteString("# TYPE prediction_smm_skips_total counter\n")
	skKeys := make([]smmSkipKey, 0, len(m.smmSkips))
	for k := range m.smmSkips {
		skKeys = append(skKeys, k)
	}
	sort.Slice(skKeys, func(i, j int) bool { return smmSkipKeyLess(skKeys[i], skKeys[j]) })
	for _, k := range skKeys {
		fmt.Fprintf(&b,
			`prediction_smm_skips_total{market_id=%q,side=%q,reason=%q} %d`+"\n",
			esc(k.market), esc(k.side), esc(k.reason), m.smmSkips[k],
		)
	}

	// Operation latency histograms
	b.WriteString("# HELP prediction_operation_duration_ms Operation wall-clock latency in milliseconds.\n")
	b.WriteString("# TYPE prediction_operation_duration_ms histogram\n")
	ops := make([]string, 0, len(m.opLatency))
	for op := range m.opLatency {
		ops = append(ops, op)
	}
	sort.Strings(ops)
	for _, op := range ops {
		h := m.opLatency[op]
		var cum int64
		for i, ub := range latencyBucketsMs {
			cum += h.bucketCounts[i]
			fmt.Fprintf(&b,
				`prediction_operation_duration_ms_bucket{op=%q,le=%q} %d`+"\n",
				esc(op), strconv.FormatFloat(ub, 'g', -1, 64), cum,
			)
		}
		fmt.Fprintf(&b, `prediction_operation_duration_ms_bucket{op=%q,le="+Inf"} %d`+"\n", esc(op), h.count)
		fmt.Fprintf(&b, `prediction_operation_duration_ms_sum{op=%q} %g`+"\n", esc(op), h.sumMs)
		fmt.Fprintf(&b, `prediction_operation_duration_ms_count{op=%q} %d`+"\n", esc(op), h.count)
	}

	return b.String()
}

func smmSkipKeyLess(a, b smmSkipKey) bool {
	if a.market != b.market {
		return a.market < b.market
	}
	if a.side != b.side {
		return a.side < b.side
	}
	return a.reason < b.reason
}

// Handler returns an http.Handler that serves the Prometheus text format
// at whatever path the caller mounts it on (recommended:
// /metrics/prediction so a single scrape config can pull both this and
// the platform-level /metrics).
func (m *Metrics) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			w.Header().Set("Allow", "GET")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
		_, _ = w.Write([]byte(m.Render()))
	})
}

// --- helpers ---

func sortedKeys(m map[string]int64) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func orderKeyLess(a, b orderKey) bool {
	if a.market != b.market {
		return a.market < b.market
	}
	if a.side != b.side {
		return a.side < b.side
	}
	if a.action != b.action {
		return a.action < b.action
	}
	if a.orderType != b.orderType {
		return a.orderType < b.orderType
	}
	return a.status < b.status
}

func tradeKeyLess(a, b tradeKey) bool {
	if a.market != b.market {
		return a.market < b.market
	}
	if a.tradeKind != b.tradeKind {
		return a.tradeKind < b.tradeKind
	}
	return a.engineKind < b.engineKind
}

func settlementKeyLess(a, b settlementKey) bool {
	if a.market != b.market {
		return a.market < b.market
	}
	if a.result != b.result {
		return a.result < b.result
	}
	return a.override < b.override
}

// esc escapes the special chars Prometheus reserves in label values.
// Replicates the helper in modules/platform/transport/httpx/metrics.go;
// kept inline to avoid a cross-package import for one function.
func esc(s string) string {
	if s == "" {
		return ""
	}
	repl := strings.NewReplacer(`\`, `\\`, `"`, `\"`, "\n", `\n`)
	return repl.Replace(s)
}
