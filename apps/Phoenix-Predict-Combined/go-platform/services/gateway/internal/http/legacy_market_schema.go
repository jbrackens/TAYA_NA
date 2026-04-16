package http

import (
	"fmt"
	"math"
	"strings"
	"unicode"

	"phoenix-revival/gateway/internal/domain"
)

type legacyPaginatedResponse[T any] struct {
	Data         []T  `json:"data"`
	CurrentPage  int  `json:"currentPage"`
	ItemsPerPage int  `json:"itemsPerPage"`
	TotalCount   int  `json:"totalCount"`
	HasNextPage  bool `json:"hasNextPage"`
}

type legacySport struct {
	SportID          string `json:"sportId"`
	Name             string `json:"name"`
	Abbreviation     string `json:"abbreviation"`
	DisplayToPunters bool   `json:"displayToPunters"`
}

type legacyTournament struct {
	TournamentID string `json:"tournamentId"`
	SportID      string `json:"sportId"`
	Name         string `json:"name"`
	StartTime    string `json:"startTime"`
}

type legacyCompetitorWithScore struct {
	CompetitorID string `json:"competitorId"`
	Name         string `json:"name"`
	Qualifier    string `json:"qualifier"`
	Score        int    `json:"score"`
}

type legacyDisplayOdds struct {
	American   string  `json:"american"`
	Decimal    float64 `json:"decimal"`
	Fractional string  `json:"fractional"`
}

type legacySelectionOdds struct {
	DisplayOdds   *legacyDisplayOdds `json:"displayOdds,omitempty"`
	SelectionID   string             `json:"selectionId"`
	SelectionName string             `json:"selectionName"`
	Active        bool               `json:"active"`
}

type legacyMarketLifecycle struct {
	Type         string `json:"type"`
	ChangeReason any    `json:"changeReason"`
}

type legacyMarketStateUpdate struct {
	MarketID       string                `json:"marketId"`
	MarketName     string                `json:"marketName"`
	MarketType     string                `json:"marketType"`
	MarketCategory string                `json:"marketCategory"`
	MarketStatus   legacyMarketLifecycle `json:"marketStatus"`
	Specifiers     map[string]string     `json:"specifiers"`
	SelectionOdds  []legacySelectionOdds `json:"selectionOdds"`
}

type legacyTradingMarketData struct {
	MarketID         string                `json:"marketId"`
	MarketName       string                `json:"marketName"`
	MarketType       string                `json:"marketType"`
	MarketCategory   string                `json:"marketCategory"`
	CurrentLifecycle legacyMarketLifecycle `json:"currentLifecycle"`
	SelectionOdds    []legacySelectionOdds `json:"selectionOdds"`
	Specifiers       map[string]string     `json:"specifiers"`
}

type legacyFixtureNavigation struct {
	FixtureID         string                               `json:"fixtureId"`
	FixtureName       string                               `json:"fixtureName"`
	StartTime         string                               `json:"startTime"`
	IsLive            bool                                 `json:"isLive"`
	Sport             legacySport                          `json:"sport"`
	Tournament        legacyTournament                     `json:"tournament"`
	Status            string                               `json:"status"`
	Markets           []legacyMarketStateUpdate            `json:"markets"`
	MarketsTotalCount int                                  `json:"marketsTotalCount"`
	Competitors       map[string]legacyCompetitorWithScore `json:"competitors"`
}

type legacyMarketNavigation struct {
	FixtureID   string                               `json:"fixtureId"`
	FixtureName string                               `json:"fixtureName"`
	StartTime   string                               `json:"startTime"`
	IsLive      bool                                 `json:"isLive"`
	Sport       legacySport                          `json:"sport"`
	Tournament  legacyTournament                     `json:"tournament"`
	Status      string                               `json:"status"`
	Market      legacyTradingMarketData              `json:"market"`
	Competitors map[string]legacyCompetitorWithScore `json:"competitors"`
}

func toLegacyPagination[T any](items []T, page domain.PageMeta) legacyPaginatedResponse[T] {
	return legacyPaginatedResponse[T]{
		Data:         items,
		CurrentPage:  page.Page,
		ItemsPerPage: page.PageSize,
		TotalCount:   page.Total,
		HasNextPage:  page.HasNext,
	}
}

