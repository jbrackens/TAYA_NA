package aml

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"strings"
	"time"
)

// defaultCaseThresholdPoints is the accrued open-risk-point level at which the
// scanner auto-opens a case for a subject (spec §32 Scenario 5). It is a
// starting default — a regime's real threshold lands as configuration later,
// the same way rule thresholds are data. Kept as a constant (not env) to avoid
// unrequested configurability; overridable via NewScanner for tests.
const defaultCaseThresholdPoints = 100

const scanBatch = 500

// Scanner incrementally reads the wallet ledger (READ-ONLY) and drives the
// rule engine. It never writes to wallet_ledger and never imports the wallet
// package — it shares the same *sql.DB the way the surveillance detectors do.
type Scanner struct {
	store        *Store
	ledger       *sql.DB
	interval     time.Duration
	caseThreshld int
}

// NewScanner builds the AML ingestion scanner. threshold<=0 uses the default.
func NewScanner(store *Store, ledger *sql.DB, interval time.Duration, caseThresholdPoints int) *Scanner {
	if caseThresholdPoints <= 0 {
		caseThresholdPoints = defaultCaseThresholdPoints
	}
	return &Scanner{store: store, ledger: ledger, interval: interval, caseThreshld: caseThresholdPoints}
}

// Run ticks ScanOnce until the context is cancelled (mirrors the prediction
// workers). Blocks.
func (sc *Scanner) Run(ctx context.Context) {
	slog.Info("aml scanner started", "interval", sc.interval, "caseThresholdPoints", sc.caseThreshld)
	ticker := time.NewTicker(sc.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			slog.Info("aml scanner stopped")
			return
		case <-ticker.C:
			if n, err := sc.ScanOnce(ctx); err != nil {
				slog.Warn("aml scanner: scan failed", "error", err)
			} else if n > 0 {
				slog.Info("aml scanner: processed ledger rows", "count", n)
			}
		}
	}
}

// ledgerRow is one wallet_ledger entry, read-only.
type ledgerRow struct {
	id          int64
	userID      string
	entryType   string
	fundType    string
	amountCents int64
	reason      string
	idemKey     string
	txTime      time.Time
}

// ScanOnce processes the next batch of ledger rows past the watermark. It is
// idempotent: alerts dedupe on (rule, subject, ledger reference), and the
// watermark only advances, so re-running never double-reports. Returns the
// number of ledger rows examined.
func (sc *Scanner) ScanOnce(ctx context.Context) (int, error) {
	watermark, err := sc.store.Watermark(ctx)
	if err != nil {
		return 0, fmt.Errorf("read watermark: %w", err)
	}
	rules, err := sc.store.EnabledRules(ctx)
	if err != nil {
		return 0, fmt.Errorf("load rules: %w", err)
	}

	rows, err := sc.ledger.QueryContext(ctx, `
SELECT id, user_id, entry_type, fund_type, amount_cents, COALESCE(reason,''), idempotency_key, transaction_time
FROM wallet_ledger
WHERE id > $1
ORDER BY id ASC
LIMIT $2`, watermark, scanBatch)
	if err != nil {
		return 0, fmt.Errorf("read ledger: %w", err)
	}
	defer rows.Close()

	var batch []ledgerRow
	var maxID int64
	for rows.Next() {
		var r ledgerRow
		if err := rows.Scan(&r.id, &r.userID, &r.entryType, &r.fundType, &r.amountCents,
			&r.reason, &r.idemKey, &r.txTime); err != nil {
			return 0, err
		}
		batch = append(batch, r)
		if r.id > maxID {
			maxID = r.id
		}
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}

	// Only rules present → evaluate; but always advance the watermark so an
	// empty rule set still consumes the backlog rather than re-reading it.
	for _, r := range batch {
		kind, isMoneyFlow := classifyMoneyFlow(r.entryType, r.fundType, r.reason, r.idemKey)
		if !isMoneyFlow || len(rules) == 0 {
			continue
		}
		ev := MoneyEvent{
			SubjectID:   r.userID,
			Kind:        kind,
			AmountCents: r.amountCents,
			OccurredAt:  r.txTime,
			Reference:   fmt.Sprintf("led-%d", r.id),
		}
		win := sc.subjectWindow(ctx, r.userID, kind, r.txTime)
		for _, a := range Evaluate(rules, ev, win) {
			inserted, _, err := sc.store.InsertAlert(ctx, a)
			if err != nil {
				return 0, fmt.Errorf("insert alert: %w", err)
			}
			if inserted {
				if err := sc.maybeOpenCase(ctx, r.userID); err != nil {
					return 0, fmt.Errorf("auto-open case: %w", err)
				}
			}
		}
	}

	if maxID > 0 {
		if err := sc.store.SetWatermark(ctx, maxID); err != nil {
			return 0, fmt.Errorf("advance watermark: %w", err)
		}
	}
	return len(batch), nil
}

