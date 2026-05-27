package markettranslate

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"strconv"
	"strings"
	"time"
)

const PromptVersion = "market-translation-v1"

type LocaleSpec struct {
	Code string
	Name string
}

var SupportedLocales = []LocaleSpec{
	{Code: "zh-Hans", Name: "Simplified Chinese"},
	{Code: "zh-Hant", Name: "Traditional Chinese"},
	{Code: "tl", Name: "Tagalog"},
	{Code: "ms", Name: "Malay"},
	{Code: "id", Name: "Indonesian"},
}

func DefaultLocaleCodes() []string {
	out := make([]string, 0, len(SupportedLocales))
	for _, locale := range SupportedLocales {
		out = append(out, locale.Code)
	}
	return out
}

func NormalizeLocales(raw []string) []string {
	allowed := map[string]bool{}
	for _, locale := range SupportedLocales {
		allowed[locale.Code] = true
	}
	seen := map[string]bool{}
	out := []string{}
	for _, value := range raw {
		code := strings.TrimSpace(value)
		if !allowed[code] || seen[code] {
			continue
		}
		seen[code] = true
		out = append(out, code)
	}
	if len(out) == 0 {
		return DefaultLocaleCodes()
	}
	return out
}

func ParseLocaleList(value string) []string {
	if strings.TrimSpace(value) == "" {
		return DefaultLocaleCodes()
	}
	return NormalizeLocales(strings.Split(value, ","))
}

func ParseTickerList(value string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, raw := range strings.Split(value, ",") {
		ticker := strings.ToUpper(strings.TrimSpace(raw))
		if ticker == "" || seen[ticker] {
			continue
		}
		seen[ticker] = true
		out = append(out, ticker)
	}
	return out
}

type Config struct {
	Endpoint            string
	APIKey              string
	Model               string
	Provider            string
	Locales             []string
	Tickers             []string
	Limit               int
	Timeout             time.Duration
	MaxDescriptionChars int
	DryRun              bool
}

func ConfigFromEnv() Config {
	return Config{
		Endpoint:            envFirst("https://openrouter.ai/api/v1", "AI_TRANSLATION_ENDPOINT", "AI_ROUTINE_ENDPOINT", "AI_HARD_ENDPOINT"),
		APIKey:              envFirst("", "AI_TRANSLATION_API_KEY", "AI_ROUTINE_API_KEY", "AI_HARD_API_KEY", "OPENROUTER_API_KEY"),
		Model:               envFirst("openai/gpt-4o-mini", "AI_TRANSLATION_MODEL", "AI_ROUTINE_MODEL", "AI_HARD_MODEL"),
		Provider:            envFirst("openai-compatible", "AI_TRANSLATION_PROVIDER", "AI_ROUTINE_PROVIDER"),
		Locales:             ParseLocaleList(os.Getenv("AI_TRANSLATION_LOCALES")),
		Limit:               envInt("AI_TRANSLATION_LIMIT", 50),
		Timeout:             time.Duration(envInt("AI_TRANSLATION_TIMEOUT_SECONDS", 45)) * time.Second,
		MaxDescriptionChars: envInt("AI_TRANSLATION_MAX_DESCRIPTION_CHARS", 6000),
	}
}

func envFirst(fallback string, keys ...string) string {
	for _, key := range keys {
		if v := strings.TrimSpace(os.Getenv(key)); v != "" {
			return v
		}
	}
	return fallback
}

func envInt(key string, fallback int) int {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return fallback
}

type MarketCopy struct {
	ID           string
	Ticker       string
	Title        string
	Description  string
	Translations json.RawMessage
}

func (m MarketCopy) SourceHash() string {
	sum := sha256.Sum256([]byte(strings.TrimSpace(m.Title) + "\n" + strings.TrimSpace(m.Description)))
	return hex.EncodeToString(sum[:])
}

type Translation struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

type TranslationRequest struct {
	Market  MarketCopy
	Locales []LocaleSpec
}

type TranslationMeta struct {
	Provider     string
	Model        string
	Prompt       string
	InputTokens  *int
	OutputTokens *int
}

type Translator interface {
	Translate(ctx context.Context, req TranslationRequest) (map[string]Translation, TranslationMeta, error)
}

type Summary struct {
	MarketsScanned                int
	MarketsTranslated             int
	MarketsSkipped                int
	TranslationsWritten           int
	Failures                      int
	RemainingUntranslatedTotal    int
	RemainingUntranslatedByLocale map[string]int
	DryRun                        bool
}
