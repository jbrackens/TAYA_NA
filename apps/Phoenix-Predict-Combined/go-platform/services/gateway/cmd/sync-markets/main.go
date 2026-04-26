// sync-markets is a one-shot runner that pulls prediction markets from the
// three free upstream sources and writes them to imported_markets under our
// own UUIDs and image paths. Phase 1 — invoked by hand to reseed the demo.
package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "github.com/lib/pq"

	"phoenix-revival/gateway/internal/discover"
	"phoenix-revival/gateway/internal/prediction"
)

func main() {
	var (
		polymarketLimit = flag.Int("polymarket", 200, "max markets to pull from polymarket")
		kalshiLimit     = flag.Int("kalshi", 200, "max markets to pull from kalshi")
		manifoldLimit   = flag.Int("manifold", 100, "max markets to pull from manifold")
		publicRoot      = flag.String("public-root", "", "absolute path to player-app public/ dir for image rehosting (defaults to talon-backoffice/packages/app/public)")
		timeoutSec      = flag.Int("timeout", 180, "overall sync timeout in seconds")
	)
	flag.Parse()

	dsn := strings.TrimSpace(os.Getenv("GATEWAY_DB_DSN"))
	if dsn == "" {
		log.Fatal("GATEWAY_DB_DSN environment variable not set")
	}

	resolvedPublicRoot := *publicRoot
	if resolvedPublicRoot == "" {
		resolvedPublicRoot = defaultPublicRoot()
	}
	if resolvedPublicRoot == "" {
		log.Fatal("could not resolve player-app public/ directory; pass -public-root")
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	repo := discover.NewRepository(db)
	rehoster := discover.NewImageRehoster(resolvedPublicRoot)

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(*timeoutSec)*time.Second)
	defer cancel()

	limits := map[string]int{
		"polymarket": *polymarketLimit,
		"kalshi":     *kalshiLimit,
		"manifold":   *manifoldLimit,
	}

	slog.Info("sync-markets: starting", "limits", limits, "public_root", resolvedPublicRoot)
	t0 := time.Now()
	res, deduped, err := discover.Sync(ctx, repo, rehoster, limits)
	elapsed := time.Since(t0).Round(time.Millisecond)
	if err != nil {
		log.Fatalf("sync failed after %s: %v", elapsed, err)
	}

	// Promote into the AMM. Imported markets become first-class
	// prediction_markets rows. Service walks the FSM (unopened→open→
	// closed→settled), writes lifecycle events, and runs the settlement
	// engine for upstream-resolved markets. NewService(repo, nil)
	// substitutes a NoopWallet — fine for sync because Promote never
	// touches user balances (CreateMarket doesn't debit; ResolveMarket
	// on a market with zero positions is a no-op for the wallet).
	predRepo := prediction.NewSQLRepository(db)
	predSvc := prediction.NewService(predRepo, nil)
	promoteRes, err := discover.Promote(ctx, db, predRepo, predSvc, deduped)
	if err != nil {
		log.Fatalf("promote failed after %s: %v", time.Since(t0).Round(time.Millisecond), err)
	}

	totalElapsed := time.Since(t0).Round(time.Millisecond)
	fmt.Fprintf(os.Stderr,
		"sync-markets: ok in %s\n"+
			"  fetched : polymarket=%d kalshi=%d manifold=%d\n"+
			"  dedupe  : %d → %d\n"+
			"  imported: created=%d updated=%d images=%d (failed=%d)\n"+
			"  promote : open=%d resolved=%d closed=%d resolved_existing=%d skipped=%d failed=%d\n"+
			"  by_cat  : %v\n",
		totalElapsed,
		res.FetchedPolymarket, res.FetchedKalshi, res.FetchedManifold,
		res.BeforeDedupe, res.AfterDedupe,
		res.Created, res.Updated, res.ImagesRehosted, res.ImagesFailed,
		promoteRes.Created, promoteRes.Resolved, promoteRes.Closed, promoteRes.ResolvedExisting, promoteRes.Skipped, promoteRes.Failed,
		promoteRes.ByCategory,
	)
	if len(res.FetchErrors) > 0 {
		fmt.Fprintf(os.Stderr, "  warnings: %d fetch errors (see stderr above)\n",
			len(res.FetchErrors))
	}
}

// defaultPublicRoot resolves the player-app public/ directory relative to the
// gateway service. Layout:
//
//	apps/Phoenix-Predict-Combined/
//	  go-platform/services/gateway/      ← cwd when run via `go run ./cmd/sync-markets`
//	  talon-backoffice/packages/app/public/  ← target
func defaultPublicRoot() string {
	cwd, err := os.Getwd()
	if err != nil {
		return ""
	}
	candidates := []string{
		filepath.Join(cwd, "..", "..", "..", "talon-backoffice", "packages", "app", "public"),
		filepath.Join(cwd, "..", "..", "talon-backoffice", "packages", "app", "public"),
	}
	for _, c := range candidates {
		abs, err := filepath.Abs(c)
		if err != nil {
			continue
		}
		if info, err := os.Stat(abs); err == nil && info.IsDir() {
			return abs
		}
	}
	return ""
}
