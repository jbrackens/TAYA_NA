package compliance

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"
)

// P0-4 slice 2 (PAM spec §12 KYC, AML, Risk, and Compliance): structured
// identity capture. Sanctions/PEP screening needs a name/DOB/country as
// structured data — before this, person identity existed only inside document
// binaries. The subject submits identity alongside KYC documents; screening
// runs at intake and its verdict is persisted here as compliance evidence.
// Slice 3 refuses KYC approval while the verdict is anything but clear (or a
// reviewer's explicit clearance).

// KYCIdentity is the structured identity for one user plus the latest
// screening verdict.
type KYCIdentity struct {
	UserID            string    `json:"userId"`
	FullName          string    `json:"fullName"`
	DateOfBirth       string    `json:"dateOfBirth,omitempty"` // YYYY-MM-DD
	Country           string    `json:"country,omitempty"`     // ISO 3166-1 alpha-2
	ScreeningStatus   string    `json:"screeningStatus"`       // PersonScreeningStatus or "unscreened"
	ScreeningScore    float64   `json:"screeningScore"`
	ScreeningMatchIDs []string  `json:"screeningMatchIds,omitempty"`
	ScreeningProvider string    `json:"screeningProvider,omitempty"`
	ScreenedAt        time.Time `json:"screenedAt,omitempty"`
	UpdatedAt         time.Time `json:"updatedAt,omitempty"`
}

// Reviewer-resolved screening states (P0-4 slice 3). A reviewer either clears
// a verdict as a false positive or confirms the hit; both are audited at the
// route layer and terminal until the identity is re-submitted (which
// re-screens).
const (
	ScreeningClearedByReview = "cleared_by_review"
	ScreeningHitConfirmed    = "hit_confirmed"
)

// ScreeningPermitsApproval reports whether a screening status allows KYC
// approval. Default-deny: only an automated clear or an explicit reviewer
// clearance passes — unscreened, potential_match, hit, unavailable,
// hit_confirmed, and any unknown future status all block.
func ScreeningPermitsApproval(status string) bool {
	return status == string(PersonScreeningClear) || status == ScreeningClearedByReview
}

// ReviewScreening applies a reviewer's resolution of a screening verdict.
// outcome is "cleared" (false positive — approval becomes possible) or
// "confirmed" (real hit — approval stays blocked; the reviewer then declines
// KYC). It refuses when no identity exists (nothing to review) and returns
// the previous status for the caller's audit entry.
func (s *PostgresKYCService) ReviewScreening(ctx context.Context, userID, outcome string) (previousStatus string, err error) {
	var next string
	switch outcome {
	case "cleared":
		next = ScreeningClearedByReview
	case "confirmed":
		next = ScreeningHitConfirmed
	default:
		return "", errors.New("kyc screening review: outcome must be cleared or confirmed")
	}
	// Self-join in FROM captures the pre-update value for the audit trail
	// (RETURNING on the target row would see the new value).
	err = s.db.QueryRowContext(ctx, `
UPDATE kyc_identity SET screening_status = $2, updated_at = NOW()
FROM (SELECT user_id, screening_status AS prev FROM kyc_identity WHERE user_id = $1 FOR UPDATE) old
WHERE kyc_identity.user_id = old.user_id
RETURNING old.prev`,
		userID, next).Scan(&previousStatus)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrIdentityRequired
	}
	return previousStatus, err
}

// isASCIIAlpha reports whether s is entirely A-Z/a-z (country-code check).
func isASCIIAlpha(s string) bool {
	for _, c := range s {
		if (c < 'A' || c > 'Z') && (c < 'a' || c > 'z') {
			return false
		}
	}
	return len(s) > 0
}

// KYCIdentityStore is the optional capability a KYC service implements to
// hold structured identities. The fail-closed KYC service deliberately does
// NOT implement it — with the store unavailable, identity intake refuses
// rather than accepting data it cannot persist.
type KYCIdentityStore interface {
	UpsertIdentity(ctx context.Context, identity KYCIdentity) error
	GetIdentity(ctx context.Context, userID string) (*KYCIdentity, error) // (nil, nil) when absent
}

// UpsertIdentity stores/refreshes the subject's identity and screening
// verdict. Re-submission overwrites and re-screens by design: a corrected
// name must produce a fresh verdict, never inherit the old one.
func (s *PostgresKYCService) UpsertIdentity(ctx context.Context, identity KYCIdentity) error {
	if identity.UserID == "" || identity.FullName == "" {
		return errors.New("kyc identity: userID and fullName are required")
	}
	matchIDs, err := json.Marshal(identity.ScreeningMatchIDs)
	if err != nil {
		return err
	}
	var screenedAt any
	if !identity.ScreenedAt.IsZero() {
		screenedAt = identity.ScreenedAt
	}
	_, err = s.db.ExecContext(ctx, `
INSERT INTO kyc_identity
  (user_id, full_name, date_of_birth, country,
   screening_status, screening_score, screening_match_ids, screening_provider, screened_at, updated_at)
VALUES ($1, $2, NULLIF($3,''), NULLIF($4,''), $5, $6, $7, NULLIF($8,''), $9, NOW())
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  date_of_birth = EXCLUDED.date_of_birth,
  country = EXCLUDED.country,
  screening_status = EXCLUDED.screening_status,
  screening_score = EXCLUDED.screening_score,
  screening_match_ids = EXCLUDED.screening_match_ids,
  screening_provider = EXCLUDED.screening_provider,
  screened_at = EXCLUDED.screened_at,
  updated_at = NOW()`,
		identity.UserID, identity.FullName, identity.DateOfBirth, identity.Country,
		identity.ScreeningStatus, identity.ScreeningScore, matchIDs, identity.ScreeningProvider, screenedAt)
	return err
}

// GetIdentity returns the stored identity, or (nil, nil) when none exists.
func (s *PostgresKYCService) GetIdentity(ctx context.Context, userID string) (*KYCIdentity, error) {
	var (
		out        KYCIdentity
		dob        sql.NullString
		country    sql.NullString
		provider   sql.NullString
		screenedAt sql.NullTime
		matchIDs   []byte
	)
	err := s.db.QueryRowContext(ctx, `
SELECT user_id, full_name, COALESCE(date_of_birth,''), COALESCE(country,''),
       screening_status, screening_score, screening_match_ids,
       COALESCE(screening_provider,''), screened_at, updated_at
FROM kyc_identity WHERE user_id = $1`, userID).Scan(
		&out.UserID, &out.FullName, &dob, &country,
		&out.ScreeningStatus, &out.ScreeningScore, &matchIDs,
		&provider, &screenedAt, &out.UpdatedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	out.DateOfBirth = dob.String
	out.Country = country.String
	out.ScreeningProvider = provider.String
	if screenedAt.Valid {
		out.ScreenedAt = screenedAt.Time
	}
	if len(matchIDs) > 0 {
		_ = json.Unmarshal(matchIDs, &out.ScreeningMatchIDs)
	}
	return &out, nil
}
