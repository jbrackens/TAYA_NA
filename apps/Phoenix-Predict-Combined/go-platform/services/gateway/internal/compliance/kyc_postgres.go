package compliance

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"
)

const kycDBTimeout = 5 * time.Second

// PostgresKYCService is a DB-backed KYCService. Unlike the in-memory mock (which
// auto-approved any document and lost all state on restart), status and
// documents persist in PostgreSQL and identity decisions flow through a
// pluggable IDVProvider. The default ManualReviewProvider queues submissions for
// back-office approval (AdminDecision); a vendor adapter drops in via config.
type PostgresKYCService struct {
	db  *sql.DB
	idv IDVProvider
}

// NewPostgresKYCService creates a DB-backed KYC service and ensures its schema.
// A nil provider defaults to manual review (never auto-approves).
func NewPostgresKYCService(db *sql.DB, idv IDVProvider) (*PostgresKYCService, error) {
	if idv == nil {
		idv = ManualReviewProvider{}
	}
	s := &PostgresKYCService{db: db, idv: idv}
	if err := s.ensureSchema(); err != nil {
		return nil, fmt.Errorf("kyc schema init: %w", err)
	}
	return s, nil
}

// ProviderName reports the active IDV provider for logs/audit.
func (s *PostgresKYCService) ProviderName() string { return s.idv.Name() }

