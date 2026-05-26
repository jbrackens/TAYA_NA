package markettranslate

import (
	"context"
	"encoding/json"
	"testing"
)

type memoryStore struct {
	candidates []MarketCopy
	cache      map[string]map[string]string
	writes     []string
	tickers    []string
}

func (s *memoryStore) ListCandidates(_ context.Context, _ []string, _ int, tickers []string) ([]MarketCopy, error) {
	s.tickers = append([]string(nil), tickers...)
	return s.candidates, nil
}

func (s *memoryStore) CacheHashes(_ context.Context, marketID string, _ []string) (map[string]string, error) {
	if s.cache == nil {
		return map[string]string{}, nil
	}
	if hashes, ok := s.cache[marketID]; ok {
		return hashes, nil
	}
	return map[string]string{}, nil
}

func (s *memoryStore) UpsertTranslation(_ context.Context, marketID string, locale string, _ string, _ Translation, _ TranslationMeta) error {
	s.writes = append(s.writes, marketID+":"+locale)
	return nil
}

type memoryTranslator struct {
	calls   int
	locales []string
}

func (t *memoryTranslator) Translate(_ context.Context, req TranslationRequest) (map[string]Translation, TranslationMeta, error) {
	t.calls++
	out := map[string]Translation{}
	for _, locale := range req.Locales {
		t.locales = append(t.locales, locale.Code)
		out[locale.Code] = Translation{
			Title:       locale.Code + " title",
			Description: locale.Code + " description",
		}
	}
	return out, TranslationMeta{Provider: "test", Model: "test-model", Prompt: PromptVersion}, nil
}

func TestBackfillDoesNotOverwriteManualTranslationsWithoutCache(t *testing.T) {
	translations := json.RawMessage(`{"zh-Hans":{"title":"手动标题","description":"手动说明"}}`)
	store := &memoryStore{
		candidates: []MarketCopy{{
			ID:           "m1",
			Ticker:       "IMP-MANUAL",
			Title:        "Will Team win?",
			Description:  "Resolves YES if Team wins.",
			Translations: translations,
		}},
	}
	translator := &memoryTranslator{}

	summary, err := Backfill(context.Background(), store, translator, Config{
		Locales: []string{"zh-Hans"},
		Limit:   1,
	})
	if err != nil {
		t.Fatal(err)
	}
	if translator.calls != 0 {
		t.Fatalf("expected no provider call for manual translation, got %d", translator.calls)
	}
	if len(store.writes) != 0 {
		t.Fatalf("expected no writes, got %#v", store.writes)
	}
	if summary.MarketsSkipped != 1 {
		t.Fatalf("skipped = %d, want 1", summary.MarketsSkipped)
	}
}

func TestBackfillRegeneratesStaleMachineTranslation(t *testing.T) {
	market := MarketCopy{
		ID:           "m1",
		Ticker:       "IMP-STALE",
		Title:        "Will Team win?",
		Description:  "Resolves YES if Team wins.",
		Translations: json.RawMessage(`{"zh-Hans":{"title":"旧标题","description":"旧说明"}}`),
	}
	store := &memoryStore{
		candidates: []MarketCopy{market},
		cache: map[string]map[string]string{
			"m1": {"zh-Hans": "old-source-hash"},
		},
	}
	translator := &memoryTranslator{}

	summary, err := Backfill(context.Background(), store, translator, Config{
		Locales: []string{"zh-Hans"},
		Limit:   1,
	})
	if err != nil {
		t.Fatal(err)
	}
	if translator.calls != 1 {
		t.Fatalf("provider calls = %d, want 1", translator.calls)
	}
	if len(store.writes) != 1 || store.writes[0] != "m1:zh-Hans" {
		t.Fatalf("writes = %#v, want zh-Hans write", store.writes)
	}
	if summary.TranslationsWritten != 1 {
		t.Fatalf("translations written = %d, want 1", summary.TranslationsWritten)
	}
}

func TestBackfillGeneratesOnlyMissingLocales(t *testing.T) {
	store := &memoryStore{
		candidates: []MarketCopy{{
			ID:           "m1",
			Ticker:       "IMP-MISSING",
			Title:        "Will Team win?",
			Description:  "Resolves YES if Team wins.",
			Translations: json.RawMessage(`{"zh-Hans":{"title":"手动标题","description":"手动说明"}}`),
		}},
	}
	translator := &memoryTranslator{}

	_, err := Backfill(context.Background(), store, translator, Config{
		Locales: []string{"zh-Hans", "id"},
		Limit:   1,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(translator.locales) != 1 || translator.locales[0] != "id" {
		t.Fatalf("provider locales = %#v, want only id", translator.locales)
	}
}

func TestBackfillPassesTargetTickersToStore(t *testing.T) {
	store := &memoryStore{}

	_, err := Backfill(context.Background(), store, &memoryTranslator{}, Config{
		Locales: []string{"id"},
		Tickers: []string{
			"IMP-485DDC71",
		},
		Limit: 1,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(store.tickers) != 1 || store.tickers[0] != "IMP-485DDC71" {
		t.Fatalf("tickers = %#v, want target ticker", store.tickers)
	}
}
