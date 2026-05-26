// translate-markets backfills machine-generated display translations for
// prediction market copy. It never runs in the browser and never makes a model
// call for a locale whose current English source hash is already cached.
package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	_ "github.com/lib/pq"

	"phoenix-revival/gateway/internal/markettranslate"
)

func main() {
	cfg := markettranslate.ConfigFromEnv()
	var (
		limit          = flag.Int("limit", cfg.Limit, "maximum markets to scan")
		locales        = flag.String("locales", strings.Join(cfg.Locales, ","), "comma-separated target locales")
		dryRun         = flag.Bool("dry-run", false, "show how many translations would be generated without calling the model or writing DB rows")
		timeout        = flag.Int("timeout", 600, "overall job timeout in seconds")
		requestTimeout = flag.Int("request-timeout", int(cfg.Timeout.Seconds()), "per-provider-request timeout in seconds")
		endpoint       = flag.String("endpoint", cfg.Endpoint, "OpenAI-compatible base endpoint")
		model          = flag.String("model", cfg.Model, "OpenAI-compatible model name")
		provider       = flag.String("provider", cfg.Provider, "provider label stored in translation cache")
		apiKeyEnv      = flag.String("api-key-env", "", "environment variable that contains the translation API key; overrides AI_TRANSLATION_API_KEY fallback chain")
	)
	flag.Parse()

	dsn := strings.TrimSpace(os.Getenv("GATEWAY_DB_DSN"))
	if dsn == "" {
		log.Fatal("GATEWAY_DB_DSN environment variable not set")
	}

	cfg.Limit = *limit
	cfg.Locales = markettranslate.ParseLocaleList(*locales)
	cfg.DryRun = *dryRun
	cfg.Timeout = time.Duration(*requestTimeout) * time.Second
	cfg.Endpoint = strings.TrimSpace(*endpoint)
	cfg.Model = strings.TrimSpace(*model)
	cfg.Provider = strings.TrimSpace(*provider)
	if keyName := strings.TrimSpace(*apiKeyEnv); keyName != "" {
		cfg.APIKey = strings.TrimSpace(os.Getenv(keyName))
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("open db: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatalf("ping db: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(*timeout)*time.Second)
	defer cancel()

	repo := markettranslate.NewRepository(db)
	translator := markettranslate.NewOpenAICompatibleClient(cfg)
	summary, err := markettranslate.Backfill(ctx, repo, translator, cfg)
	if err != nil {
		log.Fatalf("translate markets: %v", err)
	}
	fmt.Fprintf(os.Stderr,
		"translate-markets: ok dry_run=%t scanned=%d markets_translated=%d markets_skipped=%d translations_written=%d failures=%d locales=%s model=%s\n",
		summary.DryRun,
		summary.MarketsScanned,
		summary.MarketsTranslated,
		summary.MarketsSkipped,
		summary.TranslationsWritten,
		summary.Failures,
		strings.Join(cfg.Locales, ","),
		cfg.Model,
	)
	if summary.Failures > 0 {
		os.Exit(1)
	}
}
