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

	"taptrade/gateway/internal/markettranslate"
)

func main() {
	cfg := markettranslate.ConfigFromEnv()
	var (
		limit          = flag.Int("limit", cfg.Limit, "maximum markets to scan")
		locales        = flag.String("locales", strings.Join(cfg.Locales, ","), "comma-separated target locales")
		tickers        = flag.String("tickers", strings.Join(cfg.Tickers, ","), "optional comma-separated market tickers to translate")
		batches        = flag.Int("batches", 1, "number of sequential batches to run; each batch scans up to -limit markets")
		dryRun         = flag.Bool("dry-run", false, "show how many translations would be generated without calling the model or writing DB rows")
		timeout        = flag.Int("timeout", 600, "overall job timeout in seconds")
		requestTimeout = flag.Int("request-timeout", int(cfg.Timeout.Seconds()), "per-provider-request timeout in seconds")
		endpoint       = flag.String("endpoint", cfg.Endpoint, "OpenAI-compatible base endpoint")
		model          = flag.String("model", cfg.Model, "OpenAI-compatible model name")
		provider       = flag.String("provider", cfg.Provider, "provider label stored in translation cache")
		apiKeyEnv      = flag.String("api-key-env", "", "environment variable that contains the translation API key; overrides AI_TRANSLATION_API_KEY fallback chain")
		failOnFailures = flag.Bool("fail-on-failures", true, "exit non-zero when any market translation fails")
	)
	flag.Parse()

	dsn := strings.TrimSpace(os.Getenv("GATEWAY_DB_DSN"))
	if dsn == "" {
		log.Fatal("GATEWAY_DB_DSN environment variable not set")
	}

	cfg.Limit = *limit
	cfg.Locales = markettranslate.ParseLocaleList(*locales)
	cfg.Tickers = markettranslate.ParseTickerList(*tickers)
	cfg.DryRun = *dryRun
	cfg.Timeout = time.Duration(*requestTimeout) * time.Second
	cfg.Endpoint = strings.TrimSpace(*endpoint)
	cfg.Model = strings.TrimSpace(*model)
	cfg.Provider = strings.TrimSpace(*provider)
	if keyName := strings.TrimSpace(*apiKeyEnv); keyName != "" {
		cfg.APIKey = strings.TrimSpace(os.Getenv(keyName))
	}
	if *batches <= 0 {
		log.Fatal("-batches must be greater than zero")
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

	aggregate := markettranslate.Summary{DryRun: cfg.DryRun}
	batchesRun := 0
	for batch := 1; batch <= *batches; batch++ {
		summary, err := markettranslate.Backfill(ctx, repo, translator, cfg)
		if err != nil {
			log.Fatalf("translate markets batch %d: %v", batch, err)
		}
		batchesRun++
		aggregate = mergeSummaries(aggregate, summary)
		fmt.Fprintf(os.Stderr,
			"translate-markets: batch=%d/%d dry_run=%t scanned=%d markets_translated=%d markets_skipped=%d translations_written=%d failures=%d remaining_untranslated=%d remaining_by_locale=%s\n",
			batch,
			*batches,
			summary.DryRun,
			summary.MarketsScanned,
			summary.MarketsTranslated,
			summary.MarketsSkipped,
			summary.TranslationsWritten,
			summary.Failures,
			summary.RemainingUntranslatedTotal,
			formatCounts(summary.RemainingUntranslatedByLocale, cfg.Locales),
		)
		if cfg.DryRun {
			break
		}
		if summary.TranslationsWritten == 0 {
			fmt.Fprintf(os.Stderr,
				"translate-markets: stopping after batch %d because no translations were written; remaining_untranslated=%d failures=%d\n",
				batch,
				summary.RemainingUntranslatedTotal,
				summary.Failures,
			)
			break
		}
	}

	fmt.Fprintf(os.Stderr,
		"translate-markets: ok dry_run=%t batches_run=%d requested_batches=%d scanned=%d markets_translated=%d markets_skipped=%d translations_written=%d failures=%d remaining_untranslated=%d remaining_by_locale=%s locales=%s model=%s\n",
		aggregate.DryRun,
		batchesRun,
		*batches,
		aggregate.MarketsScanned,
		aggregate.MarketsTranslated,
		aggregate.MarketsSkipped,
		aggregate.TranslationsWritten,
		aggregate.Failures,
		aggregate.RemainingUntranslatedTotal,
		formatCounts(aggregate.RemainingUntranslatedByLocale, cfg.Locales),
		strings.Join(cfg.Locales, ","),
		cfg.Model,
	)
	if aggregate.Failures > 0 && *failOnFailures {
		os.Exit(1)
	}
}

func mergeSummaries(total markettranslate.Summary, batch markettranslate.Summary) markettranslate.Summary {
	total.MarketsScanned += batch.MarketsScanned
	total.MarketsTranslated += batch.MarketsTranslated
	total.MarketsSkipped += batch.MarketsSkipped
	total.TranslationsWritten += batch.TranslationsWritten
	total.Failures += batch.Failures
	total.RemainingUntranslatedTotal = batch.RemainingUntranslatedTotal
	total.RemainingUntranslatedByLocale = batch.RemainingUntranslatedByLocale
	total.DryRun = batch.DryRun
	return total
}

func formatCounts(counts map[string]int, locales []string) string {
	locales = markettranslate.NormalizeLocales(locales)
	parts := make([]string, 0, len(locales))
	for _, locale := range locales {
		parts = append(parts, fmt.Sprintf("%s=%d", locale, counts[locale]))
	}
	return strings.Join(parts, ",")
}
