package http

import (
	"errors"
	"fmt"
	"log/slog"
	stdhttp "net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/platform/transport/httpx"
)

const maxSportsScanPageSize = 100

// ---------------------------------------------------------------------------
// In-memory cache for sports catalog and league summaries.
//
// The /api/v1/sports endpoint previously loaded ALL fixtures on every request
// just to count events per sport. With a 45-second TTL cache the scan happens
// at most once per interval while readers pay only the cost of an RLock.
// ---------------------------------------------------------------------------

const sportsCatalogCacheTTL = 45 * time.Second

// sportsCatalogCache holds the most recent catalog response.
var sportsCatalogCache struct {
	mu           sync.RWMutex
	items        []sportCatalogItem
	lastRefreshed time.Time
}

// sportsLeagueCache holds per-sport league summaries.
var sportsLeagueCache struct {
	mu           sync.RWMutex
	data         map[string][]sportLeagueItem // keyed by sportKey
	lastRefreshed time.Time
}

type sportCatalogItem struct {
	SportKey    string `json:"sportKey"`
	Name        string `json:"name"`
	LeagueCount int    `json:"leagueCount"`
	EventCount  int    `json:"eventCount"`
}

type sportCatalogResponse struct {
	Items []sportCatalogItem `json:"items"`
}

type sportLeagueItem struct {
	LeagueKey  string `json:"leagueKey"`
	Name       string `json:"name"`
	EventCount int    `json:"eventCount"`
}

type sportLeaguesResponse struct {
	SportKey string            `json:"sportKey"`
	Items    []sportLeagueItem `json:"items"`
}

type sportEventItem struct {
	EventKey          string `json:"eventKey"`
	FixtureID         string `json:"fixtureId"`
	SportKey          string `json:"sportKey"`
	LeagueKey         string `json:"leagueKey"`
	LeagueName        string `json:"leagueName"`
	SeasonKey         string `json:"seasonKey,omitempty"`
	Name              string `json:"name"`
	HomeTeam          string `json:"homeTeam"`
	AwayTeam          string `json:"awayTeam"`
	StartTime         string `json:"startTime"`
	Status            string `json:"status"`
	MarketsTotalCount int    `json:"marketsTotalCount"`
}

type sportEventsResponse struct {
	SportKey   string           `json:"sportKey"`
	Items      []sportEventItem `json:"items"`
	Pagination domain.PageMeta  `json:"pagination"`
}

type sportEventMarketsResponse struct {
	SportKey   string          `json:"sportKey"`
	EventKey   string          `json:"eventKey"`
	FixtureID  string          `json:"fixtureId"`
	Items      []domain.Market `json:"items"`
	Pagination domain.PageMeta `json:"pagination"`
}

type sportDescriptor struct {
	Key     string
	Name    string
	Aliases []string
}

var sportDescriptors = []sportDescriptor{
	{Key: "esports", Name: "Esports", Aliases: []string{"esport", "e_sports", "sport:esports", "s:esports"}},
	{Key: "mlb", Name: "MLB", Aliases: []string{"baseball_mlb", "major_league_baseball", "sport:mlb"}},
	{Key: "nfl", Name: "NFL", Aliases: []string{"american_football_nfl", "national_football_league", "sport:nfl"}},
	{Key: "ncaa_baseball", Name: "NCAA Baseball", Aliases: []string{"ncaa_baseball_division_1", "college_baseball", "sport:ncaa_baseball"}},
	{Key: "nba", Name: "NBA", Aliases: []string{"basketball_nba", "national_basketball_association", "sport:nba"}},
	{Key: "ncaa_basketball", Name: "NCAA Basketball", Aliases: []string{"ncaa_basketball_division_1", "college_basketball", "sport:ncaa_basketball"}},
	{Key: "ufc", Name: "UFC", Aliases: []string{"mma", "mixed_martial_arts", "sport:ufc"}},
	{Key: "boxing", Name: "Boxing", Aliases: []string{"professional_boxing", "sport:boxing"}},
	{Key: "nhl", Name: "NHL", Aliases: []string{"hockey_nhl", "national_hockey_league", "sport:nhl"}},
	{Key: "tennis", Name: "Tennis", Aliases: []string{"professional_tennis", "sport:tennis"}},
	{Key: "golf", Name: "Golf", Aliases: []string{"professional_golf", "pga_tour", "sport:golf"}},
	{Key: "cricket", Name: "Cricket", Aliases: []string{"international_cricket", "ipl", "sport:cricket"}},
	{Key: "soccer", Name: "Soccer", Aliases: []string{"football", "football_soccer", "sport:soccer"}},
	{Key: "rugby", Name: "Rugby", Aliases: []string{"rugby_union", "rugby_league", "sport:rugby"}},
}