func mapLegacyFixtureNavigation(fixture domain.Fixture, markets []domain.Market) legacyFixtureNavigation {
	sport := inferSport(fixture.SportKey, fixture.Tournament)
	tournamentID := "t:" + slugifyStable(fixture.Tournament)
	if tournamentID == "t:" {
		tournamentID = "t:unknown"
	}

	legacyMarkets := make([]legacyMarketStateUpdate, 0, len(markets))
	for _, market := range markets {
		legacyMarkets = append(legacyMarkets, mapLegacyMarketStateUpdate(market, fixture))
	}

	homeID := fmt.Sprintf("c:%s:home", stableIDToken(fixture.ID))
	awayID := fmt.Sprintf("c:%s:away", stableIDToken(fixture.ID))

	return legacyFixtureNavigation{
		FixtureID:         fixture.ID,
		FixtureName:       fixture.HomeTeam + " vs " + fixture.AwayTeam,
		StartTime:         fixture.StartsAt,
		IsLive:            fixture.Status == "in_play",
		Sport:             sport,
		Tournament:        legacyTournament{TournamentID: tournamentID, SportID: sport.SportID, Name: fixture.Tournament, StartTime: fixture.StartsAt},
		Status:            mapFixtureStatus(fixture.Status),
		Markets:           legacyMarkets,
		MarketsTotalCount: len(markets),
		Competitors: map[string]legacyCompetitorWithScore{
			"home": {CompetitorID: homeID, Name: fixture.HomeTeam, Qualifier: "home", Score: 0},
			"away": {CompetitorID: awayID, Name: fixture.AwayTeam, Qualifier: "away", Score: 0},
		},
	}
}

func mapLegacyMarketNavigation(market domain.Market, fixture domain.Fixture) legacyMarketNavigation {
	fixtureView := mapLegacyFixtureNavigation(fixture, nil)
	return legacyMarketNavigation{
		FixtureID:   fixtureView.FixtureID,
		FixtureName: fixtureView.FixtureName,
		StartTime:   fixtureView.StartTime,
		IsLive:      fixtureView.IsLive,
		Sport:       fixtureView.Sport,
		Tournament:  fixtureView.Tournament,
		Status:      fixtureView.Status,
		Market:      mapLegacyTradingMarketData(market, fixture),
		Competitors: fixtureView.Competitors,
	}
}

func mapLegacyTradingMarketData(market domain.Market, fixture domain.Fixture) legacyTradingMarketData {
	marketType := inferMarketType(market.Name)
	return legacyTradingMarketData{
		MarketID:         market.ID,
		MarketName:       market.Name,
		MarketType:       marketType,
		MarketCategory:   marketType,
		CurrentLifecycle: mapLegacyLifecycle(market.Status),
		SelectionOdds:    mapLegacySelectionOdds(market, fixture),
		Specifiers:       inferLegacySpecifiers(market.Name),
	}
}

func mapLegacyMarketStateUpdate(market domain.Market, fixture domain.Fixture) legacyMarketStateUpdate {
	marketType := inferMarketType(market.Name)
	return legacyMarketStateUpdate{
		MarketID:       market.ID,
		MarketName:     market.Name,
		MarketType:     marketType,
		MarketCategory: marketType,
		MarketStatus:   mapLegacyLifecycle(market.Status),
		Specifiers:     inferLegacySpecifiers(market.Name),
		SelectionOdds:  mapLegacySelectionOdds(market, fixture),
	}
}

func mapLegacyLifecycle(status string) legacyMarketLifecycle {
	normalized := strings.ToLower(strings.TrimSpace(status))
	switch normalized {
	case "open":
		return legacyMarketLifecycle{
			Type: "BETTABLE",
			ChangeReason: map[string]any{
				"type":   "DATA_SUPPLIER_CHANGE",
				"status": "ACTIVE",
			},
		}
	case "settled":
		return legacyMarketLifecycle{
			Type: "SETTLED",
			ChangeReason: map[string]any{
				"type":   "DATA_SUPPLIER_CHANGE",
				"status": "ACTIVE",
			},
		}
	case "cancelled":
		return legacyMarketLifecycle{
			Type: "CANCELLED",
			ChangeReason: map[string]any{
				"type":   "DATA_SUPPLIER_CANCELLATION",
				"reason": "cancelled by supplier",
			},
		}
	default:
		return legacyMarketLifecycle{
			Type: "NOT_BETTABLE",
			ChangeReason: map[string]any{
				"type":   "DATA_SUPPLIER_CHANGE",
				"status": "ACTIVE",
			},
		}
	}
}

