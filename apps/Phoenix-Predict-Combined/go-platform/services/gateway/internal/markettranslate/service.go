package markettranslate

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
)

type Store interface {
	ListCandidates(ctx context.Context, locales []string, limit int) ([]MarketCopy, error)
	CacheHashes(ctx context.Context, marketID string, locales []string) (map[string]string, error)
	UpsertTranslation(ctx context.Context, marketID string, locale string, sourceHash string, translation Translation, meta TranslationMeta) error
}

func Backfill(ctx context.Context, store Store, translator Translator, cfg Config) (Summary, error) {
	cfg.Locales = NormalizeLocales(cfg.Locales)
	if cfg.Limit <= 0 {
		cfg.Limit = 50
	}
	if cfg.MaxDescriptionChars <= 0 {
		cfg.MaxDescriptionChars = 6000
	}

	candidates, err := store.ListCandidates(ctx, cfg.Locales, cfg.Limit)
	if err != nil {
		return Summary{}, err
	}

	summary := Summary{
		MarketsScanned: len(candidates),
		DryRun:         cfg.DryRun,
	}

	for _, market := range candidates {
		market.Description = truncateForModel(market.Description, cfg.MaxDescriptionChars)
		targets, err := targetLocales(ctx, store, market, cfg.Locales)
		if err != nil {
			summary.Failures++
			slog.Warn("market translation: target-locale check failed", "ticker", market.Ticker, "err", err)
			continue
		}
		if len(targets) == 0 {
			summary.MarketsSkipped++
			continue
		}
		if cfg.DryRun {
			summary.MarketsTranslated++
			summary.TranslationsWritten += len(targets)
			continue
		}

		localeSpecs := specsFor(targets)
		translations, meta, err := translator.Translate(ctx, TranslationRequest{
			Market:  market,
			Locales: localeSpecs,
		})
		if err != nil {
			summary.Failures++
			slog.Warn("market translation: provider call failed", "ticker", market.Ticker, "err", err)
			continue
		}
		if meta.Provider == "" {
			meta.Provider = cfg.Provider
		}
		if meta.Model == "" {
			meta.Model = cfg.Model
		}
		if meta.Prompt == "" {
			meta.Prompt = PromptVersion
		}

		wrote := 0
		sourceHash := market.SourceHash()
		for _, locale := range targets {
			translation, ok := translations[locale]
			if !ok {
				summary.Failures++
				slog.Warn("market translation: provider omitted locale", "ticker", market.Ticker, "locale", locale)
				continue
			}
			normalized, err := validateTranslation(market, translation)
			if err != nil {
				summary.Failures++
				slog.Warn("market translation: provider returned invalid copy", "ticker", market.Ticker, "locale", locale, "err", err)
				continue
			}
			if err := store.UpsertTranslation(ctx, market.ID, locale, sourceHash, normalized, meta); err != nil {
				summary.Failures++
				slog.Warn("market translation: persist failed", "ticker", market.Ticker, "locale", locale, "err", err)
				continue
			}
			wrote++
			summary.TranslationsWritten++
		}
		if wrote > 0 {
			summary.MarketsTranslated++
		}
	}

	return summary, nil
}

func targetLocales(ctx context.Context, store Store, market MarketCopy, locales []string) ([]string, error) {
	existing := decodeExistingTranslations(market.Translations)
	cacheHashes, err := store.CacheHashes(ctx, market.ID, locales)
	if err != nil {
		return nil, err
	}
	sourceHash := market.SourceHash()
	out := []string{}
	for _, locale := range NormalizeLocales(locales) {
		translation := existing[locale]
		missing := strings.TrimSpace(translation.Title) == "" ||
			(strings.TrimSpace(market.Description) != "" && strings.TrimSpace(translation.Description) == "")
		if missing {
			out = append(out, locale)
			continue
		}
		if cachedHash, ok := cacheHashes[locale]; ok && cachedHash != sourceHash {
			out = append(out, locale)
		}
	}
	return out, nil
}

func decodeExistingTranslations(raw json.RawMessage) map[string]Translation {
	out := map[string]Translation{}
	if len(raw) == 0 {
		return out
	}
	_ = json.Unmarshal(raw, &out)
	return out
}

func specsFor(locales []string) []LocaleSpec {
	byCode := map[string]LocaleSpec{}
	for _, spec := range SupportedLocales {
		byCode[spec.Code] = spec
	}
	out := []LocaleSpec{}
	for _, locale := range NormalizeLocales(locales) {
		if spec, ok := byCode[locale]; ok {
			out = append(out, spec)
		}
	}
	return out
}

func validateTranslation(market MarketCopy, translation Translation) (Translation, error) {
	translation.Title = strings.TrimSpace(translation.Title)
	translation.Description = strings.TrimSpace(translation.Description)
	if translation.Title == "" {
		return translation, fmt.Errorf("missing translated title")
	}
	if strings.TrimSpace(market.Description) != "" && translation.Description == "" {
		return translation, fmt.Errorf("missing translated description")
	}
	return translation, nil
}

func truncateForModel(value string, maxChars int) string {
	value = strings.TrimSpace(value)
	if maxChars <= 0 || len([]rune(value)) <= maxChars {
		return value
	}
	runes := []rune(value)
	return string(runes[:maxChars]) + "\n\n[TRUNCATED FOR TRANSLATION JOB]"
}