var allowedEventStatuses = map[string]struct{}{
	"scheduled": {},
	"in_play":   {},
	"finished":  {},
	"cancelled": {},
	"suspended": {},
}

func registerSportRoutes(mux *stdhttp.ServeMux, repository domain.ReadRepository) {
	mux.Handle("/api/v1/sports", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		return listSportsCatalog(w, repository)
	}))

	mux.Handle("/api/v1/sports/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/sports/"), "/")
		if path == "" {
			return httpx.NotFound("sport route not found")
		}
		parts := strings.Split(path, "/")
		sportKey, ok := normalizeSportKey(parts[0])
		if !ok {
			return httpx.NotFound("sport not found")
		}

		switch {
		case len(parts) == 2 && parts[1] == "leagues":
			return listSportLeagues(w, repository, sportKey)
		case len(parts) == 2 && parts[1] == "events":
			return listSportEvents(w, r, repository, sportKey)
		case len(parts) == 3 && parts[1] == "events":
			return getSportEventByKey(w, repository, sportKey, parts[2])
		case len(parts) == 4 && parts[1] == "events" && parts[3] == "markets":
			return listSportEventMarkets(w, r, repository, sportKey, parts[2])
		default:
			return httpx.NotFound("sport route not found")
		}
	}))

	mux.Handle("/api/v1/esports/events", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		return listSportEvents(w, r, repository, "esports")
	}))

	mux.Handle("/api/v1/esports/events/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		path := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/esports/events/"), "/")
		if path == "" {
			return httpx.NotFound("event not found")
		}
		parts := strings.Split(path, "/")
		eventKey := strings.TrimSpace(parts[0])
		if eventKey == "" {
			return httpx.NotFound("event not found")
		}
		if len(parts) == 1 {
			return getSportEventByKey(w, repository, "esports", eventKey)
		}
		if len(parts) == 2 && parts[1] == "markets" {
			return listSportEventMarkets(w, r, repository, "esports", eventKey)
		}
		return httpx.NotFound("event route not found")
	}))

	// GET /api/v1/events — alias that accepts ?sport=X query param
	mux.Handle("/api/v1/events", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		sportParam := r.URL.Query().Get("sport")
		if sportParam == "" {
			sportParam = "all"
		}
		sportKey, ok := normalizeSportKey(sportParam)
		if !ok && sportParam != "all" {
			return httpx.NotFound("sport not found")
		}
		if sportParam == "all" {
			sportKey = ""
		}
		return listSportEvents(w, r, repository, sportKey)
	}))

	// GET /api/v1/events/{eventId} — lookup by fixture ID across all sports
	mux.Handle("/api/v1/events/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		eventID := strings.TrimPrefix(r.URL.Path, "/api/v1/events/")
		eventID = strings.TrimSuffix(eventID, "/")
		if eventID == "" {
			return httpx.NotFound("event ID required")
		}
		// Search across all fixtures for this ID
		fixtures, err := listAllFixtures(repository)
		if err != nil {
			return httpx.Internal("failed to load fixtures", err)
		}
		for _, f := range fixtures {
			if f.ID == eventID {
				return httpx.WriteJSON(w, stdhttp.StatusOK, f)
			}
		}
		return httpx.NotFound("event not found")
	}))

	// GET /api/v1/search/events?q=... — search fixtures by name/team
	mux.Handle("/api/v1/search/events", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		query := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("q")))
		if query == "" {
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]interface{}{"data": []interface{}{}})
		}
		fixtures, err := listAllFixtures(repository)
		if err != nil {
			return httpx.Internal("failed to search fixtures", err)
		}
		var results []domain.Fixture
		for _, f := range fixtures {
			searchable := strings.ToLower(f.HomeTeam + " " + f.AwayTeam + " " + f.Tournament + " " + f.SportKey)
			if strings.Contains(searchable, query) {
				results = append(results, f)
				if len(results) >= 10 {
					break
				}
			}
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]interface{}{"data": results})
	}))
}

