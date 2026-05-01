// Package risk produces operational risk dashboards for the prediction
// platform. The v1 dashboard surfaces three blocks operators care about
// most:
//
//   - Concentration: which users hold the largest cost-basis positions,
//     and which markets carry the largest open interest. Useful for
//     spotting deposit-concentration, thin-market manipulation risk,
//     and exposure concentration. Cost basis = qty × avg purchase price,
//     not mark-to-market.
//   - Settlement aging: closed markets that have not yet been settled,
//     bucketed by age. Long-aged closed markets are operational debt —
//     they tie up user funds, attract support tickets, and hide bad
//     resolution sources.
//   - Money invariants: ledger-vs-wallet reconciliation and total open
//     position cost basis. Drift between sum(wallet_balances.balance)
//     and the wallet_ledger replay implies a bug in the wallet path;
//     non-zero drift is a P0 signal.
//
// All numbers are computed from live SQL, no caching. The expected query
// volume is "operator hits the page once a minute"; if scale changes we
// can layer caching later.
package risk

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// Dashboard is the aggregate response payload.
type Dashboard struct {
	GeneratedAt           time.Time              `json:"generatedAt"`
	UserConcentration     []UserConcentration    `json:"userConcentration"`
	MarketConcentration   []MarketConcentration  `json:"marketConcentration"`
	SettlementAging       SettlementAging        `json:"settlementAging"`
	MoneyInvariants       MoneyInvariants        `json:"moneyInvariants"`
}

// UserConcentration is one row of "top users by total cost basis".
// CostBasisCents is sum(quantity * avg_price_cents) across all open
// positions held by the user — the cash they spent acquiring those
// positions, NOT the current mark-to-market exposure (which would use
// current market price instead of avg_price). Cost basis is the
// natural concentration metric for spotting deposit/credit-line
// concentration; surface mark-to-market separately when needed.
type UserConcentration struct {
	UserID         string `json:"userId"`
	CostBasisCents int64  `json:"costBasisCents"`
	PositionsCount int    `json:"positionsCount"`
	MarketsCount   int    `json:"marketsCount"`
}

// MarketConcentration is one row of "top markets by open interest".
type MarketConcentration struct {
	MarketID          string `json:"marketId"`
	Ticker            string `json:"ticker"`
	Title             string `json:"title"`
	Status            string `json:"status"`
	OpenInterestCents int64  `json:"openInterestCents"`
	VolumeCents       int64  `json:"volumeCents"`
}

// SettlementAging buckets closed-but-unsettled markets by time-since-close.
// "Aged" entries (>24h) usually mean the auto-settler is failing or the
// resolution source needs manual intervention.
//
// Computed indicates whether this block ran successfully; UI must NOT
// display zero buckets as "all clear" when Computed is false.
type SettlementAging struct {
	Computed       bool          `json:"computed"`
	Bucket0To1h    int           `json:"bucket0To1h"`
	Bucket1To6h    int           `json:"bucket1To6h"`
	Bucket6To24h   int           `json:"bucket6To24h"`
	BucketOver24h  int           `json:"bucketOver24h"`
	Oldest         []AgingMarket `json:"oldest"`
	TotalUnsettled int           `json:"totalUnsettled"`
}

type AgingMarket struct {
	MarketID    string    `json:"marketId"`
	Ticker      string    `json:"ticker"`
	Title       string    `json:"title"`
	ClosedAt    time.Time `json:"closedAt"`
	AgeMinutes  int       `json:"ageMinutes"`
}

// MoneyInvariants reconciles the wallet balance ledger and surfaces any
// drift. A healthy platform has DriftCents == 0.
//
// Computed indicates whether all four sub-totals were read successfully
// inside the snapshot transaction. When Computed == false, DriftCents
// MUST be ignored — a partial read can show $0 drift on incomplete
// totals, which would falsely imply a healthy ledger.
type MoneyInvariants struct {
	Computed                      bool  `json:"computed"`
	WalletBalanceTotalCents       int64 `json:"walletBalanceTotalCents"`
	LedgerReplayBalanceCents      int64 `json:"ledgerReplayBalanceCents"`
	DriftCents                    int64 `json:"driftCents"`
	OpenPositionsCostBasisCents   int64 `json:"openPositionsCostBasisCents"`
	UnsettledPayoutLiabilityCents int64 `json:"unsettledPayoutLiabilityCents"`
}

