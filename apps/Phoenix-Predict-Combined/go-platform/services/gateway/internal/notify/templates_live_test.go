package notify

// Opt-in live test: set NOTIFY_LIVE_DSN to a scratch database to exercise the
// template store round-trip and the RenderOrFallback empty-render guard against
// real Postgres.

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestTemplateStoreLive(t *testing.T) {
	dsn := os.Getenv("NOTIFY_LIVE_DSN")
	if dsn == "" {
		t.Skip("NOTIFY_LIVE_DSN not set; skipping live notify template test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()

	store, err := NewTemplateStore(db)
	if err != nil {
		t.Fatalf("store init: %v", err)
	}
	ctx := context.Background()
	key := fmt.Sprintf("test.tmpl.%d", time.Now().UnixNano())

	// Missing template → fallback.
	if s, b := RenderOrFallback(ctx, store, key, nil, "FB S", "FB B"); s != "FB S" || b != "FB B" {
		t.Fatalf("missing template should fall back, got %q/%q", s, b)
	}

	// Normal template renders.
	if _, err := store.Upsert(ctx, Template{Key: key, Subject: "Hi {{name}}", Body: "Body {{name}}"}, "admin"); err != nil {
		t.Fatalf("upsert: %v", err)
	}
	if s, b := RenderOrFallback(ctx, store, key, map[string]string{"name": "Ann"}, "FB S", "FB B"); s != "Hi Ann" || b != "Body Ann" {
		t.Fatalf("render mismatch: %q/%q", s, b)
	}

	// A template whose subject resolves empty must fall back, not ship blank.
	emptyKey := key + ".empty"
	if _, err := store.Upsert(ctx, Template{Key: emptyKey, Subject: "{{result}}", Body: "ok"}, "admin"); err != nil {
		t.Fatalf("upsert empty: %v", err)
	}
	if s, b := RenderOrFallback(ctx, store, emptyKey, map[string]string{"result": ""}, "FB S", "FB B"); s != "FB S" || b != "FB B" {
		t.Fatalf("empty-render should fall back, got %q/%q", s, b)
	}
}
