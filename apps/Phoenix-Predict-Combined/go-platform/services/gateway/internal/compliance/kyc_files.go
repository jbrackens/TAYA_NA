package compliance

// KYC document binary storage (P0-3). Until now kyc_documents held metadata
// only — a reviewer could see that a passport was "submitted" but there was no
// passport. Files live in their own table so listing documents stays light,
// keyed 1:1 to the metadata row and removed with it.

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// MaxDocumentFileBytes caps a single stored document image/PDF.
const MaxDocumentFileBytes = 8 << 20 // 8 MiB

// AllowedDocumentContentTypes is the exhaustive set a document file may carry.
var AllowedDocumentContentTypes = map[string]bool{
	"image/jpeg":      true,
	"image/png":       true,
	"image/webp":      true,
	"application/pdf": true,
}

var (
	ErrDocumentFileNotFound = errors.New("document file not found")
	ErrDocumentNotFound     = errors.New("document not found")
	ErrInvalidDocumentFile  = errors.New("invalid document file")
)

// DocumentFile is the stored binary for one kyc_documents row.
type DocumentFile struct {
	DocumentID  string `json:"documentId"`
	UserID      string `json:"userId"`
	Content     []byte `json:"-"`
	ContentType string `json:"contentType"`
	SHA256      string `json:"sha256"`
	SizeBytes   int64  `json:"sizeBytes"`
}

// DocumentFileStore is the optional capability of a KYC store to hold the
// actual document binaries. The fail-closed service deliberately does NOT
// implement it: with no real store, uploads are refused, not pretended.
type DocumentFileStore interface {
	AttachDocumentFile(ctx context.Context, userID, documentID string, content []byte, contentType string) (*DocumentFile, error)
	GetDocumentFile(ctx context.Context, documentID string) (*DocumentFile, error)
}

// PendingReview is one row in the back-office KYC queue.
type PendingReview struct {
	UserID        string `json:"userId"`
	Status        string `json:"status"`
	RiskLevel     string `json:"riskLevel"`
	DocumentCount int    `json:"documentCount"`
	SubmittedAt   string `json:"submittedAt"`
}

// parseDocumentRowID accepts both the API form "doc:123" and a bare "123".
func parseDocumentRowID(documentID string) (int64, error) {
	raw := strings.TrimPrefix(strings.TrimSpace(documentID), "doc:")
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		return 0, ErrDocumentNotFound
	}
	return id, nil
}

func validateDocumentFile(content []byte, contentType string) error {
	if len(content) == 0 {
		return fmt.Errorf("%w: empty content", ErrInvalidDocumentFile)
	}
	if len(content) > MaxDocumentFileBytes {
		return fmt.Errorf("%w: exceeds %d bytes", ErrInvalidDocumentFile, MaxDocumentFileBytes)
	}
	if !AllowedDocumentContentTypes[strings.ToLower(strings.TrimSpace(contentType))] {
		return fmt.Errorf("%w: content type %q not allowed", ErrInvalidDocumentFile, contentType)
	}
	return nil
}

// AttachDocumentFile stores the binary for an existing document row. The
// document must belong to userID — attaching to someone else's document is a
// not-found, not a hint that the id exists.
func (s *PostgresKYCService) AttachDocumentFile(ctx context.Context, userID, documentID string, content []byte, contentType string) (*DocumentFile, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	if err := validateDocumentFile(content, contentType); err != nil {
		return nil, err
	}
	rowID, err := parseDocumentRowID(documentID)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(ctx, kycDBTimeout)
	defer cancel()

	var owner string
	if err := s.db.QueryRowContext(ctx,
		`SELECT user_id FROM kyc_documents WHERE id = $1`, rowID).Scan(&owner); err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrDocumentNotFound
		}
		return nil, err
	}
	if owner != userID {
		return nil, ErrDocumentNotFound
	}

	sum := sha256.Sum256(content)
	digest := hex.EncodeToString(sum[:])
	contentType = strings.ToLower(strings.TrimSpace(contentType))
	if _, err := s.db.ExecContext(ctx, `
INSERT INTO kyc_document_files (document_id, content, content_type, sha256, size_bytes, created_at)
VALUES ($1, $2, $3, $4, $5, $6)
ON CONFLICT (document_id) DO UPDATE
SET content = EXCLUDED.content, content_type = EXCLUDED.content_type,
    sha256 = EXCLUDED.sha256, size_bytes = EXCLUDED.size_bytes, created_at = EXCLUDED.created_at`,
		rowID, content, contentType, digest, int64(len(content)), time.Now().UTC()); err != nil {
		return nil, err
	}
	return &DocumentFile{
		DocumentID:  fmt.Sprintf("doc:%d", rowID),
		UserID:      userID,
		ContentType: contentType,
		SHA256:      digest,
		SizeBytes:   int64(len(content)),
	}, nil
}

// GetDocumentFile returns the stored binary plus its owner, for the
// back-office review screen (the caller is responsible for authorization and
// for auditing the access).
func (s *PostgresKYCService) GetDocumentFile(ctx context.Context, documentID string) (*DocumentFile, error) {
	rowID, err := parseDocumentRowID(documentID)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(ctx, kycDBTimeout)
	defer cancel()

	f := &DocumentFile{DocumentID: fmt.Sprintf("doc:%d", rowID)}
	err = s.db.QueryRowContext(ctx, `
SELECT d.user_id, f.content, f.content_type, f.sha256, f.size_bytes
FROM kyc_document_files f JOIN kyc_documents d ON d.id = f.document_id
WHERE f.document_id = $1`, rowID).Scan(&f.UserID, &f.Content, &f.ContentType, &f.SHA256, &f.SizeBytes)
	if err == sql.ErrNoRows {
		return nil, ErrDocumentFileNotFound
	}
	if err != nil {
		return nil, err
	}
	return f, nil
}

// ListPendingReviews returns the back-office KYC queue: users whose status is
// pending, oldest submission first so nobody waits forever.
func (s *PostgresKYCService) ListPendingReviews(ctx context.Context, limit, offset int) ([]PendingReview, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	ctx, cancel := context.WithTimeout(ctx, kycDBTimeout)
	defer cancel()

	rows, err := s.db.QueryContext(ctx, `
SELECT ks.user_id, ks.status, ks.risk_level,
       COUNT(kd.id) AS doc_count,
       CAST(MIN(kd.submitted_at) AS TEXT) AS first_submitted
FROM kyc_status ks
LEFT JOIN kyc_documents kd ON kd.user_id = ks.user_id
WHERE ks.status = 'pending'
GROUP BY ks.user_id, ks.status, ks.risk_level
ORDER BY MIN(kd.submitted_at) ASC NULLS LAST
LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	reviews := []PendingReview{}
	for rows.Next() {
		var rev PendingReview
		var submitted sql.NullString
		if err := rows.Scan(&rev.UserID, &rev.Status, &rev.RiskLevel, &rev.DocumentCount, &submitted); err != nil {
			return nil, err
		}
		if submitted.Valid {
			rev.SubmittedAt = submitted.String
		}
		reviews = append(reviews, rev)
	}
	return reviews, rows.Err()
}