func (s *PostgresKYCService) ensureSchema() error {
	ctx, cancel := context.WithTimeout(context.Background(), kycDBTimeout)
	defer cancel()

	statements := []string{
		`CREATE TABLE IF NOT EXISTS kyc_status (
  user_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (status IN ('unverified','pending','approved','declined','blocked')),
  risk_level TEXT NOT NULL DEFAULT 'unknown',
  provider TEXT,
  last_verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
		`CREATE TABLE IF NOT EXISTS kyc_documents (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  document_id TEXT,
  issuing_country TEXT,
  expiry_date TEXT,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted','verifying','approved','rejected')),
  reject_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ
)`,
		`CREATE INDEX IF NOT EXISTS idx_kyc_documents_user ON kyc_documents (user_id, submitted_at DESC)`,
	}
	for _, stmt := range statements {
		if _, err := s.db.ExecContext(ctx, stmt); err != nil {
			return err
		}
	}
	return nil
}

// VerifyIdentity persists the submitted documents, then asks the IDV provider
// for a decision. The default manual-review provider returns "pending" (a
// back-office reviewer finalizes via AdminDecision). A vendor that errors
// (unconfigured) degrades to "pending" — it is NEVER treated as an approval, so
// a misconfigured automated provider fails closed instead of onboarding anyone.
func (s *PostgresKYCService) VerifyIdentity(ctx context.Context, userID string, docs []VerificationDocument) (*KYCResult, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	if len(docs) == 0 {
		return nil, ErrInvalidDocument
	}

	for _, d := range docs {
		if _, err := s.SubmitDocument(ctx, userID, d); err != nil {
			return nil, err
		}
	}

	decision, derr := s.idv.Review(ctx, userID, docs)
	if derr != nil {
		// Unconfigured/failed vendor: never auto-approve. Leave the user
		// "pending" for manual review so a provider outage degrades safely.
		decision = IDVDecision{Status: "pending", RiskLevel: "unknown", Reason: "manual review (provider unavailable)"}
	}
	if err := s.upsertStatus(ctx, userID, decision); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	res := &KYCResult{
		UserID:           userID,
		Status:           decision.Status,
		VerificationType: "document",
		RiskLevel:        decision.RiskLevel,
		Message:          decision.Reason,
		DocumentType:     docs[0].Type,
	}
	if decision.Status == "approved" {
		res.VerifiedAt = now.Format(time.RFC3339)
		res.ExpiresAt = now.AddDate(2, 0, 0).Format(time.RFC3339)
	}
	return res, nil
}

// AdminDecision applies a back-office reviewer's KYC decision — the action that
// makes ManualReviewProvider a complete, operable flow. approve=true marks the
// user approved (2-year validity); false marks declined with a reason. Returns
// the resulting status. Intended to be called behind requireAdminRole.
func (s *PostgresKYCService) AdminDecision(ctx context.Context, userID string, approve bool, reason string) (*KYCStatus, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	decision := IDVDecision{Status: "approved", RiskLevel: "low"}
	docStatus := "approved"
	if !approve {
		decision = IDVDecision{Status: "declined", RiskLevel: "high", Reason: strings.TrimSpace(reason)}
		docStatus = "rejected"
	}
	if err := s.upsertStatus(ctx, userID, decision); err != nil {
		return nil, err
	}
	cctx, cancel := context.WithTimeout(ctx, kycDBTimeout)
	defer cancel()
	if _, err := s.db.ExecContext(cctx, `
UPDATE kyc_documents SET status = $2, verified_at = NOW(), reject_reason = $3
WHERE user_id = $1 AND status IN ('submitted','verifying')`,
		userID, docStatus, nullStr(reason)); err != nil {
		return nil, err
	}
	return s.GetVerificationStatus(ctx, userID)
}

func (s *PostgresKYCService) upsertStatus(ctx context.Context, userID string, d IDVDecision) error {
	ctx, cancel := context.WithTimeout(ctx, kycDBTimeout)
	defer cancel()

	var verifiedAt, expiresAt interface{}
	if d.Status == "approved" {
		now := time.Now().UTC()
		verifiedAt = now
		expiresAt = now.AddDate(2, 0, 0)
	}
	_, err := s.db.ExecContext(ctx, `
INSERT INTO kyc_status (user_id, status, risk_level, provider, last_verified_at, expires_at, rejection_reason, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
ON CONFLICT (user_id) DO UPDATE SET
  status = EXCLUDED.status,
  risk_level = EXCLUDED.risk_level,
  provider = EXCLUDED.provider,
  last_verified_at = COALESCE(EXCLUDED.last_verified_at, kyc_status.last_verified_at),
  expires_at = COALESCE(EXCLUDED.expires_at, kyc_status.expires_at),
  rejection_reason = EXCLUDED.rejection_reason,
  updated_at = NOW()`,
		userID, d.Status, d.RiskLevel, s.idv.Name(), verifiedAt, expiresAt, nullStr(d.Reason))
	return err
}

// GetVerificationStatus returns the persisted KYC status, defaulting to
// "unverified" when the user has no row yet.
func (s *PostgresKYCService) GetVerificationStatus(ctx context.Context, userID string) (*KYCStatus, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	ctx, cancel := context.WithTimeout(ctx, kycDBTimeout)
	defer cancel()

	st := &KYCStatus{UserID: userID, DocumentsSubmitted: []string{}}
	var lastVerified, expiresAt, reason sql.NullString
	err := s.db.QueryRowContext(ctx, `
SELECT status, risk_level, CAST(last_verified_at AS TEXT), CAST(expires_at AS TEXT), rejection_reason
FROM kyc_status WHERE user_id = $1`, userID).Scan(&st.Status, &st.RiskLevel, &lastVerified, &expiresAt, &reason)
	if errors.Is(err, sql.ErrNoRows) {
		st.Status = "unverified"
		st.RiskLevel = "unknown"
		return st, nil
	}
	if err != nil {
		return nil, err
	}
	if lastVerified.Valid {
		st.LastVerifiedAt = lastVerified.String
	}
	if expiresAt.Valid {
		st.ExpiresAt = expiresAt.String
	}
	if reason.Valid && reason.String != "" {
		st.RejectionReasons = []string{reason.String}
	}

	rows, derr := s.db.QueryContext(ctx, `SELECT doc_type FROM kyc_documents WHERE user_id = $1 ORDER BY submitted_at`, userID)
	if derr == nil {
		defer rows.Close()
		for rows.Next() {
			var t string
			if rows.Scan(&t) == nil {
				st.DocumentsSubmitted = append(st.DocumentsSubmitted, t)
			}
		}
	}
	return st, nil
}

// SubmitDocument persists a single submitted document.
func (s *PostgresKYCService) SubmitDocument(ctx context.Context, userID string, doc VerificationDocument) (*VerificationDocument, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	if doc.Type == "" {
		return nil, ErrInvalidDocument
	}
	ctx, cancel := context.WithTimeout(ctx, kycDBTimeout)
	defer cancel()

	now := time.Now().UTC()
	var id int64
	if err := s.db.QueryRowContext(ctx, `
INSERT INTO kyc_documents (user_id, doc_type, document_id, issuing_country, expiry_date, status, submitted_at)
VALUES ($1, $2, $3, $4, $5, 'submitted', $6) RETURNING id`,
		userID, doc.Type, nullStr(doc.DocumentID), nullStr(doc.IssuingCountry), nullStr(doc.ExpiryDate), now).Scan(&id); err != nil {
		return nil, err
	}
	doc.ID = fmt.Sprintf("doc:%d", id)
	doc.UserID = userID
	doc.Status = "submitted"
	doc.SubmittedAt = now.Format(time.RFC3339)
	return &doc, nil
}

// ListDocuments returns all documents a user has submitted.
func (s *PostgresKYCService) ListDocuments(ctx context.Context, userID string) ([]VerificationDocument, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	ctx, cancel := context.WithTimeout(ctx, kycDBTimeout)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, `
SELECT id, doc_type, COALESCE(document_id,''), COALESCE(issuing_country,''), COALESCE(expiry_date,''),
       status, COALESCE(reject_reason,''), CAST(submitted_at AS TEXT), CAST(verified_at AS TEXT)
FROM kyc_documents WHERE user_id = $1 ORDER BY submitted_at`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	docs := []VerificationDocument{}
	for rows.Next() {
		var id int64
		var d VerificationDocument
		var verifiedAt sql.NullString
		if err := rows.Scan(&id, &d.Type, &d.DocumentID, &d.IssuingCountry, &d.ExpiryDate,
			&d.Status, &d.RejectReason, &d.SubmittedAt, &verifiedAt); err != nil {
			return nil, err
		}
		d.ID = fmt.Sprintf("doc:%d", id)
		d.UserID = userID
		if verifiedAt.Valid {
			d.VerifiedAt = verifiedAt.String
		}
		docs = append(docs, d)
	}
	return docs, rows.Err()
}

// nullStr maps an empty string to SQL NULL so optional columns stay NULL rather
// than storing empty strings.
func nullStr(s string) interface{} {
	if strings.TrimSpace(s) == "" {
		return nil
	}
	return s
}
