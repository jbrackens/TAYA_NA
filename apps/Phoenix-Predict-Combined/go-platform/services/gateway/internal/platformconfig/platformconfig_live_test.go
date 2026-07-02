package platformconfig

// Opt-in live test: set CONFIG_LIVE_DSN to a scratch database to exercise the
// store round-trip and the fallback semantics against real Postgres.

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestPlatformConfigLive(t *testing.T) {
	dsn := os.Getenv("CONFIG_LIVE_DSN")
	if dsn == "" {
		t.Skip("CONFIG_LIVE_DSN not set; skipping live platform-config test")
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
	key := fmt.Sprintf("test.flag.%d", time.Now().UnixNano())

	// Absent key falls back.
	if got := store.GetString(ctx, key, "fallback"); got != "fallback" {
		t.Fatalf("absent key should fall back, got %q", got)
	}
	if got := store.GetBool(ctx, key, true); got != true {
		t.Fatalf("absent bool should fall back to true, got %v", got)
	}

	// Upsert then read.
	if _, err := store.Upsert(ctx, Flag{Key: key, Value: "true", Description: "test"}, "admin-live"); err != nil {
		t.Fatalf("upsert: %v", err)
	}
	if got := store.GetBool(ctx, key, false); got != true {
		t.Fatalf("stored 'true' should read true, got %v", got)
	}
	if got := store.GetString(ctx, key, "x"); got != "true" {
		t.Fatalf("stored value mismatch, got %q", got)
	}

	// Overwrite.
	if _, err := store.Upsert(ctx, Flag{Key: key, Value: "off"}, "admin-live"); err != nil {
		t.Fatalf("re-upsert: %v", err)
	}
	if got := store.GetBool(ctx, key, true); got != false {
		t.Fatalf("stored 'off' should read false, got %v", got)
	}

	// Nil store is safe.
	var nilStore *Store
	if got := nilStore.GetString(ctx, key, "fb"); got != "fb" {
		t.Fatalf("nil store should return fallback, got %q", got)
	}
	if got := nilStore.GetBool(ctx, key, true); got != true {
		t.Fatalf("nil store bool should return fallback, got %v", got)
	}
}
