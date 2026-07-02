package surveillance

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// Detector scans a time window and returns candidate alerts. Detectors read
// the trade/order log read-only; they never write to the trading core.
type Detector interface {
	Name() string
	Scan(ctx context.Context, db *sql.DB, since time.Time) ([]Alert, error)
}

// WashSelfTradeDetector flags trades where the same account is both buyer and
// seller (buyer_id == seller_id) — a textbook wash trade that inflates volume
// with no change in beneficial ownership. Non-AMM only: AMM trades have the
// house as counterparty, not the user, so buyer==seller cannot occur there and
// the filter avoids false positives if that ever changes.
type WashSelfTradeDetector struct{}

func (WashSelfTradeDetector) Name() string { return "wash_self_trade" }

func (WashSelfTradeDetector) Scan(ctx context.Context, db *sql.DB, since time.Time) ([]Alert, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()

	// Aggregate self-trades per (user, market) in the window: one alert per
	// subject-market rather than one per fill, so a burst of wash fills is a
	// single case-worthy signal. The dedupe key is stable per window-day so a
	// re-scan is idempotent.
	rows, err := db.QueryContext(ctx, `
SELECT buyer_id, market_id, COUNT(*) AS trade_count,
       COALESCE(SUM(quantity),0) AS total_qty,
       CAST(MIN(traded_at) AS TEXT) AS first_at,
       CAST(MAX(traded_at) AS TEXT) AS last_at
FROM prediction_trades
WHERE seller_id = buyer_id
  AND is_amm_trade = false
  AND traded_at >= $1
GROUP BY buyer_id, market_id`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	alerts := []Alert{}
	for rows.Next() {
		var subjectID, marketID, firstAt, lastAt string
		var tradeCount, totalQty int64
		if err := rows.Scan(&subjectID, &marketID, &tradeCount, &totalQty, &firstAt, &lastAt); err != nil {
			return nil, err
		}
		sev := "medium"
		if tradeCount >= 5 || totalQty >= 1000 {
			sev = "high"
		}
		alerts = append(alerts, Alert{
			Kind:      "wash_self_trade",
			Severity:  sev,
			SubjectID: subjectID,
			MarketID:  marketID,
			Summary: fmt.Sprintf("%d self-trade fill(s) totalling %d contracts (buyer == seller)",
				tradeCount, totalQty),
			Detail: map[string]any{
				"tradeCount": tradeCount,
				"totalQty":   totalQty,
				"firstAt":    firstAt,
				"lastAt":     lastAt,
			},
			// One alert per subject+market+day; re-scans of the same day
			// upsert-noop rather than duplicating.
			DedupeKey: fmt.Sprintf("wash_self_trade:%s:%s:%s", subjectID, marketID, dayOf(lastAt)),
		})
	}
	return alerts, rows.Err()
}

// dayOf extracts the YYYY-MM-DD prefix of an RFC-ish timestamp string for the
// dedupe key; falls back to the whole string if it is shorter.
func dayOf(ts string) string {
	if len(ts) >= 10 {
		return ts[:10]
	}
	return ts
}

// Engine runs a set of detectors and persists their alerts.
type Engine struct {
	store     *Store
	db        *sql.DB
	detectors []Detector
}

func NewEngine(store *Store, db *sql.DB, detectors ...Detector) *Engine {
	if len(detectors) == 0 {
		detectors = []Detector{WashSelfTradeDetector{}}
	}
	return &Engine{store: store, db: db, detectors: detectors}
}

// ScanResult reports what a scan produced.
type ScanResult struct {
	Detector string `json:"detector"`
	Found    int    `json:"found"`
	Inserted int    `json:"inserted"`
}

// Scan runs every detector over [now-lookback, now] and persists new alerts.
func (e *Engine) Scan(ctx context.Context, lookback time.Duration) ([]ScanResult, error) {
	since := time.Now().Add(-lookback)
	results := make([]ScanResult, 0, len(e.detectors))
	for _, d := range e.detectors {
		alerts, err := d.Scan(ctx, e.db, since)
		if err != nil {
			return results, fmt.Errorf("detector %s: %w", d.Name(), err)
		}
		inserted := 0
		for _, a := range alerts {
			ok, err := e.store.InsertAlert(ctx, a)
			if err != nil {
				return results, fmt.Errorf("persist %s alert: %w", d.Name(), err)
			}
			if ok {
				inserted++
			}
		}
		results = append(results, ScanResult{Detector: d.Name(), Found: len(alerts), Inserted: inserted})
	}
	return results, nil
}