func listSportsCatalog(w stdhttp.ResponseWriter, repository domain.ReadRepository) error {
	items, err := getCachedSportsCatalog(repository)
	if err != nil {
		return httpx.Internal("failed to list sports", err)
	}
	return httpx.WriteJSON(w, stdhttp.StatusOK, sportCatalogResponse{Items: items})
}

// getCachedSportsCatalog returns the cached catalog or rebuilds it when stale.
func getCachedSportsCatalog(repository domain.ReadRepository) ([]sportCatalogItem, error) {
	sportsCatalogCache.mu.RLock()
	if time.Since(sportsCatalogCache.lastRefreshed) < sportsCatalogCacheTTL && sportsCatalogCache.items != nil {
		items := sportsCatalogCache.items
		sportsCatalogCache.mu.RUnlock()
		return items, nil
	}
	sportsCatalogCache.mu.RUnlock()

	// Cache miss — rebuild under write lock.
	sportsCatalogCache.mu.Lock()
	defer sportsCatalogCache.mu.Unlock()

	// Double-check: another goroutine may have refreshed while we waited.
	if time.Since(sportsCatalogCache.lastRefreshed) < sportsCatalogCacheTTL && sportsCatalogCache.items != nil {
		return sportsCatalogCache.items, nil
	}

	items, err := buildSportsCatalog(repository)
	if err != nil {
		return nil, err
	}
	sportsCatalogCache.items = items
	sportsCatalogCache.lastRefreshed = time.Now()
	slog.Info("sports catalog cache refreshed", "count", len(items))
	return items, nil
}

// buildSportsCatalog performs the full fixture scan and aggregation.
func buildSportsCatalog(repository domain.ReadRepository) ([]sportCatalogItem, error) {
	fixtures, err := listAllFixtures(repository)
	if err != nil {
		return nil, err
	}

	type accumulator struct {
		name      string
		events    int
		leagueSet map[string]struct{}
	}

	counts := map[string]*accumulator{}
	for _, fixture := range fixtures {
		sportKey := fixtureSportKey(fixture)
		leagueKey := fixtureLeagueKey(fixture)
		entry, ok := counts[sportKey]
		if !ok {
			entry = &accumulator{name: sportDisplayName(sportKey), leagueSet: map[string]struct{}{}}
			counts[sportKey] = entry
		}
		entry.events++
		if leagueKey != "" {
			entry.leagueSet[leagueKey] = struct{}{}
		}
	}

	items := make([]sportCatalogItem, 0, len(counts))
	for sportKey, entry := range counts {
		items = append(items, sportCatalogItem{
			SportKey:    sportKey,
			Name:        entry.name,
			LeagueCount: len(entry.leagueSet),
			EventCount:  entry.events,
		})
	}
	if len(items) == 0 {
		items = append(items, sportCatalogItem{SportKey: "esports", Name: sportDisplayName("esports")})
	}

	sort.SliceStable(items, func(i, j int) bool {
		return items[i].SportKey < items[j].SportKey
	})
	return items, nil
}

func listSportLeagues(w stdhttp.ResponseWriter, repository domain.ReadRepository, sportKey string) error {
	items, err := getCachedSportLeagues(repository, sportKey)
	if err != nil {
		return httpx.Internal("failed to list sport leagues", err)
	}
	if items == nil {
		return httpx.NotFound("sport not found")
	}
	return httpx.WriteJSON(w, stdhttp.StatusOK, sportLeaguesResponse{SportKey: sportKey, Items: items})
}