func mapLegacySelectionOdds(market domain.Market, fixture domain.Fixture) []legacySelectionOdds {
	selections := market.Selections
	if len(selections) == 0 {
		selections = inferDefaultSelections(market.Name, fixture)
	}

	out := make([]legacySelectionOdds, 0, len(selections))
	for _, selection := range selections {
		var displayOdds *legacyDisplayOdds
		if selection.Odds > 1 {
			displayOdds = &legacyDisplayOdds{
				American:   toAmericanOdds(selection.Odds),
				Decimal:    round(selection.Odds, 3),
				Fractional: toFractionalOdds(selection.Odds),
			}
		}
		out = append(out, legacySelectionOdds{
			DisplayOdds:   displayOdds,
			SelectionID:   selection.ID,
			SelectionName: selection.Name,
			Active:        selection.Active,
		})
	}
	return out
}

func inferDefaultSelections(marketName string, fixture domain.Fixture) []domain.MarketSelection {
	name := strings.ToLower(marketName)
	switch {
	case strings.Contains(name, "both teams to score"):
		return []domain.MarketSelection{
			{ID: "yes", Name: "Yes", Odds: 2.1, Active: true},
			{ID: "no", Name: "No", Odds: 1.72, Active: true},
		}
	case strings.Contains(name, "over/under"):
		return []domain.MarketSelection{
			{ID: "over", Name: "Over 2.5", Odds: 1.94, Active: true},
			{ID: "under", Name: "Under 2.5", Odds: 1.91, Active: true},
		}
	default:
		return []domain.MarketSelection{
			{ID: "home", Name: fixture.HomeTeam, Odds: 1.82, Active: true},
			{ID: "away", Name: fixture.AwayTeam, Odds: 2.18, Active: true},
			{ID: "draw", Name: "Draw", Odds: 3.2, Active: true},
		}
	}
}

// sportRegistry maps sportKey values to display names.
var sportRegistry = map[string]legacySport{
	"soccer":    {SportID: "s:soccer", Name: "Football", Abbreviation: "FOOT", DisplayToPunters: true},
	"football":  {SportID: "s:soccer", Name: "Football", Abbreviation: "FOOT", DisplayToPunters: true},
	"basketball": {SportID: "s:basketball", Name: "Basketball", Abbreviation: "BASK", DisplayToPunters: true},
	"nba":       {SportID: "s:basketball", Name: "Basketball", Abbreviation: "BASK", DisplayToPunters: true},
	"boxing":    {SportID: "s:boxing", Name: "Boxing", Abbreviation: "BOX", DisplayToPunters: true},
	"mma":       {SportID: "s:mma", Name: "MMA", Abbreviation: "MMA", DisplayToPunters: true},
	"ufc":       {SportID: "s:mma", Name: "MMA", Abbreviation: "MMA", DisplayToPunters: true},
	"tennis":    {SportID: "s:tennis", Name: "Tennis", Abbreviation: "TEN", DisplayToPunters: true},
	"volleyball": {SportID: "s:volleyball", Name: "Volleyball", Abbreviation: "VB", DisplayToPunters: true},
	"baseball":  {SportID: "s:baseball", Name: "Baseball", Abbreviation: "BASE", DisplayToPunters: true},
	"mlb":       {SportID: "s:baseball", Name: "Baseball", Abbreviation: "BASE", DisplayToPunters: true},
	"cricket":   {SportID: "s:cricket", Name: "Cricket", Abbreviation: "CRIC", DisplayToPunters: true},
	"badminton": {SportID: "s:badminton", Name: "Badminton", Abbreviation: "BAD", DisplayToPunters: true},
	"cs2":       {SportID: "s:cs2", Name: "Counter-Strike 2", Abbreviation: "CS2", DisplayToPunters: true},
	"esports":   {SportID: "s:esports", Name: "Esports", Abbreviation: "ESPT", DisplayToPunters: true},
}