// Repository is the database layer the service depends on. Defining it
// as an interface lets tests use a fake without spinning up Postgres.
type Repository interface {
	TopUserConcentration(ctx context.Context, limit int) ([]UserConcentration, error)
	TopMarketConcentration(ctx context.Context, limit int) ([]MarketConcentration, error)
	SettlementAging(ctx context.Context, oldestLimit int) (SettlementAging, error)
	MoneyInvariants(ctx context.Context) (MoneyInvariants, error)
}

// Service produces the dashboard payload.
type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// Dashboard runs all four queries in parallel and assembles the payload.
// If any query errors, the dashboard is returned with that block left at
// zero values and the error is surfaced — callers can choose to render
// partial data or fail the whole request.
func (s *Service) Dashboard(ctx context.Context) (*Dashboard, error) {
	if s == nil || s.repo == nil {
		return nil, errors.New("risk: service or repo is nil")
	}

	// Fan out the four queries in parallel; sequential calls would
	// double the dashboard latency under the typical Postgres round-
	// trip budget. Each goroutine writes to its own channel so the
	// fan-in side doesn't need a discriminator.
	usersCh := make(chan resultUsers, 1)
	marketsCh := make(chan resultMarkets, 1)
	agingCh := make(chan resultAging, 1)
	invarCh := make(chan resultInvar, 1)

	go func() {
		v, err := s.repo.TopUserConcentration(ctx, 10)
		usersCh <- resultUsers{v: v, err: err}
	}()
	go func() {
		v, err := s.repo.TopMarketConcentration(ctx, 10)
		marketsCh <- resultMarkets{v: v, err: err}
	}()
	go func() {
		v, err := s.repo.SettlementAging(ctx, 10)
		agingCh <- resultAging{v: v, err: err}
	}()
	go func() {
		v, err := s.repo.MoneyInvariants(ctx)
		invarCh <- resultInvar{v: v, err: err}
	}()

	d := &Dashboard{GeneratedAt: time.Now().UTC()}
	var firstErr error

	users := <-usersCh
	if users.err != nil {
		firstErr = fmt.Errorf("risk dashboard: user_concentration: %w", users.err)
	} else {
		d.UserConcentration = users.v
	}
	markets := <-marketsCh
	if markets.err != nil && firstErr == nil {
		firstErr = fmt.Errorf("risk dashboard: market_concentration: %w", markets.err)
	} else if markets.err == nil {
		d.MarketConcentration = markets.v
	}
	aging := <-agingCh
	if aging.err != nil && firstErr == nil {
		firstErr = fmt.Errorf("risk dashboard: settlement_aging: %w", aging.err)
	} else if aging.err == nil {
		d.SettlementAging = aging.v
		d.SettlementAging.Computed = true
	}
	invar := <-invarCh
	if invar.err != nil && firstErr == nil {
		firstErr = fmt.Errorf("risk dashboard: money_invariants: %w", invar.err)
	} else if invar.err == nil {
		d.MoneyInvariants = invar.v
	}

	// Drift is only meaningful when the snapshot transaction completed —
	// a partial read would compare totals from different points in time.
	// Leave DriftCents at zero AND Computed at false so the UI suppresses
	// the "healthy ledger" indicator when invariants are incomplete.
	if d.MoneyInvariants.Computed {
		d.MoneyInvariants.DriftCents = d.MoneyInvariants.WalletBalanceTotalCents - d.MoneyInvariants.LedgerReplayBalanceCents
	}

	return d, firstErr
}

type resultUsers struct {
	v   []UserConcentration
	err error
}
type resultMarkets struct {
	v   []MarketConcentration
	err error
}
type resultAging struct {
	v   SettlementAging
	err error
}
type resultInvar struct {
	v   MoneyInvariants
	err error
}

