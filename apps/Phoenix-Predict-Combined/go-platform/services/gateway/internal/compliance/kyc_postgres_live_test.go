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

// approveAlwaysIDV is a stub vendor that auto-approves — the exact shape of a
// real IDV vendor dropped into the KYC_IDV_PROVIDER seam.
type approveAlwaysIDV struct{}

func (approveAlwaysIDV) Name() string { return "approve-always-stub" }
func (approveAlwaysIDV) Review(context.Context, string, []VerificationDocument) (IDVDecision, error) {
	return IDVDecision{Status: "approved", RiskLevel: "low"}, nil
}

// P0-4 verification #6 fix: the automated VerifyIdentity/IDV-vendor path must
// NOT approve past an unresolved/hit screening — the gate lives at the shared
// upsertStatus chokepoint, not only in AdminDecision.
func TestPostgresKYCVerifyIdentityCannotBypassScreeningLive(t *testing.T) {
	dsn := os.Getenv("KYC_LIVE_DSN")
	if dsn == "" {
		t.Skip("KYC_LIVE_DSN not set; skipping live Postgres KYC test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	svc, err := NewPostgresKYCService(db, approveAlwaysIDV{})
	if err != nil {
		t.Fatalf("init: %v", err)
	}
	ctx := context.Background()
	userID := fmt.Sprintf("u-vbypass-%d", time.Now().UnixNano())

	// No identity yet: an approving vendor still cannot approve.
	if _, err := svc.VerifyIdentity(ctx, userID, []VerificationDocument{{Type: "passport"}}); err != ErrIdentityRequired {
		t.Fatalf("VerifyIdentity without identity: want ErrIdentityRequired, got %v", err)
	}
	st, _ := svc.GetVerificationStatus(ctx, userID)
	if st.Status == "approved" {
		t.Fatal("status must not be approved without a screened identity")
	}

	// Screened as a hit: the approving vendor still cannot approve.
	if err := svc.UpsertIdentity(ctx, KYCIdentity{
		UserID: userID, FullName: "Sanctioned Person",
		ScreeningStatus: string(PersonScreeningHit), ScreeningProvider: "yente", ScreenedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("upsert: %v", err)
	}
	if _, err := svc.VerifyIdentity(ctx, userID, []VerificationDocument{{Type: "passport"}}); err != ErrScreeningUnresolved {
		t.Fatalf("VerifyIdentity with a hit: want ErrScreeningUnresolved, got %v", err)
	}
	st, _ = svc.GetVerificationStatus(ctx, userID)
	if st.Status == "approved" {
		t.Fatal("a sanctioned subject must not be auto-approved via the vendor path")
	}

	// Cleared: the vendor path may now approve.
	if _, err := svc.ReviewScreening(ctx, userID, "cleared"); err != nil {
		t.Fatalf("review: %v", err)
	}
	if _, err := svc.VerifyIdentity(ctx, userID, []VerificationDocument{{Type: "passport"}}); err != nil {
		t.Fatalf("VerifyIdentity after clearance: %v", err)
	}
	st, _ = svc.GetVerificationStatus(ctx, userID)
	if st.Status != "approved" {
		t.Fatalf("cleared subject should approve via vendor path, got %q", st.Status)
	}
}

// P0-4 slice 3: the approval gate + reviewer resolution against real Postgres.
func TestPostgresKYCApprovalScreeningGateLive(t *testing.T) {
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
		t.Fatalf("init: %v", err)
	}
	ctx := context.Background()
	userID := fmt.Sprintf("u-gate-%d", time.Now().UnixNano())

	// 1. No identity → approval refused, decline permitted.
	if _, err := svc.AdminDecision(ctx, userID, true, "looks fine"); err != ErrIdentityRequired {
		t.Fatalf("approve without identity: want ErrIdentityRequired, got %v", err)
	}
	if _, err := svc.AdminDecision(ctx, userID, false, "no identity"); err != nil {
		t.Fatalf("decline must never be gated: %v", err)
	}

	// 2. Unresolved verdict → approval refused.
	if err := svc.UpsertIdentity(ctx, KYCIdentity{
		UserID: userID, FullName: "Jane Doe",
		ScreeningStatus: string(PersonScreeningPotentialMatch), ScreeningProvider: "manual",
	}); err != nil {
		t.Fatalf("upsert: %v", err)
	}
	if _, err := svc.AdminDecision(ctx, userID, true, ""); err != ErrScreeningUnresolved {
		t.Fatalf("approve with potential_match: want ErrScreeningUnresolved, got %v", err)
	}

	// 3. Reviewer clears → previous captured, approval now permitted.
	prev, err := svc.ReviewScreening(ctx, userID, "cleared")
	if err != nil || prev != string(PersonScreeningPotentialMatch) {
		t.Fatalf("review cleared: prev=%q err=%v", prev, err)
	}
	status, err := svc.AdminDecision(ctx, userID, true, "")
	if err != nil || status.Status != "approved" {
		t.Fatalf("approve after clearance: %+v %v", status, err)
	}

	// 4. Reviewer confirms a hit → approval blocked again.
	if _, err := svc.ReviewScreening(ctx, userID, "confirmed"); err != nil {
		t.Fatalf("review confirmed: %v", err)
	}
	if _, err := svc.AdminDecision(ctx, userID, true, ""); err != ErrScreeningUnresolved {
		t.Fatalf("approve with hit_confirmed: want ErrScreeningUnresolved, got %v", err)
	}

	// 5. Review without identity → ErrIdentityRequired.
	if _, err := svc.ReviewScreening(ctx, "u-ghost", "cleared"); err != ErrIdentityRequired {
		t.Fatalf("review without identity: want ErrIdentityRequired, got %v", err)
	}
}

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

// TestPostgresKYCRequestMoreDocumentsLive proves GAP-18 against real Postgres:
// ensureSchema's ALTER widens the status CHECK so 'documents_required' is
// accepted (a wrong constraint name would leave the old 5-value CHECK and this
// would violate it), RequestMoreDocuments sets that non-terminal state, a reason
// is mandatory, and a subsequent identity re-submission still works.
func TestPostgresKYCRequestMoreDocumentsLive(t *testing.T) {
	dsn := os.Getenv("KYC_LIVE_DSN")
	if dsn == "" {
		t.Skip("KYC_LIVE_DSN not set; skipping live Postgres KYC test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	svc, err := NewPostgresKYCService(db, approveAlwaysIDV{})
	if err != nil {
		t.Fatalf("init: %v", err)
	}
	ctx := context.Background()
	userID := fmt.Sprintf("u-moredocs-%d", time.Now().UnixNano())

	// Request more documents — this INSERT into kyc_status with status
	// 'documents_required' fails the CHECK unless ensureSchema widened it.
	st, err := svc.RequestMoreDocuments(ctx, userID, "passport photo is blurry; please re-upload")
	if err != nil {
		t.Fatalf("request more documents (the widened CHECK must accept documents_required): %v", err)
	}
	if st.Status != "documents_required" {
		t.Fatalf("status = %q, want documents_required", st.Status)
	}
	// A non-terminal state must NOT pass verification.
	got, _ := svc.GetVerificationStatus(ctx, userID)
	if got.Status != "documents_required" {
		t.Fatalf("persisted status = %q, want documents_required", got.Status)
	}

	// Reason is mandatory.
	if _, err := svc.RequestMoreDocuments(ctx, userID, "   "); err == nil {
		t.Fatal("empty reason must be rejected")
	}

	// The user can re-submit an identity after being asked for more documents.
	if err := svc.UpsertIdentity(ctx, KYCIdentity{
		UserID: userID, FullName: "Clear Passport", ScreeningStatus: "clear", ScreenedAt: time.Now().UTC(),
	}); err != nil {
		t.Fatalf("re-submit identity after documents_required: %v", err)
	}
}
