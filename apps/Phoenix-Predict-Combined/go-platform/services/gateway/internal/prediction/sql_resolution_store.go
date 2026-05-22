package prediction

import (
	"context"
	"database/sql"
	"fmt"
	"time"
)

// SQLResolutionStore is the Postgres-backed ResolutionStore for the
// propose -> finalize seam (migration 023). Kept separate from SQLRepository so
// the large Repository interface (and its cache decorator + fakes) is untouched.
type SQLResolutionStore struct {
	db *sql.DB
}

func NewSQLResolutionStore(db *sql.DB) *SQLResolutionStore {
	return &SQLResolutionStore{db: db}
}

// WithMarketLock serializes the finalize / dispute-filing critical sections for
// a market across goroutines AND gateway replicas via a transaction-scoped
// advisory lock (auto-released on commit/rollback — same primitive the exchange
// matcher uses). fn's own queries run on pooled connections; the lock provides
// mutual exclusion against other WithMarketLock holders for the same market,
// which is exactly the finalize-vs-finalize and dispute-vs-finalize
// serialization needed to make the windowed-resolution money path race-free.
func (s *SQLResolutionStore) WithMarketLock(ctx context.Context, marketID string, fn func() error) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin lock tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx, "SELECT pg_advisory_xact_lock(hashtext($1))", marketID); err != nil {
		return fmt.Errorf("acquire market lock: %w", err)
	}
	if err := fn(); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *SQLResolutionStore) CreateProposal(ctx context.Context, p *ResolutionProposal) error {
	const q = `
INSERT INTO prediction_resolution_proposals
  (market_id, result, status, attestation_source, attestation_id,
   attestation_digest, attestation_data, proposed_by, challenge_ends_at, proposed_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
RETURNING id`
	return s.db.QueryRowContext(ctx, q,
		p.MarketID, p.Result, p.Status, p.AttestationSource, p.AttestationID,
		p.AttestationDigest, string(p.AttestationData), p.ProposedBy, p.ChallengeEndsAt, p.ProposedAt,
	).Scan(&p.ID)
}

