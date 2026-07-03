// Package risk implements a persistent per-customer risk-profile rating (PAM
// spec §12 KYC, AML, Risk, and Compliance — GAP-12). Each customer gets a tier
// (low → medium → high → prohibited) and a numeric score derived from
// compliance signals: accrued AML open-alert risk points (the same substrate
// internal/aml scores, reused here) and the person-level sanctions/PEP
// screening verdict (internal/compliance). Like AML, the mapping is
// regime-AGNOSTIC: the point→tier thresholds are DATA (Bands), so re-tuning a
// regime is a config edit, not a code change.
//
// The store owns its own table (customer_risk_ratings) and never touches the
// trading, settlement, or wallet core. A rating feeds gating decisions
// (later slice) fail-closed; it is advisory evidence, computed from other
// systems' state, never a money-moving path.
package risk

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"phoenix-revival/gateway/internal/compliance"
)

const dbTimeout = 10 * time.Second

var (
	ErrNotFound     = errors.New("not found")
	ErrInvalidInput = errors.New("invalid input")
)

// Tier is a customer's compliance risk band, ordered low < medium < high <
// prohibited. "prohibited" is reserved for a definitive block (a confirmed
// sanctions/PEP hit); it is terminal save for an audited manual override.
type Tier string

const (
	TierLow        Tier = "low"
	TierMedium     Tier = "medium"
	TierHigh       Tier = "high"
	TierProhibited Tier = "prohibited"
)

var tierRank = map[Tier]int{TierLow: 0, TierMedium: 1, TierHigh: 2, TierProhibited: 3}

// ValidTier reports whether t is one of the four known tiers.
func ValidTier(t Tier) bool { _, ok := tierRank[t]; return ok }

// maxTier returns the more severe of two tiers.
func maxTier(a, b Tier) Tier {
	if tierRank[a] >= tierRank[b] {
		return a
	}
	return b
}

// Factors are the compliance signals a rating is computed from. Stored as JSONB
// alongside the rating so an auditor can see exactly why a tier was assigned.
type Factors struct {
	AMLOpenAlertPoints int    `json:"amlOpenAlertPoints"`
	ScreeningStatus    string `json:"screeningStatus"`
}

// Bands are the rules-as-data thresholds mapping AML risk points to a tier.
// Regime-agnostic: a jurisdiction's appetite lands as numbers here, not code.
type Bands struct {
	MediumMinPoints int `json:"mediumMinPoints"`
	HighMinPoints   int `json:"highMinPoints"`
}

// DefaultBands is the conservative default until compliance counsel supplies a
// regime's thresholds. It mirrors the AML case-open threshold (100) so a
// customer who has opened an AML case rates at least high.
func DefaultBands() Bands { return Bands{MediumMinPoints: 50, HighMinPoints: 100} }

// computeTier derives (tier, score) from factors — pure and deterministic, the
// single source of truth for the rating. Compliance intent: a confirmed
// sanctions/PEP hit is prohibited; an unresolved or unavailable screening
// verdict floors the tier at high (unresolved risk is treated as elevated); AML
// risk points map to a tier via the bands; the final tier is the MOST SEVERE of
// all applicable signals (fail-safe — a control never lowers risk).
func computeTier(f Factors, b Bands) (Tier, int) {
	tier := TierLow
	switch {
	case f.AMLOpenAlertPoints >= b.HighMinPoints:
		tier = TierHigh
	case f.AMLOpenAlertPoints >= b.MediumMinPoints:
		tier = TierMedium
	}
	switch f.ScreeningStatus {
	case string(compliance.PersonScreeningHit), compliance.ScreeningHitConfirmed:
		tier = TierProhibited
	case string(compliance.PersonScreeningPotentialMatch), string(compliance.PersonScreeningUnavailable):
		tier = maxTier(tier, TierHigh)
	}
	return tier, f.AMLOpenAlertPoints
}

