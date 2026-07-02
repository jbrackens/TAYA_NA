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

// SpoofingDetector flags limit orders placed and cancelled quickly with little
// or no fill — the shape of order-book spoofing (post size to move price, pull
// before it trades). Aggregated per subject+market+day; a single quick cancel
// is noise, a pattern is a signal.
type SpoofingDetector struct {
	// MaxDwell is the longest place→cancel gap still considered "quick".
	MaxDwell time.Duration
	// MinCancels is how many quick, unfilled cancels in the window trip an alert.
	MinCancels int
	// MinQuantity ignores dust orders below this size.
	MinQuantity int
}

func (d SpoofingDetector) withDefaults() SpoofingDetector {
	if d.MaxDwell <= 0 {
		d.MaxDwell = 60 * time.Second
	}
	if d.MinCancels <= 0 {
		d.MinCancels = 3
	}
	if d.MinQuantity <= 0 {
		d.MinQuantity = 50
	}
	return d
}

func (SpoofingDetector) Name() string { return "spoofing" }

func (d SpoofingDetector) Scan(ctx context.Context, db *sql.DB, since time.Time) ([]Alert, error) {
	d = d.withDefaults()
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()

	// Quick, LITTLE-OR-NO-fill limit-order cancels per user+market. dwell uses
	// cancelled_at - created_at. The fill gate is <10% of size, not strictly
	// zero: a spoofer who lets a token lot fill to look legitimate should not
	// escape, and a genuinely-working order that mostly executed before a
	// cancel is not spoofing.
	rows, err := db.QueryContext(ctx, `
SELECT user_id, market_id, COUNT(*) AS cancels, COALESCE(SUM(quantity),0) AS total_qty,
       CAST(MAX(cancelled_at) AS TEXT) AS last_at
FROM prediction_orders
WHERE order_type = 'limit'
  AND status = 'cancelled'
  AND cancelled_at IS NOT NULL
  AND created_at >= $1
  AND filled_quantity * 10 < quantity
  AND quantity >= $2
  AND cancelled_at - created_at <= ($3 || ' seconds')::interval
GROUP BY user_id, market_id
HAVING COUNT(*) >= $4`,
		since, d.MinQuantity, fmt.Sprintf("%d", int(d.MaxDwell.Seconds())), d.MinCancels)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	alerts := []Alert{}
	for rows.Next() {
		var subjectID, marketID, lastAt string
		var cancels, totalQty int64
		if err := rows.Scan(&subjectID, &marketID, &cancels, &totalQty, &lastAt); err != nil {
			return nil, err
		}
		sev := "medium"
		if cancels >= int64(d.MinCancels)*3 {
			sev = "high"
		}
		alerts = append(alerts, Alert{
			Kind:      "spoofing",
			Severity:  sev,
			SubjectID: subjectID,
			MarketID:  marketID,
			Summary: fmt.Sprintf("%d quick unfilled limit-order cancels (%d contracts) — possible spoofing",
				cancels, totalQty),
			Detail: map[string]any{
				"cancels":      cancels,
				"totalQty":     totalQty,
				"maxDwellSecs": int(d.MaxDwell.Seconds()),
				"lastCancelAt": lastAt,
			},
			DedupeKey: fmt.Sprintf("spoofing:%s:%s:%s", subjectID, marketID, dayOf(lastAt)),
		})
	}
	return alerts, rows.Err()
}

// CollusionDetector flags matched-reversal trading between two accounts: A
// sells to B and B sells to A in the same market inside the window — the shape
// of coordinated wash between colluding accounts (distinct from single-account
// self-trade, which the wash detector already covers). Keyed on the unordered
// account pair + market.
type CollusionDetector struct {
	// MinReversals is how many A↔B reversal fills in the window trip an alert.
	MinReversals int
}

func (d CollusionDetector) withDefaults() CollusionDetector {
	if d.MinReversals <= 0 {
		d.MinReversals = 2
	}
	return d
}

func (CollusionDetector) Name() string { return "collusion" }

func (d CollusionDetector) Scan(ctx context.Context, db *sql.DB, since time.Time) ([]Alert, error) {
	d = d.withDefaults()
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()

	// Self-join on trades: pair a trade (buyer=a, seller=b) with a reverse
	// trade (buyer=b, seller=a) in the same market and window. least/greatest
	// collapse (a,b) and (b,a) to one unordered pair so the ring is one alert.
	// Exclude self-trades (a=b — that is the wash detector's job).
	rows, err := db.QueryContext(ctx, `
SELECT market_id, low_id, high_id, COUNT(*) AS reversals,
       CAST(MAX(t_at) AS TEXT) AS last_at
FROM (
  SELECT t1.market_id AS market_id,
         LEAST(t1.buyer_id, t1.seller_id) AS low_id,
         GREATEST(t1.buyer_id, t1.seller_id) AS high_id,
         GREATEST(t1.traded_at, t2.traded_at) AS t_at
  FROM prediction_trades t1
  JOIN prediction_trades t2
    ON t1.market_id = t2.market_id
   AND t1.buyer_id = t2.seller_id
   AND t1.seller_id = t2.buyer_id
   AND t1.id < t2.id
  WHERE t1.seller_id IS NOT NULL AND t2.seller_id IS NOT NULL
    AND t1.buyer_id <> t1.seller_id
    AND t1.is_amm_trade = false AND t2.is_amm_trade = false
    AND t1.traded_at >= $1 AND t2.traded_at >= $1
) pairs
GROUP BY market_id, low_id, high_id
HAVING COUNT(*) >= $2`, since, d.MinReversals)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	alerts := []Alert{}
	for rows.Next() {
		var marketID, lowID, highID, lastAt string
		var reversals int64
		if err := rows.Scan(&marketID, &lowID, &highID, &reversals, &lastAt); err != nil {
			return nil, err
		}
		sev := "medium"
		if reversals >= int64(d.MinReversals)*3 {
			sev = "high"
		}
		alerts = append(alerts, Alert{
			Kind:      "collusion",
			Severity:  sev,
			SubjectID: lowID, // primary subject; counterparty in detail
			MarketID:  marketID,
			Summary: fmt.Sprintf("%d matched-reversal trades between %s and %s — possible collusion",
				reversals, lowID, highID),
			Detail: map[string]any{
				"counterparty": highID,
				"reversals":    reversals,
				"lastAt":       lastAt,
			},
			DedupeKey: fmt.Sprintf("collusion:%s:%s:%s:%s", marketID, lowID, highID, dayOf(lastAt)),
		})
	}
	return alerts, rows.Err()
}

// Engine runs a set of detectors and persists their alerts.
type Engine struct {
	store     *Store
	db        *sql.DB
	detectors []Detector
}

func NewEngine(store *Store, db *sql.DB, detectors ...Detector) *Engine {
	if len(detectors) == 0 {
		detectors = []Detector{
			WashSelfTradeDetector{},
			SpoofingDetector{},
			CollusionDetector{},
		}
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