func (s *SQLResolutionStore) GetActiveProposal(ctx context.Context, marketID string) (*ResolutionProposal, error) {
	const q = `
SELECT id, market_id, result, status, attestation_source, attestation_id,
       attestation_digest, attestation_data, proposed_by, challenge_ends_at,
       proposed_at, finalized_at
FROM prediction_resolution_proposals
WHERE market_id = $1 AND status = 'proposed'
ORDER BY proposed_at DESC
LIMIT 1`
	var (
		p           ResolutionProposal
		attID       sql.NullString
		attDigest   sql.NullString
		attData     []byte
		proposedBy  sql.NullString
		finalizedAt sql.NullTime
	)
	err := s.db.QueryRowContext(ctx, q, marketID).Scan(
		&p.ID, &p.MarketID, &p.Result, &p.Status, &p.AttestationSource, &attID,
		&attDigest, &attData, &proposedBy, &p.ChallengeEndsAt, &p.ProposedAt, &finalizedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if attID.Valid {
		p.AttestationID = &attID.String
	}
	if attDigest.Valid {
		p.AttestationDigest = &attDigest.String
	}
	if len(attData) > 0 {
		p.AttestationData = attData
	}
	if proposedBy.Valid {
		p.ProposedBy = &proposedBy.String
	}
	if finalizedAt.Valid {
		t := finalizedAt.Time
		p.FinalizedAt = &t
	}
	return &p, nil
}

func (s *SQLResolutionStore) ListFinalizableProposals(ctx context.Context, asOf time.Time) ([]ResolutionProposal, error) {
	// proposed_by IS NULL restricts the automated finalize path to
	// system-proposed resolutions; manually-proposed ones need a second admin
	// to finalize (ADR-0003 dual-control), via the office finalize endpoint.
	const q = `
SELECT id, market_id, result, status, attestation_source, attestation_id,
       attestation_digest, attestation_data, proposed_by, challenge_ends_at,
       proposed_at, finalized_at
FROM prediction_resolution_proposals
WHERE status = 'proposed' AND proposed_by IS NULL AND challenge_ends_at <= $1
ORDER BY challenge_ends_at ASC`
	rows, err := s.db.QueryContext(ctx, q, asOf)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []ResolutionProposal{}
	for rows.Next() {
		var (
			p           ResolutionProposal
			attID       sql.NullString
			attDigest   sql.NullString
			attData     []byte
			proposedBy  sql.NullString
			finalizedAt sql.NullTime
		)
		if err := rows.Scan(
			&p.ID, &p.MarketID, &p.Result, &p.Status, &p.AttestationSource, &attID,
			&attDigest, &attData, &proposedBy, &p.ChallengeEndsAt, &p.ProposedAt, &finalizedAt,
		); err != nil {
			return nil, err
		}
		if attID.Valid {
			p.AttestationID = &attID.String
		}
		if attDigest.Valid {
			p.AttestationDigest = &attDigest.String
		}
		if len(attData) > 0 {
			p.AttestationData = attData
		}
		if proposedBy.Valid {
			p.ProposedBy = &proposedBy.String
		}
		if finalizedAt.Valid {
			t := finalizedAt.Time
			p.FinalizedAt = &t
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *SQLResolutionStore) MarkProposalFinalized(ctx context.Context, marketID string) (bool, error) {
	const q = `
UPDATE prediction_resolution_proposals
SET status = 'finalized', finalized_at = $2
WHERE market_id = $1 AND status = 'proposed'`
	res, err := s.db.ExecContext(ctx, q, marketID, time.Now().UTC())
	if err != nil {
		return false, err
	}
	// rows == 1 means THIS call flipped proposed -> finalized; rows == 0 means a
	// concurrent finalizer already claimed it. That row-count IS the claim.
	n, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return n == 1, nil
}

func (s *SQLResolutionStore) ReopenProposal(ctx context.Context, marketID string) error {
	const q = `
UPDATE prediction_resolution_proposals
SET status = 'proposed', finalized_at = NULL
WHERE market_id = $1 AND status = 'finalized'`
	_, err := s.db.ExecContext(ctx, q, marketID)
	return err
}

func (s *SQLResolutionStore) MarkProposalVoided(ctx context.Context, marketID string) error {
	const q = `
UPDATE prediction_resolution_proposals
SET status = 'voided'
WHERE market_id = $1 AND status = 'proposed'`
	_, err := s.db.ExecContext(ctx, q, marketID)
	return err
}

func (s *SQLResolutionStore) CountOpenDisputes(ctx context.Context, marketID string) (int, error) {
	const q = `SELECT COUNT(*) FROM prediction_disputes WHERE market_id = $1 AND status = 'open'`
	var n int
	err := s.db.QueryRowContext(ctx, q, marketID).Scan(&n)
	return n, err
}

func (s *SQLResolutionStore) CreateDispute(ctx context.Context, d *Dispute) error {
	const q = `
INSERT INTO prediction_disputes (market_id, user_id, reason, status, bond_cents, created_at)
VALUES ($1,$2,$3,$4,$5,$6)
RETURNING id`
	if d.Status == "" {
		d.Status = "open"
	}
	if d.CreatedAt.IsZero() {
		d.CreatedAt = time.Now().UTC()
	}
	return s.db.QueryRowContext(ctx, q,
		d.MarketID, d.UserID, d.Reason, d.Status, d.BondCents, d.CreatedAt,
	).Scan(&d.ID)
}

const disputeSelectCols = `id, market_id, user_id, reason, status, resolution_note,
       bond_cents, created_at, resolved_at, resolved_by`

// scanDisputeRow scans one prediction_disputes row, mapping the nullable
// columns onto the optional pointer fields.
func scanDisputeRow(sc interface{ Scan(...any) error }) (Dispute, error) {
	var (
		d          Dispute
		note       sql.NullString
		resolvedAt sql.NullTime
		resolvedBy sql.NullString
	)
	if err := sc.Scan(
		&d.ID, &d.MarketID, &d.UserID, &d.Reason, &d.Status, &note, &d.BondCents,
		&d.CreatedAt, &resolvedAt, &resolvedBy,
	); err != nil {
		return Dispute{}, err
	}
	if note.Valid {
		d.ResolutionNote = &note.String
	}
	if resolvedAt.Valid {
		t := resolvedAt.Time
		d.ResolvedAt = &t
	}
	if resolvedBy.Valid {
		d.ResolvedBy = &resolvedBy.String
	}
	return d, nil
}

func (s *SQLResolutionStore) ListDisputes(ctx context.Context, marketID string) ([]Dispute, error) {
	q := `SELECT ` + disputeSelectCols + `
FROM prediction_disputes
WHERE market_id = $1
ORDER BY created_at DESC`
	rows, err := s.db.QueryContext(ctx, q, marketID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Dispute{}
	for rows.Next() {
		d, err := scanDisputeRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *SQLResolutionStore) ListOpenDisputes(ctx context.Context) ([]Dispute, error) {
	q := `SELECT ` + disputeSelectCols + `
FROM prediction_disputes
WHERE status = 'open'
ORDER BY created_at ASC`
	rows, err := s.db.QueryContext(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Dispute{}
	for rows.Next() {
		d, err := scanDisputeRow(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *SQLResolutionStore) GetDispute(ctx context.Context, id string) (*Dispute, error) {
	q := `SELECT ` + disputeSelectCols + ` FROM prediction_disputes WHERE id = $1`
	d, err := scanDisputeRow(s.db.QueryRowContext(ctx, q, id))
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &d, nil
}

func (s *SQLResolutionStore) ResolveDispute(ctx context.Context, id, status, note string, resolvedBy *string) error {
	const q = `
UPDATE prediction_disputes
SET status = $2, resolution_note = $3, resolved_by = $4, resolved_at = $5
WHERE id = $1 AND status = 'open'`
	var notePtr *string
	if note != "" {
		notePtr = &note
	}
	_, err := s.db.ExecContext(ctx, q, id, status, notePtr, resolvedBy, time.Now().UTC())
	return err
}
