package prediction

import (
	"context"
	"database/sql"
	"os"
	"testing"
	"time"
)

// TestSQLCreateArticleSourceDedupesOnTextHash exercises the ON CONFLICT
// (text_hash) upsert in SQLRepository.CreateArticleSource against a real
// Postgres. It is skipped unless GATEWAY_DB_DSN is set (and reachable), so the
// default `go test` run stays hermetic. The postgres driver is registered by
// sql_repository.go's lib/pq import.
//
// Run it with the dev database:
//
//	GATEWAY_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable" \
//	  go test ./internal/prediction/ -run TestSQLCreateArticleSourceDedupesOnTextHash -v
func TestSQLCreateArticleSourceDedupesOnTextHash(t *testing.T) {
	dsn := os.Getenv("GATEWAY_DB_DSN")
	if dsn == "" {
		t.Skip("set GATEWAY_DB_DSN to run the article-source dedupe integration test")
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()
	if err := db.PingContext(context.Background()); err != nil {
		t.Skipf("GATEWAY_DB_DSN set but db not reachable: %v", err)
	}

	repo := NewSQLRepository(db)
	ctx := context.Background()

	// Timestamped hash keeps runs isolated; cleanup keeps the test re-runnable.
	hash := "test-dedupe-" + time.Now().UTC().Format("20060102150405.000000000")
	t.Cleanup(func() {
		if _, err := db.ExecContext(ctx,
			`DELETE FROM prediction_article_sources WHERE text_hash LIKE 'test-dedupe-%'`); err != nil {
			t.Logf("cleanup: %v", err)
		}
	})

	first := "First insert"
	src1 := &ArticleSource{TextHash: hash, Title: &first}
	if err := repo.CreateArticleSource(ctx, src1); err != nil {
		t.Fatalf("first create: %v", err)
	}
	if src1.ID == "" {
		t.Fatalf("expected an id on first create")
	}

	// Same text_hash -> the upsert must return the SAME canonical row id.
	second := "Second insert, same hash"
	src2 := &ArticleSource{TextHash: hash, Title: &second}
	if err := repo.CreateArticleSource(ctx, src2); err != nil {
		t.Fatalf("second create: %v", err)
	}
	if src2.ID != src1.ID {
		t.Fatalf("dedupe failed: same text_hash returned different ids %q then %q", src1.ID, src2.ID)
	}

	// Different text_hash -> a distinct row.
	src3 := &ArticleSource{TextHash: hash + "-other", Title: &first}
	if err := repo.CreateArticleSource(ctx, src3); err != nil {
		t.Fatalf("third create: %v", err)
	}
	if src3.ID == src1.ID {
		t.Fatalf("expected a distinct id for a different text_hash, got %q", src3.ID)
	}
}

// TestSQLLogAIGeneration exercises SQLRepository.LogAIGeneration against a real
// Postgres: it must insert a row (with the nullable jsonb columns handled) and
// return id + created_at. Skipped unless GATEWAY_DB_DSN is set.
func TestSQLLogAIGeneration(t *testing.T) {
	dsn := os.Getenv("GATEWAY_DB_DSN")
	if dsn == "" {
		t.Skip("set GATEWAY_DB_DSN to run the ai-generation-log integration test")
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer db.Close()
	if err := db.PingContext(context.Background()); err != nil {
		t.Skipf("GATEWAY_DB_DSN set but db not reachable: %v", err)
	}

	repo := NewSQLRepository(db)
	ctx := context.Background()

	const marker = "test-ailog"
	t.Cleanup(func() {
		if _, err := db.ExecContext(ctx,
			`DELETE FROM prediction_ai_generation_logs WHERE created_by = $1`, marker); err != nil {
			t.Logf("cleanup logs: %v", err)
		}
		if _, err := db.ExecContext(ctx,
			`DELETE FROM prediction_article_sources WHERE text_hash LIKE 'test-ailog-%'`); err != nil {
			t.Logf("cleanup sources: %v", err)
		}
	})

	hash := "test-ailog-" + time.Now().UTC().Format("20060102150405.000000000")
	src := &ArticleSource{TextHash: hash}
	if err := repo.CreateArticleSource(ctx, src); err != nil {
		t.Fatalf("create article source: %v", err)
	}

	stage := "draft"
	tier := "hard"
	createdBy := marker
	entry := &AIGenerationLog{
		ArticleSourceID: &src.ID,
		Stage:           stage,
		Tier:            &tier,
		CreatedBy:       &createdBy,
		OutputJSON:      []byte(`{"candidates":1}`),
		// InputJSON intentionally nil -> exercises the nullJSONArg NULL path.
	}
	if err := repo.LogAIGeneration(ctx, entry); err != nil {
		t.Fatalf("log ai generation: %v", err)
	}
	if entry.ID == "" {
		t.Fatalf("expected a generation-log id")
	}
	if entry.CreatedAt.IsZero() {
		t.Fatalf("expected created_at to be set")
	}
}
