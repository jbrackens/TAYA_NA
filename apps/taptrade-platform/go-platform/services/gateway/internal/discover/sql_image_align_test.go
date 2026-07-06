package discover

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

// TestSQLAlignPromotedMarketImages exercises the thumbnail-hygiene SQL against
// a real Postgres: a promoted IMP-* market's image_path follows its imported
// catalog row — corrected when the row's image changed, dropped after the
// shared-cover sweep cleared it. Skipped unless GATEWAY_DB_DSN is set (and
// reachable).
//
// Run it with the dev database:
//
//	GATEWAY_DB_DSN="postgres://predict:localdev@localhost:5434/predict?sslmode=disable" \
//	  go test ./internal/discover/ -run TestSQLAlignPromotedMarketImages -v
func TestSQLAlignPromotedMarketImages(t *testing.T) {
	dsn := os.Getenv("GATEWAY_DB_DSN")
	if dsn == "" {
		t.Skip("set GATEWAY_DB_DSN to run the image-align integration test")
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	ctx := context.Background()

	repo := NewRepository(db)

	// The align join matches on the first 8 chars of external_hash, so give
	// the fake hash a unique-but-stable hex-looking prefix per run.
	prefix := strings.ToLower(fmt.Sprintf("%08x", uint32(time.Now().UnixNano())))
	externalHash := prefix + "imagealigntest"
	ticker := "IMP-" + strings.ToUpper(prefix)

	// Cleanup order matters: t.Cleanup runs after the test body (and its
	// defers), so the row deletes AND the close both live here, deletes first.
	t.Cleanup(func() {
		for _, stmt := range []string{
			`DELETE FROM imported_market_price_snapshots WHERE external_hash = '` + externalHash + `'`,
			`DELETE FROM prediction_markets WHERE ticker = '` + ticker + `'`,
			`DELETE FROM prediction_events WHERE title = 'image align test event ` + prefix + `'`,
			`DELETE FROM imported_markets WHERE external_hash = '` + externalHash + `'`,
		} {
			if _, err := db.ExecContext(ctx, stmt); err != nil {
				t.Logf("cleanup: %v", err)
			}
		}
		db.Close()
	})
	if err := db.PingContext(ctx); err != nil {
		t.Skipf("GATEWAY_DB_DSN set but db not reachable: %v", err)
	}

	ur, err := repo.Reserve(ctx, externalHash)
	if err != nil {
		t.Fatalf("reserve: %v", err)
	}
	rightImage := "/images/markets/" + ur.ID + ".jpg"
	if err := repo.Update(ctx, ur.ID, Row{
		ID:           ur.ID,
		ExternalHash: externalHash,
		Title:        "image align test market " + prefix,
		ImagePath:    &rightImage,
	}); err != nil {
		t.Fatalf("update imported row: %v", err)
	}

	var eventID string
	if err := db.QueryRowContext(ctx,
		`INSERT INTO prediction_events (title, status, open_at, close_at)
		 VALUES ($1, 'open', NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days')
		 RETURNING id`, "image align test event "+prefix,
	).Scan(&eventID); err != nil {
		t.Fatalf("seed event: %v", err)
	}
	if _, err := db.ExecContext(ctx,
		`INSERT INTO prediction_markets
		 (event_id, ticker, title, status, settlement_source_key, settlement_rule,
		  close_at, image_path)
		 VALUES ($1, $2, $3, 'open', 'manual', 'manual-attestation',
		         NOW() + INTERVAL '3 days', $4)`,
		eventID, ticker, "image align test market "+prefix,
		"/images/markets/wrong-game-cover.jpg",
	); err != nil {
		t.Fatalf("seed promoted market: %v", err)
	}

	readImage := func() sql.NullString {
		t.Helper()
		var got sql.NullString
		if err := db.QueryRowContext(ctx,
			`SELECT image_path FROM prediction_markets WHERE ticker = $1`, ticker,
		).Scan(&got); err != nil {
			t.Fatalf("read promoted image: %v", err)
		}
		return got
	}

	// Pass 1: mismatched thumbnail is corrected to the imported row's image.
	if n, err := repo.AlignPromotedMarketImages(ctx); err != nil || n < 1 {
		t.Fatalf("align (correct): n=%d err=%v", n, err)
	}
	if got := readImage(); !got.Valid || got.String != rightImage {
		t.Fatalf("expected corrected image %q, got %+v", rightImage, got)
	}

	// Pass 2: after the shared-cover sweep clears the imported row, the
	// promoted market's thumbnail is dropped too.
	if n, err := repo.ClearImagePaths(ctx, []string{ur.ID}); err != nil || n != 1 {
		t.Fatalf("clear image paths: n=%d err=%v", n, err)
	}
	if n, err := repo.AlignPromotedMarketImages(ctx); err != nil || n < 1 {
		t.Fatalf("align (drop): n=%d err=%v", n, err)
	}
	if got := readImage(); got.Valid {
		t.Fatalf("expected dropped image, got %q", got.String)
	}

	// Idempotence: nothing left to change for this ticker.
	if _, err := repo.AlignPromotedMarketImages(ctx); err != nil {
		t.Fatalf("align (idempotent): %v", err)
	}
	if got := readImage(); got.Valid {
		t.Fatalf("image reappeared after idempotent align: %q", got.String)
	}
}
