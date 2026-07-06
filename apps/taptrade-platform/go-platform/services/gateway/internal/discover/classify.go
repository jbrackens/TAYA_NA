package discover

import (
	"regexp"
	"strings"
)

// CategorySlug is one of the 7 launch-safe categories that imported markets
// land in: 6 native categories + "general" for misfits. Any other value (or
// empty) is invalid and indicates a missing taxonomy migration.
const (
	CatPolitics      = "politics"
	CatSports        = "sports"
	CatEntertainment = "entertainment"
	CatEsports       = "esports"
	CatTech          = "tech"
	CatEconomics     = "economics"
	CatGeneral       = "general"
)

// AllCategories is the closed set used for synthetic-event seeding and
// classifier output validation.
var AllCategories = []string{
	CatPolitics, CatSports, CatEntertainment, CatEsports,
	CatTech, CatEconomics, CatGeneral,
}

// keyword lists are matched against title+description with WORD BOUNDARIES
// (`\b...\b`), not bare substrings. Earlier versions used substring matching
// which had a costly false positive: the keyword `primary` (intended for
// "primary nominee") matched Polymarket's standard description boilerplate
// "primary resolution source". An NBA market got classified as Politics.
// Word boundaries fix this without growing the keyword list.
//
// Priority order: politics > sports > entertainment > esports > tech >
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
	launchProhibitedMarketKeywords = []string{
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
	esportsKeywords = []string{
		"esports", "e-sports", "mlbb", "mobile legends", "valorant",
		"league of legends", "dota", "dota 2", "counter-strike",
		"cs2", "overwatch",
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
	prohibitedRE    = compileWordBoundary(launchProhibitedMarketKeywords)
	sportsRE        = compileWordBoundary(sportsKeywords)
	entertainmentRE = compileWordBoundary(entertainmentKeywords)
	esportsRE       = compileWordBoundary(esportsKeywords)
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
	if IsLaunchProhibitedMarket(m) {
		return CatGeneral
	}
	if cat := normalizeUpstreamCategory(m.Category); cat != "" {
		return cat
	}
	return classifyByKeyword(m.Title + " " + m.Description)
}

func IsLaunchProhibitedMarket(m Market) bool {
	text := strings.Join([]string{m.Category, m.Title, m.Description}, " ")
	return prohibitedRE.MatchString(text)
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
	for _, alias := range aliasSubstrings {
		if strings.Contains(normalized, alias.substr) {
			return alias.cat
		}
	}
	return ""
}

var aliasMap = map[string]string{
	"politics":      CatPolitics,
	"us politics":   CatPolitics,
	"election":      CatPolitics,
	"elections":     CatPolitics,
	"sports":        CatSports,
	"entertainment": CatEntertainment,
	"culture":       CatEntertainment,
	"pop culture":   CatEntertainment,
	"esports":       CatEsports,
	"e-sports":      CatEsports,
	"gaming":        CatEsports,
	"tech":          CatTech,
	"technology":    CatTech,
	"science":       CatTech,
	"economics":     CatEconomics,
	"economy":       CatEconomics,
	"business":      CatEconomics,
	"finance":       CatEconomics,
}

var aliasSubstrings = []struct {
	substr string
	cat    string
}{
	{"polit", CatPolitics},
	{"esport", CatEsports},
	{"gaming", CatEsports},
	{"sport", CatSports},
	{"entert", CatEntertainment},
	{"econ", CatEconomics},
	{"financ", CatEconomics},
}

// classifyByKeyword runs word-boundary regex matches in priority order.
// First category whose pattern matches claims the market.
func classifyByKeyword(text string) string {
	if politicsRE.MatchString(text) {
		return CatPolitics
	}
	if sportsRE.MatchString(text) {
		return CatSports
	}
	if entertainmentRE.MatchString(text) {
		return CatEntertainment
	}
	if esportsRE.MatchString(text) {
		return CatEsports
	}
	if techRE.MatchString(text) {
		return CatTech
	}
	if economicsRE.MatchString(text) {
		return CatEconomics
	}
	return CatGeneral
}
