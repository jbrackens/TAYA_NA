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

	// OnAlert, if set, is invoked once per subject that received a NEW alert in a
	// scan (GAP-82 slice 2). The gateway wires it to the risk-rating recompute so
	// AML risk-point accrual reaches the fail-closed prohibited-tier order gate
	// without waiting for a manual admin recompute. Best-effort: it must not
	// return an error or block the scan meaningfully (the wired hook logs + swallows
	// its own failures). Left nil in tests / when the risk subsystem is absent.
	OnAlert func(ctx context.Context, subjectID string)
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
	// flagged collects subjects that got a NEW alert this scan, so risk is
	// recomputed once per subject (not once per alert).
	flagged := map[string]bool{}
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
				flagged[r.userID] = true
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
	// GAP-82 slice 2: a new AML alert changes the subject's open-risk-point
	// factor, so recompute their risk rating — otherwise accrued AML risk never
	// reaches the prohibited-tier order gate until a manual admin recompute.
	sc.notifyFlagged(ctx, flagged)
	return len(batch), nil
}

// notifyFlagged invokes OnAlert once per subject that received a new alert. Pure
// dispatch (no DB), so the callback fan-out is unit-testable without a live scan.
// Nil-safe: a no-op when OnAlert is unset.
func (sc *Scanner) notifyFlagged(ctx context.Context, flagged map[string]bool) {
	if sc.OnAlert == nil {
		return
	}
	for subjectID := range flagged {
		sc.OnAlert(ctx, subjectID)
	}
}

// maxRescanBatches bounds a single Rescan so an HTTP-triggered rescan cannot run
// unbounded; beyond it the background worker continues from the advanced cursor.
const maxRescanBatches = 100

