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

func TestSegmentationQueryLive(t *testing.T) {
	dsn := os.Getenv("SEG_LIVE_DSN")
	if dsn == "" {
		t.Skip("SEG_LIVE_DSN not set; skipping live segmentation query test")
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

	// A tag with one known member; query by that tag should return exactly it.
	tag, err := store.CreateTag(ctx, fmt.Sprintf("q-%d", time.Now().UnixNano()), "")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	defer func() { _ = store.DeleteTag(ctx, tag.ID) }()

	var seededUser string
	if err := db.QueryRowContext(ctx, `SELECT id FROM punters LIMIT 1`).Scan(&seededUser); err != nil {
		t.Skipf("no seeded punter: %v", err)
	}
	if err := store.AssignTag(ctx, tag.ID, seededUser, "admin"); err != nil {
		t.Fatalf("assign: %v", err)
	}

	res, err := store.RunQuery(ctx, Query{TagID: tag.ID})
	if err != nil {
		t.Fatalf("query: %v", err)
	}
	if res.Total != 1 || len(res.UserIDs) != 1 || res.UserIDs[0] != seededUser {
		t.Fatalf("tag query mismatch: %+v", res)
	}

	// Adding an impossible status filter yields zero.
	res2, err := store.RunQuery(ctx, Query{TagID: tag.ID, Status: "deactivated"})
	if err != nil {
		t.Fatalf("query2: %v", err)
	}
	if res2.Total != 0 && seededUserStatusIsActive(t, ctx, db, seededUser) {
		t.Fatalf("expected 0 for a status the member doesn't have, got %d", res2.Total)
	}
}

func TestSegmentationCampaignLive(t *testing.T) {
	dsn := os.Getenv("SEG_LIVE_DSN")
	if dsn == "" {
		t.Skip("SEG_LIVE_DSN not set; skipping live campaign test")
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

	tag, err := store.CreateTag(ctx, fmt.Sprintf("camp-%d", time.Now().UnixNano()), "")
	if err != nil {
		t.Fatalf("tag: %v", err)
	}
	defer func() { _ = store.DeleteTag(ctx, tag.ID) }()

	// Invalid action rejected.
	if _, err := store.CreateCampaign(ctx, "bad", tag.ID, "telepathy", "", "admin"); err != ErrCampaignInvalid {
		t.Fatalf("expected ErrCampaignInvalid, got %v", err)
	}
	// Unknown tag → not-found (FK).
	if _, err := store.CreateCampaign(ctx, "orphan", 999999999, "notification", "", "admin"); err != ErrNotFound {
		t.Fatalf("expected ErrNotFound for bad tag, got %v", err)
	}

	c, err := store.CreateCampaign(ctx, "welcome", tag.ID, "notification", "resolution.settled", "admin")
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if c.Status != "draft" {
		t.Fatalf("new campaign should be draft, got %q", c.Status)
	}

	// Preview resolves the (empty) target to zero.
	if n, err := store.PreviewCampaign(ctx, c.ID); err != nil || n != 0 {
		t.Fatalf("preview empty target: n=%d err=%v", n, err)
	}
	// Assign a member, preview reflects it.
	var seededUser string
	if err := db.QueryRowContext(ctx, `SELECT id FROM punters LIMIT 1`).Scan(&seededUser); err == nil {
		if err := store.AssignTag(ctx, tag.ID, seededUser, "admin"); err != nil {
			t.Fatalf("assign: %v", err)
		}
		if n, err := store.PreviewCampaign(ctx, c.ID); err != nil || n != 1 {
			t.Fatalf("preview one member: n=%d err=%v", n, err)
		}
	}

	// Status transition + bad status.
	if _, err := store.UpdateCampaignStatus(ctx, c.ID, "active"); err != nil {
		t.Fatalf("activate: %v", err)
	}
	if _, err := store.UpdateCampaignStatus(ctx, c.ID, "bogus"); err != ErrCampaignInvalid {
		t.Fatalf("expected ErrCampaignInvalid, got %v", err)
	}
	if _, err := store.UpdateCampaignStatus(ctx, 999999999, "active"); err != ErrCampaignMissing {
		t.Fatalf("expected ErrCampaignMissing, got %v", err)
	}
}

func seededUserStatusIsActive(t *testing.T, ctx context.Context, db *sql.DB, id string) bool {
	t.Helper()
	var status string
	if err := db.QueryRowContext(ctx, `SELECT status FROM punters WHERE id = $1`, id).Scan(&status); err != nil {
		return false
	}
	return status != "deactivated"
}