// getCachedSportLeagues returns cached league data for a sport, or rebuilds all leagues when stale.
func getCachedSportLeagues(repository domain.ReadRepository, sportKey string) ([]sportLeagueItem, error) {
	sportsLeagueCache.mu.RLock()
	if time.Since(sportsLeagueCache.lastRefreshed) < sportsCatalogCacheTTL && sportsLeagueCache.data != nil {
		items, ok := sportsLeagueCache.data[sportKey]
		sportsLeagueCache.mu.RUnlock()
		if !ok {
			return nil, nil // sport not found
		}
		return items, nil
	}
	sportsLeagueCache.mu.RUnlock()

	sportsLeagueCache.mu.Lock()
	defer sportsLeagueCache.mu.Unlock()

	// Double-check after acquiring write lock.
	if time.Since(sportsLeagueCache.lastRefreshed) < sportsCatalogCacheTTL && sportsLeagueCache.data != nil {
		items, ok := sportsLeagueCache.data[sportKey]
		if !ok {
			return nil, nil
		}
		return items, nil
	}

	data, err := buildAllSportLeagues(repository)
	if err != nil {
		return nil, err
	}
	sportsLeagueCache.data = data
	sportsLeagueCache.lastRefreshed = time.Now()
	slog.Info("sports league cache refreshed", "count", len(data))

	items, ok := data[sportKey]
	if !ok {
		return nil, nil
	}
	return items, nil
}

// buildAllSportLeagues scans all fixtures and groups leagues by sport.
func buildAllSportLeagues(repository domain.ReadRepository) (map[string][]sportLeagueItem, error) {
	fixtures, err := listAllFixtures(repository)
	if err != nil {
		return nil, err
	}

	type accumulator struct {
		name   string
		events int
	}

	// sportKey -> leagueKey -> accumulator
	bySport := map[string]map[string]*accumulator{}

	for _, fixture := range fixtures {
		sk := fixtureSportKey(fixture)
		leagueKey := fixtureLeagueKey(fixture)
		leagueName := fixtureLeagueName(fixture)

		leagues, ok := bySport[sk]
		if !ok {
			leagues = map[string]*accumulator{}
			bySport[sk] = leagues
		}
		entry, ok := leagues[leagueKey]
		if !ok {
			entry = &accumulator{name: leagueName}
			leagues[leagueKey] = entry
		}
		entry.events++
	}

	result := make(map[string][]sportLeagueItem, len(bySport))
	for sk, leagues := range bySport {
		items := make([]sportLeagueItem, 0, len(leagues))
		for leagueKey, entry := range leagues {
			items = append(items, sportLeagueItem{
				LeagueKey:  leagueKey,
				Name:       entry.name,
				EventCount: entry.events,
			})
		}
		sort.SliceStable(items, func(i, j int) bool {
			if items[i].Name == items[j].Name {
				return items[i].LeagueKey < items[j].LeagueKey
			}
			return items[i].Name < items[j].Name
		})
		result[sk] = items
	}
	return result, nil
}

func listSportEvents(w stdhttp.ResponseWriter, r *stdhttp.Request, repository domain.ReadRepository, sportKey string) error {
	page, err := parsePageRequest(r, allowedFixtureSortFields)
	if err != nil {
		return err
	}

	statusFilter := strings.ToLower(strings.TrimSpace(r.URL.Query().Get("status")))
	if statusFilter != "" {
		if _, ok := allowedEventStatuses[statusFilter]; !ok {
			return httpx.BadRequest(
				"status must be one of scheduled,in_play,finished,cancelled,suspended",
				map[string]any{"field": "status", "value": statusFilter},
			)
		}
	}

	leagueFilter := strings.TrimSpace(r.URL.Query().Get("leagueKey"))
	leagueFilter = slugifyStable(leagueFilter)

	fixtures, err := listAllFixtures(repository)
	if err != nil {
		return httpx.Internal("failed to list sport events", err)
	}

	marketCounts, err := marketCountByFixture(repository)
	if err != nil {
		return httpx.Internal("failed to list sport events markets", err)
	}

	events := make([]sportEventItem, 0, len(fixtures))
	for _, fixture := range fixtures {
		if fixtureSportKey(fixture) != sportKey {
			continue
		}
		if leagueFilter != "" && fixtureLeagueKey(fixture) != leagueFilter {
			continue
		}
		status := fixtureStatus(fixture)
		if statusFilter != "" && status != statusFilter {
			continue
		}
		events = append(events, toSportEventItem(fixture, sportKey, marketCounts[fixture.ID]))
	}

	sortSportEvents(events, page.SortBy, page.SortDir)
	window, pagination := paginateSportEventItems(events, page)

	return httpx.WriteJSON(w, stdhttp.StatusOK, sportEventsResponse{
		SportKey:   sportKey,
		Items:      window,
		Pagination: pagination,
	})
}

