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

// P0-4 slice 2: identity + screening-verdict roundtrip incl. re-submission
// overwrite (a corrected name must produce a fresh verdict, never inherit).
func TestPostgresKYCIdentityLive(t *testing.T) {
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
	userID := fmt.Sprintf("u-ident-%d", time.Now().UnixNano())

	if err := svc.UpsertIdentity(ctx, KYCIdentity{
		UserID: userID, FullName: "Jane Doe", DateOfBirth: "1980-02-01", Country: "PH",
		ScreeningStatus: string(PersonScreeningPotentialMatch), ScreeningScore: 0.61,
		ScreeningMatchIDs: []string{"Q-1"}, ScreeningProvider: "yente", ScreenedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("upsert: %v", err)
	}
	got, err := svc.GetIdentity(ctx, userID)
	if err != nil || got == nil {
		t.Fatalf("get: %+v %v", got, err)
	}
	if got.FullName != "Jane Doe" || got.ScreeningStatus != string(PersonScreeningPotentialMatch) ||
		got.ScreeningScore != 0.61 || len(got.ScreeningMatchIDs) != 1 || got.ScreenedAt.IsZero() {
		t.Fatalf("roundtrip mismatch: %+v", got)
	}
	// Re-submission overwrites, including down to a clear verdict.
	if err := svc.UpsertIdentity(ctx, KYCIdentity{
		UserID: userID, FullName: "Jane B Doe",
		ScreeningStatus: string(PersonScreeningClear), ScreeningProvider: "yente", ScreenedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("re-upsert: %v", err)
	}
	got, err = svc.GetIdentity(ctx, userID)
	if err != nil || got == nil || got.FullName != "Jane B Doe" ||
		got.ScreeningStatus != string(PersonScreeningClear) || len(got.ScreeningMatchIDs) != 0 {
		t.Fatalf("overwrite mismatch: %+v (err %v)", got, err)
	}
	// Absent user reads as (nil, nil).
	if missing, err := svc.GetIdentity(ctx, "u-never-existed"); err != nil || missing != nil {
		t.Fatalf("absent identity must be (nil,nil), got %+v %v", missing, err)
	}
}

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