func inferSport(sportKey string, tournament string) legacySport {
	// First try sportKey lookup
	if sportKey != "" {
		key := strings.ToLower(strings.TrimSpace(sportKey))
		if sport, ok := sportRegistry[key]; ok {
			return sport
		}
	}
	// Fall back to tournament name inference
	lower := strings.ToLower(strings.TrimSpace(tournament))
	switch {
	case strings.Contains(lower, "league"),
		strings.Contains(lower, "liga"),
		strings.Contains(lower, "serie"),
		strings.Contains(lower, "championship"),
		strings.Contains(lower, "cup"):
		return sportRegistry["soccer"]
	case strings.Contains(lower, "nba"), strings.Contains(lower, "basketball"), strings.Contains(lower, "pba"):
		return sportRegistry["basketball"]
	case strings.Contains(lower, "ufc"), strings.Contains(lower, "mma"):
		return sportRegistry["mma"]
	case strings.Contains(lower, "boxing"), strings.Contains(lower, "wbc"), strings.Contains(lower, "wba"), strings.Contains(lower, "wbo"):
		return sportRegistry["boxing"]
	case strings.Contains(lower, "mlb"), strings.Contains(lower, "baseball"):
		return sportRegistry["baseball"]
	case strings.Contains(lower, "atp"), strings.Contains(lower, "wta"), strings.Contains(lower, "tennis"):
		return sportRegistry["tennis"]
	case strings.Contains(lower, "ipl"), strings.Contains(lower, "cricket"):
		return sportRegistry["cricket"]
	default:
		return legacySport{
			SportID:          "s:esports",
			Name:             "Esports",
			Abbreviation:     "ESPT",
			DisplayToPunters: true,
		}
	}
}

func mapFixtureStatus(status string) string {
	switch strings.ToLower(status) {
	case "in_play":
		return "IN_PLAY"
	case "finished", "completed":
		return "FINISHED"
	case "cancelled":
		return "CANCELLED"
	case "suspended":
		return "SUSPENDED"
	default:
		return "NOT_STARTED"
	}
}

func inferLegacySpecifiers(marketName string) map[string]string {
	lower := strings.ToLower(marketName)
	switch {
	case strings.Contains(lower, "match winner"):
		return map[string]string{"variant": "way:two", "way": "two"}
	case strings.Contains(lower, "over/under"):
		return map[string]string{"line": "2.5", "variant": "goals"}
	case strings.Contains(lower, "both teams to score"):
		return map[string]string{"variant": "yes-no"}
	default:
		return map[string]string{}
	}
}

func inferMarketType(name string) string {
	tokenized := make([]rune, 0, len(name))
	lastUnderscore := false
	for _, r := range strings.TrimSpace(name) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			tokenized = append(tokenized, unicode.ToUpper(r))
			lastUnderscore = false
			continue
		}
		if !lastUnderscore {
			tokenized = append(tokenized, '_')
			lastUnderscore = true
		}
	}
	out := strings.Trim(string(tokenized), "_")
	if out == "" {
		return "UNKNOWN"
	}
	return out
}

func stableIDToken(value string) string {
	raw := strings.TrimSpace(strings.ToLower(value))
	if raw == "" {
		return "unknown"
	}
	replaced := strings.NewReplacer(":", "_", "/", "_", " ", "_").Replace(raw)
	return replaced
}

func slugifyStable(value string) string {
	var out []rune
	lastDash := false
	for _, r := range strings.ToLower(strings.TrimSpace(value)) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			out = append(out, r)
			lastDash = false
			continue
		}
		if !lastDash {
			out = append(out, '-')
			lastDash = true
		}
	}
	return strings.Trim(string(out), "-")
}

func toAmericanOdds(decimal float64) string {
	if decimal <= 1 {
		return "+0"
	}
	if decimal >= 2 {
		value := int(math.Round((decimal - 1) * 100))
		return fmt.Sprintf("+%d", value)
	}
	value := int(math.Round(-100 / (decimal - 1)))
	return fmt.Sprintf("%d", value)
}

func toFractionalOdds(decimal float64) string {
	if decimal <= 1 {
		return "0/1"
	}
	numerator := int(math.Round((decimal - 1) * 100))
	denominator := 100
	g := gcd(numerator, denominator)
	return fmt.Sprintf("%d/%d", numerator/g, denominator/g)
}

func gcd(a int, b int) int {
	if a < 0 {
		a = -a
	}
	if b < 0 {
		b = -b
	}
	for b != 0 {
		a, b = b, a%b
	}
	if a == 0 {
		return 1
	}
	return a
}

func round(value float64, precision int) float64 {
	factor := math.Pow(10, float64(precision))
	return math.Round(value*factor) / factor
}