func getSportEventByKey(w stdhttp.ResponseWriter, repository domain.ReadRepository, sportKey string, eventKey string) error {
	fixture, err := findFixtureByEventKey(repository, sportKey, eventKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return httpx.NotFound("event not found")
		}
		return httpx.Internal("failed to fetch event", err)
	}

	markets, _, err := repository.ListMarkets(domain.MarketFilter{FixtureID: fixture.ID}, domain.PageRequest{
		Page:     1,
		PageSize: maxSportsScanPageSize,
		SortBy:   "startsAt",
		SortDir:  "asc",
	})
	if err != nil {
		return httpx.Internal("failed to fetch event markets", err)
	}

	return httpx.WriteJSON(w, stdhttp.StatusOK, toSportEventItem(fixture, sportKey, len(markets)))
}

func listSportEventMarkets(w stdhttp.ResponseWriter, r *stdhttp.Request, repository domain.ReadRepository, sportKey string, eventKey string) error {
	fixture, err := findFixtureByEventKey(repository, sportKey, eventKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			return httpx.NotFound("event not found")
		}
		return httpx.Internal("failed to fetch event", err)
	}

	page, err := parsePageRequest(r, allowedMarketSortFields)
	if err != nil {
		return err
	}

	status := strings.TrimSpace(r.URL.Query().Get("status"))
	if status != "" {
		if _, ok := allowedMarketStatuses[strings.ToLower(status)]; !ok {
			return httpx.BadRequest(
				"status must be one of open,suspended,closed,settled,cancelled",
				map[string]any{"field": "status", "value": status},
			)
		}
	}

	items, pagination, err := repository.ListMarkets(domain.MarketFilter{
		FixtureID: fixture.ID,
		Status:    status,
	}, page)
	if err != nil {
		return httpx.Internal("failed to list event markets", err)
	}

	return httpx.WriteJSON(w, stdhttp.StatusOK, sportEventMarketsResponse{
		SportKey:   sportKey,
		EventKey:   fixtureEventKey(fixture),
		FixtureID:  fixture.ID,
		Items:      items,
		Pagination: pagination,
	})
}

func listAllFixtures(repository domain.ReadRepository) ([]domain.Fixture, error) {
	all := make([]domain.Fixture, 0, maxSportsScanPageSize)
	for page := 1; ; page++ {
		items, meta, err := repository.ListFixtures(domain.FixtureFilter{}, domain.PageRequest{
			Page:     page,
			PageSize: maxSportsScanPageSize,
			SortBy:   "startsAt",
			SortDir:  "asc",
		})
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
		if !meta.HasNext || len(items) == 0 {
			break
		}
	}
	return all, nil
}

func listAllMarkets(repository domain.ReadRepository) ([]domain.Market, error) {
	all := make([]domain.Market, 0, maxSportsScanPageSize)
	for page := 1; ; page++ {
		items, meta, err := repository.ListMarkets(domain.MarketFilter{}, domain.PageRequest{
			Page:     page,
			PageSize: maxSportsScanPageSize,
			SortBy:   "startsAt",
			SortDir:  "asc",
		})
		if err != nil {
			return nil, err
		}
		all = append(all, items...)
		if !meta.HasNext || len(items) == 0 {
			break
		}
	}
	return all, nil
}

func marketCountByFixture(repository domain.ReadRepository) (map[string]int, error) {
	markets, err := listAllMarkets(repository)
	if err != nil {
		return nil, err
	}
	counts := make(map[string]int, len(markets))
	for _, market := range markets {
		counts[market.FixtureID]++
	}
	return counts, nil
}