// SQLRepository implements Repository against PostgreSQL.
type SQLRepository struct {
	db *sql.DB
}

func NewSQLRepository(db *sql.DB) *SQLRepository {
	return &SQLRepository{db: db}
}

// TopUserConcentration returns the top N users by total cost basis
// across open positions. cost_basis_cents = sum(quantity *
// avg_price_cents). Excludes positions on already-settled or voided
// markets — those exposures are already paid out or refunded.
func (r *SQLRepository) TopUserConcentration(ctx context.Context, limit int) ([]UserConcentration, error) {
	const q = `
		SELECT
			p.user_id,
			COALESCE(SUM(p.quantity::bigint * p.avg_price_cents::bigint), 0) AS cost_basis_cents,
			COUNT(*) AS positions_count,
			COUNT(DISTINCT p.market_id) AS markets_count
		FROM prediction_positions p
		JOIN prediction_markets m ON m.id = p.market_id
		WHERE p.quantity > 0
		  AND m.status NOT IN ('settled', 'voided')
		GROUP BY p.user_id
		ORDER BY cost_basis_cents DESC
		LIMIT $1
	`
	rows, err := r.db.QueryContext(ctx, q, limit)
	if err != nil {
		return nil, fmt.Errorf("query top user concentration: %w", err)
	}
	defer rows.Close()

	var out []UserConcentration
	for rows.Next() {
		var u UserConcentration
		if err := rows.Scan(&u.UserID, &u.CostBasisCents, &u.PositionsCount, &u.MarketsCount); err != nil {
			return nil, fmt.Errorf("scan user concentration: %w", err)
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

// TopMarketConcentration returns the top N markets by open_interest_cents.
// Voided and settled markets are excluded — they no longer carry exposure.
func (r *SQLRepository) TopMarketConcentration(ctx context.Context, limit int) ([]MarketConcentration, error) {
	const q = `
		SELECT id::text, ticker, title, status, open_interest_cents, volume_cents
		FROM prediction_markets
		WHERE status NOT IN ('settled', 'voided')
		ORDER BY open_interest_cents DESC
		LIMIT $1
	`
	rows, err := r.db.QueryContext(ctx, q, limit)
	if err != nil {
		return nil, fmt.Errorf("query top market concentration: %w", err)
	}
	defer rows.Close()

	var out []MarketConcentration
	for rows.Next() {
		var m MarketConcentration
		if err := rows.Scan(&m.MarketID, &m.Ticker, &m.Title, &m.Status, &m.OpenInterestCents, &m.VolumeCents); err != nil {
			return nil, fmt.Errorf("scan market concentration: %w", err)
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// SettlementAging buckets closed-but-not-settled markets by time-since-close.
// Closed markets older than 24h are operational debt.
func (r *SQLRepository) SettlementAging(ctx context.Context, oldestLimit int) (SettlementAging, error) {
	var out SettlementAging
	const bucketQ = `
		SELECT
			COUNT(*) FILTER (WHERE NOW() - close_at <= INTERVAL '1 hour') AS b0to1h,
			COUNT(*) FILTER (WHERE NOW() - close_at >  INTERVAL '1 hour' AND NOW() - close_at <= INTERVAL '6 hours') AS b1to6h,
			COUNT(*) FILTER (WHERE NOW() - close_at >  INTERVAL '6 hours' AND NOW() - close_at <= INTERVAL '24 hours') AS b6to24h,
			COUNT(*) FILTER (WHERE NOW() - close_at >  INTERVAL '24 hours') AS bover24h,
			COUNT(*) AS total
		FROM prediction_markets
		WHERE status = 'closed' AND settled_at IS NULL
	`
	if err := r.db.QueryRowContext(ctx, bucketQ).Scan(
		&out.Bucket0To1h,
		&out.Bucket1To6h,
		&out.Bucket6To24h,
		&out.BucketOver24h,
		&out.TotalUnsettled,
	); err != nil {
		return out, fmt.Errorf("query settlement aging buckets: %w", err)
	}

	const oldestQ = `
		SELECT id::text, ticker, title, close_at
		FROM prediction_markets
		WHERE status = 'closed' AND settled_at IS NULL
		ORDER BY close_at ASC
		LIMIT $1
	`
	rows, err := r.db.QueryContext(ctx, oldestQ, oldestLimit)
	if err != nil {
		return out, fmt.Errorf("query oldest unsettled markets: %w", err)
	}
	defer rows.Close()

	now := time.Now()
	for rows.Next() {
		var m AgingMarket
		if err := rows.Scan(&m.MarketID, &m.Ticker, &m.Title, &m.ClosedAt); err != nil {
			return out, fmt.Errorf("scan oldest unsettled market: %w", err)
		}
		m.AgeMinutes = int(now.Sub(m.ClosedAt).Minutes())
		out.Oldest = append(out.Oldest, m)
	}
	return out, rows.Err()
}

// MoneyInvariants reconciles wallet_balances.balance_cents against the
// wallet_ledger replay (credits minus debits). All four sub-totals are
// read inside a single READ ONLY REPEATABLE READ transaction so
// concurrent wallet/order writes cannot produce phantom drift between
// sub-queries. Without the snapshot, a deposit that lands between the
// wallet sum and the ledger sum would surface as a false invariant
// violation.
//
// Sign convention: wallet_ledger has a positive-only amount_cents
// (CHECK amount_cents > 0) and an entry_type column with values
// 'credit' or 'debit'. The replay computes balance as
// SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END).
// The schema CHECK constraint is the regression guard for the sign
// convention. If a future migration changes wallet_ledger to use
// signed amounts (or adds a new entry_type), this SUM expression
// must be updated in lockstep.
func (r *SQLRepository) MoneyInvariants(ctx context.Context) (MoneyInvariants, error) {
	var out MoneyInvariants
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelRepeatableRead,
		ReadOnly:  true,
	})
	if err != nil {
		return out, fmt.Errorf("begin money-invariants snapshot tx: %w", err)
	}
	// Always rollback — read-only tx, no commit needed.
	defer func() { _ = tx.Rollback() }()

	const walletSumQ = `SELECT COALESCE(SUM(balance_cents), 0) FROM wallet_balances`
	if err := tx.QueryRowContext(ctx, walletSumQ).Scan(&out.WalletBalanceTotalCents); err != nil {
		return out, fmt.Errorf("sum wallet balances: %w", err)
	}

	const ledgerSumQ = `
		SELECT COALESCE(
			SUM(CASE WHEN entry_type = 'credit' THEN amount_cents
			         WHEN entry_type = 'debit'  THEN -amount_cents
			         ELSE 0 END),
			0
		)
		FROM wallet_ledger
	`
	if err := tx.QueryRowContext(ctx, ledgerSumQ).Scan(&out.LedgerReplayBalanceCents); err != nil {
		return out, fmt.Errorf("sum wallet ledger: %w", err)
	}

	const positionsQ = `
		SELECT COALESCE(SUM(p.quantity::bigint * p.avg_price_cents::bigint), 0)
		FROM prediction_positions p
		JOIN prediction_markets m ON m.id = p.market_id
		WHERE p.quantity > 0
		  AND m.status NOT IN ('settled', 'voided')
	`
	if err := tx.QueryRowContext(ctx, positionsQ).Scan(&out.OpenPositionsCostBasisCents); err != nil {
		return out, fmt.Errorf("sum open positions: %w", err)
	}

	// Unsettled payout liability: for every open position on a closed
	// market awaiting settlement, the worst-case payout is qty * 100c
	// (each contract pays at most 100c). Upper bound, not expectation.
	const liabilityQ = `
		SELECT COALESCE(SUM(p.quantity::bigint * 100), 0)
		FROM prediction_positions p
		JOIN prediction_markets m ON m.id = p.market_id
		WHERE p.quantity > 0
		  AND m.status = 'closed'
		  AND m.settled_at IS NULL
	`
	if err := tx.QueryRowContext(ctx, liabilityQ).Scan(&out.UnsettledPayoutLiabilityCents); err != nil {
		return out, fmt.Errorf("sum unsettled payout liability: %w", err)
	}
	out.Computed = true
	return out, nil
}