// Rating is a customer's stored risk profile. tier/score/factors/computedAt are
// the computed rating; the override* fields carry an optional audited manual
// override (set in a later slice). EffectiveTier is what gating consults.
type Rating struct {
	SubjectID      string     `json:"subjectId"`
	Tier           Tier       `json:"tier"`
	Score          int        `json:"score"`
	Factors        Factors    `json:"factors"`
	ComputedAt     time.Time  `json:"computedAt"`
	OverrideTier   Tier       `json:"overrideTier,omitempty"`
	OverrideBy     string     `json:"overrideBy,omitempty"`
	OverrideReason string     `json:"overrideReason,omitempty"`
	OverriddenAt   *time.Time `json:"overriddenAt,omitempty"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}

// EffectiveTier is the override tier when a manual override is active, else the
// computed tier. Gating consults this, never the raw computed tier.
func (r Rating) EffectiveTier() Tier {
	if ValidTier(r.OverrideTier) {
		return r.OverrideTier
	}
	return r.Tier
}

// Store persists customer risk ratings in its own table (no financial-core
// schema is touched).
type Store struct {
	db *sql.DB
}

// NewStore creates the store and ensures its schema.
func NewStore(db *sql.DB) (*Store, error) {
	s := &Store{db: db}
	if err := s.ensureSchema(); err != nil {
		return nil, fmt.Errorf("risk schema init: %w", err)
	}
	return s, nil
}

func (s *Store) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), dbTimeout)
	defer cancel()
	statements := []string{
		`CREATE TABLE IF NOT EXISTS customer_risk_ratings (
  subject_id TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'low' CHECK (tier IN ('low','medium','high','prohibited')),
  score INT NOT NULL DEFAULT 0,
  factors JSONB NOT NULL DEFAULT '{}',
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  override_tier TEXT CHECK (override_tier IN ('low','medium','high','prohibited')),
  override_by TEXT,
  override_reason TEXT,
  overridden_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
		`CREATE INDEX IF NOT EXISTS idx_customer_risk_ratings_tier ON customer_risk_ratings (tier)`,
	}
	for _, stmt := range statements {
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

// UpsertComputed writes the computed rating for a subject, preserving any
// manual override already in place (the override_* columns are untouched). The
// recompute path — the only writer in this slice.
func (s *Store) UpsertComputed(ctx context.Context, subjectID string, tier Tier, score int, factors Factors) error {
	if subjectID == "" || !ValidTier(tier) {
		return ErrInvalidInput
	}
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	fj, err := json.Marshal(factors)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
INSERT INTO customer_risk_ratings (subject_id, tier, score, factors, computed_at, updated_at)
VALUES ($1,$2,$3,$4,NOW(),NOW())
ON CONFLICT (subject_id) DO UPDATE SET
  tier = EXCLUDED.tier,
  score = EXCLUDED.score,
  factors = EXCLUDED.factors,
  computed_at = NOW(),
  updated_at = NOW()`,
		subjectID, string(tier), score, fj)
	return err
}

// Get returns a subject's rating, or ErrNotFound if none has been computed.
func (s *Store) Get(ctx context.Context, subjectID string) (*Rating, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	return scanRating(s.db.QueryRowContext(ctx, `
SELECT subject_id, tier, score, factors, computed_at,
       COALESCE(override_tier,''), COALESCE(override_by,''), COALESCE(override_reason,''), overridden_at, updated_at
FROM customer_risk_ratings WHERE subject_id = $1`, subjectID))
}

// List returns ratings, optionally filtered to a single tier (by effective
// tier), most-recently-updated first.
func (s *Store) List(ctx context.Context, tier string, limit, offset int) ([]Rating, error) {
	ctx, cancel := context.WithTimeout(ctx, dbTimeout)
	defer cancel()
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := s.db.QueryContext(ctx, `
SELECT subject_id, tier, score, factors, computed_at,
       COALESCE(override_tier,''), COALESCE(override_by,''), COALESCE(override_reason,''), overridden_at, updated_at
FROM customer_risk_ratings
WHERE ($1 = '' OR COALESCE(override_tier, tier) = $1)
ORDER BY updated_at DESC
LIMIT $2 OFFSET $3`, tier, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Rating{}
	for rows.Next() {
		r, err := scanRating(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *r)
	}
	return out, rows.Err()
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanRating(row rowScanner) (*Rating, error) {
	var r Rating
	var tier, overrideTier string
	var fj []byte
	var overriddenAt sql.NullTime
	err := row.Scan(&r.SubjectID, &tier, &r.Score, &fj, &r.ComputedAt,
		&overrideTier, &r.OverrideBy, &r.OverrideReason, &overriddenAt, &r.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	r.Tier = Tier(tier)
	r.OverrideTier = Tier(overrideTier)
	if overriddenAt.Valid {
		r.OverriddenAt = &overriddenAt.Time
	}
	if len(fj) > 0 {
		_ = json.Unmarshal(fj, &r.Factors)
	}
	return &r, nil
}

// FactorSource gathers the compliance signals for a subject. Injected so the
// engine is decoupled from AML/KYC storage and unit-testable with a fake; the
// concrete adapter (AML points + screening verdict) is wired in a later slice.
type FactorSource interface {
	Gather(ctx context.Context, subjectID string) (Factors, error)
}

// Engine recomputes ratings from factors using the configured bands.
type Engine struct {
	store  *Store
	source FactorSource
	bands  Bands
}

// NewEngine wires the engine. Zero-value bands fall back to DefaultBands.
func NewEngine(store *Store, source FactorSource, bands Bands) *Engine {
	if bands.MediumMinPoints == 0 && bands.HighMinPoints == 0 {
		bands = DefaultBands()
	}
	return &Engine{store: store, source: source, bands: bands}
}

// Recompute gathers a subject's factors, computes the tier, and persists it
// (preserving any manual override). Returns the freshly computed rating.
func (e *Engine) Recompute(ctx context.Context, subjectID string) (*Rating, error) {
	if subjectID == "" {
		return nil, ErrInvalidInput
	}
	factors, err := e.source.Gather(ctx, subjectID)
	if err != nil {
		return nil, fmt.Errorf("gather factors: %w", err)
	}
	tier, score := computeTier(factors, e.bands)
	if err := e.store.UpsertComputed(ctx, subjectID, tier, score, factors); err != nil {
		return nil, fmt.Errorf("persist rating: %w", err)
	}
	return e.store.Get(ctx, subjectID)
}