func findFixtureByEventKey(repository domain.ReadRepository, sportKey string, eventKey string) (domain.Fixture, error) {
	fixtures, err := listAllFixtures(repository)
	if err != nil {
		return domain.Fixture{}, err
	}

	needle := strings.TrimSpace(eventKey)
	for _, fixture := range fixtures {
		if fixtureSportKey(fixture) != sportKey {
			continue
		}
		if fixtureEventKey(fixture) == needle || fixture.ID == needle {
			return fixture, nil
		}
	}
	return domain.Fixture{}, domain.ErrNotFound
}

func fixtureSportKey(fixture domain.Fixture) string {
	if normalized, ok := normalizeSportKey(fixture.SportKey); ok {
		return normalized
	}

	lowerTournament := strings.ToLower(strings.TrimSpace(fixture.Tournament))
	switch {
	case strings.Contains(lowerTournament, "mlb"),
		strings.Contains(lowerTournament, "major league baseball"):
		return "mlb"
	case strings.Contains(lowerTournament, "nfl"),
		strings.Contains(lowerTournament, "national football league"):
		return "nfl"
	case strings.Contains(lowerTournament, "ncaa baseball"),
		strings.Contains(lowerTournament, "college baseball"):
		return "ncaa_baseball"
	case strings.Contains(lowerTournament, "ncaa basketball"),
		strings.Contains(lowerTournament, "college basketball"):
		return "ncaa_basketball"
	case strings.Contains(lowerTournament, "nba"),
		strings.Contains(lowerTournament, "national basketball association"):
		return "nba"
	case strings.Contains(lowerTournament, "nhl"),
		strings.Contains(lowerTournament, "national hockey league"):
		return "nhl"
	case strings.Contains(lowerTournament, "ufc"),
		strings.Contains(lowerTournament, "mma"),
		strings.Contains(lowerTournament, "mixed martial"):
		return "ufc"
	case strings.Contains(lowerTournament, "boxing"),
		strings.Contains(lowerTournament, "professional boxing"):
		return "boxing"
	case strings.Contains(lowerTournament, "tennis"),
		strings.Contains(lowerTournament, "wimbledon"),
		strings.Contains(lowerTournament, "us open"),
		strings.Contains(lowerTournament, "french open"),
		strings.Contains(lowerTournament, "atp"),
		strings.Contains(lowerTournament, "wta"):
		return "tennis"
	case strings.Contains(lowerTournament, "golf"),
		strings.Contains(lowerTournament, "pga"):
		return "golf"
	case strings.Contains(lowerTournament, "cricket"),
		strings.Contains(lowerTournament, "ipl"),
		strings.Contains(lowerTournament, "test match"):
		return "cricket"
	case strings.Contains(lowerTournament, "soccer"),
		strings.Contains(lowerTournament, "football"),
		strings.Contains(lowerTournament, "premier league"),
		strings.Contains(lowerTournament, "la liga"),
		strings.Contains(lowerTournament, "serie a"),
		strings.Contains(lowerTournament, "bundesliga"),
		strings.Contains(lowerTournament, "fifa"):
		return "soccer"
	case strings.Contains(lowerTournament, "rugby"):
		return "rugby"
	default:
		return "esports"
	}
}

func sportDisplayName(sportKey string) string {
	for _, descriptor := range sportDescriptors {
		if descriptor.Key == sportKey {
			return descriptor.Name
		}
	}
	return strings.ToUpper(strings.ReplaceAll(sportKey, "_", " "))
}

func normalizeSportKey(raw string) (string, bool) {
	normalized := strings.ToLower(strings.TrimSpace(raw))
	normalized = strings.ReplaceAll(normalized, "-", "_")
	normalized = strings.ReplaceAll(normalized, " ", "_")
	if normalized == "" {
		return "", false
	}

	for _, descriptor := range sportDescriptors {
		if descriptor.Key == normalized {
			return descriptor.Key, true
		}
		for _, alias := range descriptor.Aliases {
			aliasKey := strings.ToLower(strings.TrimSpace(alias))
			aliasKey = strings.ReplaceAll(aliasKey, "-", "_")
			aliasKey = strings.ReplaceAll(aliasKey, " ", "_")
			if aliasKey == normalized {
				return descriptor.Key, true
			}
		}
	}
	return "", false
}

