package makerchecker

// Opt-in live test: set MAKERCHECKER_LIVE_DSN to a scratch database. Skipped
// when unset (CI, plain `go test`).

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func liveStore(t *testing.T) (*Store, context.Context) {
	t.Helper()
	dsn := os.Getenv("MAKERCHECKER_LIVE_DSN")
	if dsn == "" {
		t.Skip("MAKERCHECKER_LIVE_DSN not set; skipping live Postgres maker-checker test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	s, err := NewStore(db)
	if err != nil {
		t.Fatalf("init: %v", err)
	}
	return s, context.Background()
}

func newPending(t *testing.T, s *Store, ctx context.Context, maker string) *Action {
	t.Helper()
	a, err := s.CreatePending(ctx, Action{
		SubjectID: "u-1", Direction: "credit", AmountCents: 50_000,
		Reason: "goodwill correction", IdempotencyKey: fmt.Sprintf("mc-%d", time.Now().UnixNano()),
		MakerID: maker,
	})
	if err != nil {
		t.Fatalf("create pending: %v", err)
	}
	return a
}

func TestMakerCheckerFourEyesLive(t *testing.T) {
	s, ctx := liveStore(t)

	// The maker cannot approve their own action.
	a := newPending(t, s, ctx, "admin-A")
	if _, err := s.Approve(ctx, a.ID, "admin-A"); err != ErrSameActor {
		t.Fatalf("self-approve: want ErrSameActor, got %v", err)
	}
	// A different admin can.
	approved, err := s.Approve(ctx, a.ID, "admin-B")
	if err != nil || approved.Status != "approved" || approved.CheckerID != "admin-B" {
		t.Fatalf("approve by B: %+v %v", approved, err)
	}
	// Re-approving an already-decided action is refused.
	if _, err := s.Approve(ctx, a.ID, "admin-C"); err != ErrNotPending {
		t.Fatalf("re-approve: want ErrNotPending, got %v", err)
	}
}

func TestMakerCheckerRejectLive(t *testing.T) {
	s, ctx := liveStore(t)
	a := newPending(t, s, ctx, "admin-A")

	if _, err := s.Reject(ctx, a.ID, "admin-A", "no"); err != ErrSameActor {
		t.Fatalf("self-reject: want ErrSameActor, got %v", err)
	}
	if _, err := s.Reject(ctx, a.ID, "admin-B", ""); err != ErrReasonEmpty {
		t.Fatalf("reject without reason: want ErrReasonEmpty, got %v", err)
	}
	rej, err := s.Reject(ctx, a.ID, "admin-B", "insufficient justification")
	if err != nil || rej.Status != "rejected" || rej.CheckerReason == "" {
		t.Fatalf("reject: %+v %v", rej, err)
	}
	// A rejected action cannot then be approved.
	if _, err := s.Approve(ctx, a.ID, "admin-C"); err != ErrNotPending {
		t.Fatalf("approve after reject: want ErrNotPending, got %v", err)
	}
}

// A concurrent double-approve: exactly one wins the pending->approved
// transition; the other gets ErrNotPending. (Race-tested.)
func TestMakerCheckerConcurrentApproveLive(t *testing.T) {
	s, ctx := liveStore(t)
	a := newPending(t, s, ctx, "admin-A")

	var wg sync.WaitGroup
	var wins int
	var mu sync.Mutex
	for _, checker := range []string{"admin-B", "admin-C"} {
		wg.Add(1)
		go func(c string) {
			defer wg.Done()
			if _, err := s.Approve(ctx, a.ID, c); err == nil {
				mu.Lock()
				wins++
				mu.Unlock()
			}
		}(checker)
	}
	wg.Wait()
	if wins != 1 {
		t.Fatalf("exactly one approval must win, got %d", wins)
	}
}

func TestMakerCheckerListLive(t *testing.T) {
	s, ctx := liveStore(t)
	before, _ := s.ListByStatus(ctx, "pending", 200, 0)
	newPending(t, s, ctx, "admin-A")
	after, _ := s.ListByStatus(ctx, "pending", 200, 0)
	if len(after) != len(before)+1 {
		t.Fatalf("pending list should grow by 1: before=%d after=%d", len(before), len(after))
	}
}
