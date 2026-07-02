package compliance

// Opt-in live test for the Postgres KYC store: set KYC_LIVE_DSN to a scratch
// database to exercise ensureSchema + the document-file roundtrip against
// real Postgres. Skipped everywhere the env is unset (CI, plain `go test`).

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestPostgresKYCDocumentFileLive(t *testing.T) {
	dsn := os.Getenv("KYC_LIVE_DSN")
	if dsn == "" {
		t.Skip("KYC_LIVE_DSN not set; skipping live Postgres KYC test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()

	svc, err := NewPostgresKYCService(db, NewIDVProviderFromEnv())
	if err != nil {
		t.Fatalf("init (ensureSchema): %v", err)
	}
	ctx := context.Background()
	userID := fmt.Sprintf("u-live-%d", time.Now().UnixNano())

	doc, err := svc.SubmitDocument(ctx, userID, VerificationDocument{Type: "passport"})
	if err != nil {
		t.Fatalf("submit: %v", err)
	}
	content := []byte("live-check-bytes")
	if _, err := svc.AttachDocumentFile(ctx, userID, doc.ID, content, "image/png"); err != nil {
		t.Fatalf("attach: %v", err)
	}
	file, err := svc.GetDocumentFile(ctx, doc.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if !bytes.Equal(file.Content, content) || file.UserID != userID {
		t.Fatalf("roundtrip mismatch: %+v", file)
	}
	if _, err := svc.AttachDocumentFile(ctx, "u-intruder", doc.ID, content, "image/png"); err == nil {
		t.Fatal("ownership violation not caught")
	}
	if _, err := svc.ListPendingReviews(ctx, 10, 0); err != nil {
		t.Fatalf("queue: %v", err)
	}
}