func fixtureLeagueKey(fixture domain.Fixture) string {
	if key := slugifyStable(fixture.LeagueKey); key != "" {
		return key
	}
	if key := slugifyStable(fixture.Tournament); key != "" {
		return key
	}
	return "unknown-league"
}

func fixtureLeagueName(fixture domain.Fixture) string {
	if value := strings.TrimSpace(fixture.Tournament); value != "" {
		return value
	}
	if value := strings.TrimSpace(fixture.LeagueKey); value != "" {
		return value
	}
	return "Unknown League"
}

func fixtureSeasonKey(fixture domain.Fixture) string {
	if value := strings.TrimSpace(fixture.SeasonKey); value != "" {
		return value
	}
	parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(fixture.StartsAt))
	if err != nil {
		return ""
	}
	return fmt.Sprintf("%d", parsed.UTC().Year())
}

func fixtureEventKey(fixture domain.Fixture) string {
	if value := strings.TrimSpace(fixture.EventKey); value != "" {
		return value
	}
	if value := strings.TrimSpace(fixture.ID); value != "" {
		return value
	}
	leagueKey := fixtureLeagueKey(fixture)
	if leagueKey == "" {
		leagueKey = "event"
	}
	start := slugifyStable(fixture.StartsAt)
	if start == "" {
		start = "unknown"
	}
	return fmt.Sprintf("%s-%s", leagueKey, start)
}

func fixtureStatus(fixture domain.Fixture) string {
	status := strings.ToLower(strings.TrimSpace(fixture.Status))
	if status == "" {
		return "scheduled"
	}
	if _, ok := allowedEventStatuses[status]; ok {
		return status
	}
	return "scheduled"
}

func toSportEventItem(fixture domain.Fixture, sportKey string, marketCount int) sportEventItem {
	return sportEventItem{
		EventKey:          fixtureEventKey(fixture),
		FixtureID:         fixture.ID,
		SportKey:          sportKey,
		LeagueKey:         fixtureLeagueKey(fixture),
		LeagueName:        fixtureLeagueName(fixture),
		SeasonKey:         fixtureSeasonKey(fixture),
		Name:              strings.TrimSpace(fixture.HomeTeam + " vs " + fixture.AwayTeam),
		HomeTeam:          fixture.HomeTeam,
		AwayTeam:          fixture.AwayTeam,
		StartTime:         fixture.StartsAt,
		Status:            fixtureStatus(fixture),
		MarketsTotalCount: marketCount,
	}
}

func sortSportEvents(items []sportEventItem, sortBy string, sortDir string) {
	field := normalizeSortField(sortBy)
	if field == "" {
		field = "startsAt"
	}
	desc := strings.EqualFold(sortDir, "desc")

	sort.SliceStable(items, func(i, j int) bool {
		left := sportEventSortValue(items[i], field)
		right := sportEventSortValue(items[j], field)
		if left == right {
			if desc {
				return items[i].EventKey > items[j].EventKey
			}
			return items[i].EventKey < items[j].EventKey
		}
		if desc {
			return left > right
		}
		return left < right
	})
}

func sportEventSortValue(item sportEventItem, field string) string {
	switch field {
	case "tournament":
		return strings.ToLower(item.LeagueName)
	case "fixtureName":
		return strings.ToLower(item.Name)
	case "homeTeam":
		return strings.ToLower(item.HomeTeam)
	case "awayTeam":
		return strings.ToLower(item.AwayTeam)
	default:
		return strings.ToLower(item.StartTime)
	}
}

func paginateSportEventItems(items []sportEventItem, req domain.PageRequest) ([]sportEventItem, domain.PageMeta) {
	page := req.Page
	if page <= 0 {
		page = 1
	}
	pageSize := req.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	total := len(items)
	start := (page - 1) * pageSize
	if start >= total {
		return []sportEventItem{}, domain.PageMeta{Page: page, PageSize: pageSize, Total: total, HasNext: false}
	}
	end := start + pageSize
	if end > total {
		end = total
	}
	window := make([]sportEventItem, end-start)
	copy(window, items[start:end])
	return window, domain.PageMeta{Page: page, PageSize: pageSize, Total: total, HasNext: end < total}
}