// maybeOpenCase opens a case for a subject once accrued open risk points reach
// the threshold, linking that subject's currently-open alerts (§32 Scenario 5).
func (sc *Scanner) maybeOpenCase(ctx context.Context, subjectID string) error {
	pts, err := sc.store.OpenAlertRiskPoints(ctx, subjectID)
	if err != nil {
		return err
	}
	if pts < sc.caseThreshld {
		return nil
	}
	open, err := sc.store.ListAlerts(ctx, "open", 200, 0)
	if err != nil {
		return err
	}
	ids := []int64{}
	for _, a := range open {
		if a.SubjectID == subjectID {
			ids = append(ids, a.ID)
		}
	}
	if len(ids) == 0 {
		return nil
	}
	title := fmt.Sprintf("AML risk threshold reached (%d points)", pts)
	_, err = sc.store.OpenCase(ctx, title, casePriorityForPoints(pts), subjectID, "aml-scanner", ids)
	if err == ErrInvalidInput {
		// A concurrent scan already linked these alerts — not an error.
		return nil
	}
	return err
}

// subjectWindow builds the count/sum closures the velocity/aggregate rules
// need, querying the subject's money-flow rows of the SAME kind within a
// lookback ending at the event time. Trading (prediction_*) and non-real fund
// rows are excluded in SQL, mirroring classifyMoneyFlow.
func (sc *Scanner) subjectWindow(ctx context.Context, subjectID, kind string, at time.Time) SubjectWindow {
	// pred uses $1 (subject); the window bounds are always $2 (start) and $3
	// (end). No fmt.Sprintf — the LIKE patterns contain '%', which would
	// collide with format verbs.
	pred := kindLedgerPredicate(kind)
	return SubjectWindow{
		CountWithin: func(w time.Duration) int {
			var n int
			q := `SELECT COUNT(*) FROM wallet_ledger WHERE ` + pred +
				` AND transaction_time > $2 AND transaction_time <= $3`
			if err := sc.ledger.QueryRowContext(ctx, q, subjectID, at.Add(-w), at).Scan(&n); err != nil {
				slog.Warn("aml scanner: window count query failed", "kind", kind, "error", err)
			}
			return n
		},
		SumWithinCents: func(w time.Duration) int64 {
			var sum sql.NullInt64
			q := `SELECT SUM(amount_cents) FROM wallet_ledger WHERE ` + pred +
				` AND transaction_time > $2 AND transaction_time <= $3`
			if err := sc.ledger.QueryRowContext(ctx, q, subjectID, at.Add(-w), at).Scan(&sum); err != nil {
				slog.Warn("aml scanner: window sum query failed", "kind", kind, "error", err)
			}
			return sum.Int64
		},
	}
}

// classifyMoneyFlow decides whether a ledger row is AML money-flow and its
// kind. Pure function — the single source of truth for the scanner and its
// window predicates.
//
//   - Trading/settlement (idempotency_key prefixed prediction_) and non-real
//     fund (bonus/promo) are NOT money-flow: they belong to surveillance /
//     the bonus engine, not money-path AML. Excluding them keeps the domains
//     separate (pass-B: surveillance must not be stretched into AML).
//   - Real-fund movements classify by reason prefix: deposit / withdrawal,
//     else "adjustment" (manual balance adjustments and any other real-fund
//     movement).
func classifyMoneyFlow(entryType, fundType, reason, idemKey string) (string, bool) {
	if strings.HasPrefix(idemKey, "prediction_") {
		return "", false
	}
	if strings.ToLower(strings.TrimSpace(fundType)) != "real" {
		return "", false
	}
	r := strings.ToLower(strings.TrimSpace(reason))
	switch {
	case strings.HasPrefix(r, "deposit"):
		return "deposit", true
	case strings.HasPrefix(r, "withdrawal"):
		return "withdrawal", true
	default:
		return "adjustment", true
	}
}

// kindLedgerPredicate returns the SQL WHERE fragment (binding the subject to
// $1) selecting a subject's real-fund money-flow rows of one kind — the SQL
// mirror of classifyMoneyFlow, so windows count exactly what the scanner would
// classify.
func kindLedgerPredicate(kind string) string {
	base := `user_id = $1 AND fund_type = 'real' AND idempotency_key NOT LIKE 'prediction\_%'`
	switch kind {
	case "deposit":
		return base + ` AND lower(reason) LIKE 'deposit%'`
	case "withdrawal":
		return base + ` AND lower(reason) LIKE 'withdrawal%'`
	default: // adjustment = real-fund, non-prediction, not deposit/withdrawal
		return base + ` AND lower(coalesce(reason,'')) NOT LIKE 'deposit%' AND lower(coalesce(reason,'')) NOT LIKE 'withdrawal%'`
	}
}

func casePriorityForPoints(points int) string {
	switch {
	case points >= 200:
		return "high"
	case points >= 100:
		return "medium"
	default:
		return "low"
	}
}
