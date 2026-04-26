package discover

import (
	"regexp"
	"strings"
)

// CategorySlug is one of the 7 categories that imported markets land in:
// 6 existing native categories + "general" for misfits. Any other value
// (or empty) is invalid and indicates a missing migration 018.
const (
	CatPolitics      = "politics"
	CatCrypto        = "crypto"
	CatSports        = "sports"
	CatEntertainment = "entertainment"
	CatTech          = "tech"
	CatEconomics     = "economics"
	CatGeneral       = "general"
)

// AllCategories is the closed set used for synthetic-event seeding and
// classifier output validation.
var AllCategories = []string{
	CatPolitics, CatCrypto, CatSports, CatEntertainment,
	CatTech, CatEconomics, CatGeneral,
}

// keyword lists are matched against title+description with WORD BOUNDARIES
// (`\b...\b`), not bare substrings. Earlier versions used substring matching
// which had a costly false positive: the keyword `primary` (intended for
// "primary nominee") matched Polymarket's standard description boilerplate
// "primary resolution source". An NBA market got classified as Politics.
// Word boundaries fix this without growing the keyword list.
//
// Priority order: politics > crypto > sports > entertainment > tech >
// economics > general (fallback).
var (
	politicsKeywords = []string{
		"election", "elections", "president", "presidential", "congress",
		"senate", "house", "governor", "democrat", "republican",
		"nominee", "nomination", "ballot", "trump", "biden", "harris",
		"vance", "newsom", "desantis", "ramaswamy", "oprah", "pelosi",
		"mcconnell", "schumer", "putin", "xi jinping", "impeach",
		"impeachment", "supreme court", "scotus", "vote",
		// "primary" was removed: too many false matches against
		// "primary resolution source" boilerplate.
		// "campaign" was removed: matches ad campaigns, marketing campaigns.
	}
	cryptoKeywords = []string{
		"bitcoin", "btc", "ethereum", "eth", "crypto", "cryptocurrency",
		"blockchain", "solana", "sol", "memecoin", "stablecoin", "tether",
		"usdc", "usdt", "binance", "coinbase", "halving", "defi", "nft",
		"erc20", "erc721", "wallet",
	}
	sportsKeywords = []string{
		"nfl", "nba", "mlb", "nhl", "fifa", "world cup", "olympic",
		"olympics", "soccer", "football", "basketball", "baseball",
		"hockey", "tennis", "golf", "ufc", "boxing", "playoff", "playoffs",
		"super bowl", "world series", "rookie", "tournament",
		"premier league", "champions league", "march madness",
		"stanley cup", "wimbledon",
	}
	entertainmentKeywords = []string{
		"oscar", "oscars", "academy award", "academy awards", "grammy",
		"grammys", "emmy", "emmys", "tony award", "golden globe",
		"box office", "movie", "film", "album", "billboard", "netflix",
		"hbo", "disney", "marvel", "celebrity", "taylor swift", "kanye",
		"beyonce", "drake", "rihanna",
	}
	techKeywords = []string{
		"openai", "chatgpt", "gpt", "claude", "anthropic", "gemini", "llama",
		"google", "apple", "microsoft", "amazon", "meta", "tesla",
		"spacex", "musk", "zuckerberg", "altman", "iphone", "android",
		"gpu", "tsmc", "ai model", "agi",
	}
	economicsKeywords = []string{
		"recession", "gdp", "cpi", "inflation", "unemployment",
		"federal reserve", "interest rate", "rate cut", "rate hike",
		"fomc", "treasury", "jobs report", "yield curve", "s&p 500",
		"dow jones", "nasdaq", "earnings",
	}
)

// compiledRegex caches the compiled \b<keyword>\b regex per keyword set.
// Built once per process, lookups are O(N) over a few dozen patterns —
// fine for the ~150-row classification pass per sync.
var (
	politicsRE      = compileWordBoundary(politicsKeywords)
	cryptoRE        = compileWordBoundary(cryptoKeywords)
	sportsRE        = compileWordBoundary(sportsKeywords)
	entertainmentRE = compileWordBoundary(entertainmentKeywords)
	techRE          = compileWordBoundary(techKeywords)
	economicsRE     = compileWordBoundary(economicsKeywords)
)

func compileWordBoundary(keywords []string) *regexp.Regexp {
	parts := make([]string, 0, len(keywords))
	for _, k := range keywords {
		parts = append(parts, regexp.QuoteMeta(k))
	}
	pattern := `(?i)\b(` + strings.Join(parts, "|") + `)\b`
	return regexp.MustCompile(pattern)
}

// Classify maps a market to one of the 7 category slugs. Uses the
// upstream-provided category if present and recognized; otherwise runs the
// keyword classifier; otherwise falls back to "general".
func Classify(m Market) string {
	if cat := normalizeUpstreamCategory(m.Category); cat != "" {
		return cat
	}
	return classifyByKeyword(m.Title + " " + m.Description)
}

// normalizeUpstreamCategory maps upstream-provided category strings into
// our 7-slug taxonomy. Returns "" when no clean mapping exists.
func normalizeUpstreamCategory(raw string) string {
	if raw == "" {
		return ""
	}
	normalized := strings.ToLower(strings.TrimSpace(raw))
	if cat, ok := aliasMap[normalized]; ok {
		return cat
	}
	for substr, cat := range aliasSubstrings {
		if strings.Contains(normalized, substr) {
			return cat
		}
	}
	return ""
}

var aliasMap = map[string]string{
	"politics":       CatPolitics,
	"us politics":    CatPolitics,
	"election":       CatPolitics,
	"elections":      CatPolitics,
	"crypto":         CatCrypto,
	"cryptocurrency": CatCrypto,
	"sports":         CatSports,
	"entertainment":  CatEntertainment,
	"culture":        CatEntertainment,
	"pop culture":    CatEntertainment,
	"tech":           CatTech,
	"technology":     CatTech,
	"science":        CatTech,
	"economics":      CatEconomics,
	"economy":        CatEconomics,
	"business":       CatEconomics,
	"finance":        CatEconomics,
}

var aliasSubstrings = map[string]string{
	"polit":  CatPolitics,
	"crypto": CatCrypto,
	"sport":  CatSports,
	"entert": CatEntertainment,
	"econ":   CatEconomics,
	"financ": CatEconomics,
}

// classifyByKeyword runs word-boundary regex matches in priority order.
// First category whose pattern matches claims the market.
func classifyByKeyword(text string) string {
	if politicsRE.MatchString(text) {
		return CatPolitics
	}
	if cryptoRE.MatchString(text) {
		return CatCrypto
	}
	if sportsRE.MatchString(text) {
		return CatSports
	}
	if entertainmentRE.MatchString(text) {
		return CatEntertainment
	}
	if techRE.MatchString(text) {
		return CatTech
	}
	if economicsRE.MatchString(text) {
		return CatEconomics
	}
	return CatGeneral
}