// Rescan re-evaluates money-flow rows from fromLedgerID onward against the
// CURRENTLY loaded rules (GAP-60). Deposits/withdrawals that were scanned while
// the rule set was empty (or narrower) had the watermark advanced past them and
// were never evaluated; this reopens them. It resets the cursor then drains the
// backlog in bounded batches (if the backlog exceeds the bound, the 60s worker
// continues). Idempotent — alerts dedupe on (rule, subject, ledger ref).
func (sc *Scanner) Rescan(ctx context.Context, fromLedgerID int64) (int, error) {
	if err := sc.store.ResetWatermark(ctx, fromLedgerID); err != nil {
		return 0, fmt.Errorf("reset watermark: %w", err)
	}
	total := 0
	for i := 0; i < maxRescanBatches; i++ {
		n, err := sc.ScanOnce(ctx)
		if err != nil {
			return total, err
		}
		total += n
		if n < scanBatch {
			break // caught up (last partial batch)
		}
	}
	return total, nil
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

// Real-money rails stamp stable, machine-written idempotency-key prefixes.
// classifyMoneyFlow keys on those, NOT on human reason text: the native crypto
// rail writes reasons "alpha USDC deposit …" (idem key "alpha-cashier:deposit:…")
// and, on withdrawal capture, "reservation captured alpha_withdrawal:…" (idem
// key "capture:alpha_withdrawal:…") — neither reason begins with
// deposit/withdrawal, so the old reason-prefix classifier mislabeled real
// crypto cash-flow as "adjustment" and deposit/withdrawal-scoped rules never
// fired on the actual money rail (verification #7 MAJOR). These prefixes were
// mapped from every wallet_ledger writer in the gateway. A NEW real-money rail
// MUST register its key prefix here (with a test) or its deposits/withdrawals
// fall to the safe "adjustment" residual — still seen by aggregate/velocity
// rules, but not by deposit/withdrawal-scoped rules.
var (
	depositKeyPrefixes    = []string{"alpha-cashier:deposit:", "payment:", "dep:"}
	withdrawalKeyPrefixes = []string{"capture:alpha_withdrawal:", "capture:withdrawal:", "wdr:"}
	// Play-money faucets are written to the real fund pool; exclude them so
	// promotional grants are never monitored as customer money movement.
	faucetKeyPrefixes = []string{"starter_grant:", "daily_claim:", "point_pack:", "mission_reward:", "streak_reward:"}
)

func hasAnyPrefix(s string, prefixes []string) bool {
	for _, p := range prefixes {
		if strings.HasPrefix(s, p) {
			return true
		}
	}
	return false
}

// classifyMoneyFlow decides whether a wallet_ledger row is AML money-flow and
// its kind. Pure function — the single source of truth for the scanner and its
// window predicates (kindLedgerPredicate mirrors it in SQL). The reason arg is
// retained for signature/debugging stability but is intentionally not used for
// classification (see the package doc above).
func classifyMoneyFlow(entryType, fundType, reason, idemKey string) (string, bool) {
	// Guard 1: trading/settlement (prediction fills, payouts, proceeds, voids).
	if strings.HasPrefix(idemKey, "prediction_") {
		return "", false
	}
	// Guard 2: non-real fund (bonus/promo) belongs to the bonus engine, not AML.
	if strings.ToLower(strings.TrimSpace(fundType)) != "real" {
		return "", false
	}
	// Guard 3: reservation-lifecycle markers move no settled balance. They carry
	// entry_type reservation/release (never credit/debit) and keys
	// reservation:… / release:… — INCLUDING reservation:prediction_order: and
	// release:prediction_order:, which evade the prediction_ guard above and used
	// to leak into "adjustment". entry_type is the robust signal; the key-prefix
	// check backs it up.
	et := strings.ToLower(strings.TrimSpace(entryType))
	if et != "credit" && et != "debit" {
		return "", false
	}
	if strings.HasPrefix(idemKey, "reservation:") || strings.HasPrefix(idemKey, "release:") {
		return "", false
	}
	// Guard 4: real-pool play-money faucets.
	if hasAnyPrefix(idemKey, faucetKeyPrefixes) {
		return "", false
	}
	// Kind by stable machine key prefix.
	switch {
	case hasAnyPrefix(idemKey, depositKeyPrefixes):
		return "deposit", true
	case hasAnyPrefix(idemKey, withdrawalKeyPrefixes):
		return "withdrawal", true
	default:
		// Manual admin adjustments (operator-supplied key, no stable prefix) and
		// any unenumerated real credit/debit. SAFE RESIDUAL: still money-flow, so
		// aggregate/velocity rules see it; only deposit/withdrawal-scoped rules
		// need the precise kind.
		return "adjustment", true
	}
}

// likeEscape escapes the LIKE metacharacters (_ % \) in a literal key prefix so
// it matches literally under Postgres' default backslash escape.
func likeEscape(prefix string) string {
	return strings.NewReplacer(`\`, `\\`, `_`, `\_`, `%`, `\%`).Replace(prefix)
}

// orKeyLike renders `(idempotency_key LIKE 'p1%' OR …)` for a set of prefixes.
func orKeyLike(prefixes []string) string {
	parts := make([]string, len(prefixes))
	for i, p := range prefixes {
		parts[i] = `idempotency_key LIKE '` + likeEscape(p) + `%'`
	}
	return `(` + strings.Join(parts, " OR ") + `)`
}

// kindLedgerPredicate returns the SQL WHERE fragment (binding the subject to
// $1) selecting a subject's real-fund money-flow rows of one kind — the exact
// SQL mirror of classifyMoneyFlow, so windows count what the scanner classifies.
func kindLedgerPredicate(kind string) string {
	// Mirror of guards 1-4: real fund, settled credit/debit only, not trading,
	// not a reservation-lifecycle marker, not a faucet.
	base := `user_id = $1 AND fund_type = 'real'` +
		` AND entry_type IN ('credit','debit')` +
		` AND idempotency_key NOT LIKE 'prediction\_%'` +
		` AND idempotency_key NOT LIKE 'reservation:%'` +
		` AND idempotency_key NOT LIKE 'release:%'` +
		` AND NOT ` + orKeyLike(faucetKeyPrefixes)
	switch kind {
	case "deposit":
		return base + ` AND ` + orKeyLike(depositKeyPrefixes)
	case "withdrawal":
		return base + ` AND ` + orKeyLike(withdrawalKeyPrefixes)
	default: // adjustment residual: real credit/debit that is neither deposit nor withdrawal
		return base +
			` AND NOT ` + orKeyLike(depositKeyPrefixes) +
			` AND NOT ` + orKeyLike(withdrawalKeyPrefixes)
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
