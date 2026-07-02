package segmentation

// Opt-in live test: set SEG_LIVE_DSN to a scratch database to exercise the tag
// CRUD + assignment round-trip against real Postgres.

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestSegmentationStoreLive(t *testing.T) {
	dsn := os.Getenv("SEG_LIVE_DSN")
	if dsn == "" {
		t.Skip("SEG_LIVE_DSN not set; skipping live segmentation test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()

	store, err := NewStore(db)
	if err != nil {
		t.Fatalf("store init: %v", err)
	}
	ctx := context.Background()
	name := fmt.Sprintf("seg-%d", time.Now().UnixNano())

	tag, err := store.CreateTag(ctx, name, "test segment")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	// Duplicate name → ErrDuplicate.
	if _, err := store.CreateTag(ctx, name, ""); err != ErrDuplicate {
		t.Fatalf("expected ErrDuplicate, got %v", err)
	}

	// Assign is idempotent.
	if err := store.AssignTag(ctx, tag.ID, "user-001", "admin"); err != nil {
		t.Fatalf("assign: %v", err)
	}
	if err := store.AssignTag(ctx, tag.ID, "user-001", "admin"); err != nil {
		t.Fatalf("re-assign should be idempotent: %v", err)
	}
	// Assigning to an unknown tag → ErrNotFound (FK).
	if err := store.AssignTag(ctx, 999999999, "user-001", "admin"); err != ErrNotFound {
		t.Fatalf("expected ErrNotFound for bad tag, got %v", err)
	}

	users, err := store.UsersForTag(ctx, tag.ID, 100, 0)
	if err != nil || len(users) != 1 || users[0] != "user-001" {
		t.Fatalf("UsersForTag mismatch: %v err=%v", users, err)
	}
	tags, err := store.TagsForUser(ctx, "user-001")
	if err != nil {
		t.Fatalf("TagsForUser: %v", err)
	}
	found := false
	for _, tg := range tags {
		if tg.ID == tag.ID {
			found = true
		}
	}
	if !found {
		t.Fatalf("assigned tag not returned by TagsForUser")
	}

	// Member count reflects the assignment.
	list, err := store.ListTags(ctx)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	for _, tg := range list {
		if tg.ID == tag.ID && tg.MemberCount != 1 {
			t.Fatalf("expected memberCount 1, got %d", tg.MemberCount)
		}
	}

	// Unassign, then delete cascades cleanly.
	if err := store.UnassignTag(ctx, tag.ID, "user-001"); err != nil {
		t.Fatalf("unassign: %v", err)
	}
	if err := store.UnassignTag(ctx, tag.ID, "user-001"); err != ErrNotFound {
		t.Fatalf("second unassign should be ErrNotFound, got %v", err)
	}
	if err := store.DeleteTag(ctx, tag.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if err := store.DeleteTag(ctx, tag.ID); err != ErrNotFound {
		t.Fatalf("second delete should be ErrNotFound, got %v", err)
	}
}
