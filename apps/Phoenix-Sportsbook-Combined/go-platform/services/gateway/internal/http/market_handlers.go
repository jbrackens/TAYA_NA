package http

import (
	"errors"
	"fmt"
	stdhttp "net/http"
	"sort"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/platform/transport/httpx"
)

var (
	allowedFixtureSortFields = map[string]struct{}{
		"startsAt":    {},
		"startTime":   {},
		"tournament":  {},
		"fixtureName": {},
		"homeTeam":    {},
		"awayTeam":    {},
	}
	allowedMarketSortFields = map[string]struct{}{
		"startsAt":   {},
		"startTime":  {},
		"name":       {},
		"marketName": {},
		"status":     {},
		"fixtureId":  {},
	}
	allowedMarketStatuses = map[string]struct{}{
		"open":      {},
		"suspended": {},
		"closed":    {},
		"settled":   {},
		"cancelled": {},
	}
)

func registerMarketRoutes(mux *stdhttp.ServeMux, repository domain.ReadRepository) {
	mux.Handle("/api/v1/fixtures", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		page, err := parsePageRequest(r, allowedFixtureSortFields)
		if err != nil {
			return err
		}

		items, pagination, err := repository.ListFixtures(domain.FixtureFilter{
			Tournament: r.URL.Query().Get("tournament"),
		}, page)
		if err != nil {
			return httpx.Internal("failed to list fixtures", err)
		}

		legacyItems := make([]legacyFixtureNavigation, 0, len(items))
		for _, item := range items {
			fixtureMarkets, _, err := repository.ListMarkets(domain.MarketFilter{
				FixtureID: item.ID,
			}, domain.PageRequest{
				Page:     1,
				PageSize: 500,
				SortBy:   "startsAt",
				SortDir:  "asc",
			})
			if err != nil {
				return httpx.Internal("failed to list fixture markets", err)
			}
			legacyItems = append(legacyItems, mapLegacyFixtureNavigation(item, fixtureMarkets))
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, toLegacyPagination(legacyItems, pagination))
	}))

	mux.Handle("/api/v1/fixtures/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		id := strings.TrimPrefix(r.URL.Path, "/api/v1/fixtures/")
		if id == "" {
			return httpx.NotFound("fixture not found")
		}

		f, err := repository.GetFixtureByID(id)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return httpx.NotFound("fixture not found")
			}
			return httpx.Internal("failed to fetch fixture", err)
		}

		fixtureMarkets, _, err := repository.ListMarkets(domain.MarketFilter{
			FixtureID: f.ID,
		}, domain.PageRequest{
			Page:     1,
			PageSize: 500,
			SortBy:   "startsAt",
			SortDir:  "asc",
		})
		if err != nil {
			return httpx.Internal("failed to list fixture markets", err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, mapLegacyFixtureNavigation(f, fixtureMarkets))
	}))

	mux.Handle("/api/v1/markets", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
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
			FixtureID: r.URL.Query().Get("fixtureId"),
			Status:    status,
		}, page)
		if err != nil {
			return httpx.Internal("failed to list markets", err)
		}

		// Batch-fetch unique fixtures to avoid N+1 queries
		fixtureCache := make(map[string]domain.Fixture, len(items))
		for _, item := range items {
			if _, exists := fixtureCache[item.FixtureID]; exists {
				continue
			}
			fixture, err := repository.GetFixtureByID(item.FixtureID)
			if err != nil {
				if errors.Is(err, domain.ErrNotFound) {
					fixture = domain.Fixture{
						ID:         item.FixtureID,
						Tournament: "Unknown Tournament",
						HomeTeam:   "Home",
						AwayTeam:   "Away",
						StartsAt:   item.StartsAt,
					}
				} else {
					return httpx.Internal("failed to fetch fixture for market response", err)
				}
			}
			fixtureCache[item.FixtureID] = fixture
		}

		legacyItems := make([]legacyMarketNavigation, 0, len(items))
		for _, item := range items {
			legacyItems = append(legacyItems, mapLegacyMarketNavigation(item, fixtureCache[item.FixtureID]))
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, toLegacyPagination(legacyItems, pagination))
	}))

	mux.Handle("/api/v1/markets/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		id := strings.TrimPrefix(r.URL.Path, "/api/v1/markets/")
		if id == "" {
			return httpx.NotFound("market not found")
		}

		m, err := repository.GetMarketByID(id)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return httpx.NotFound("market not found")
			}
			return httpx.Internal("failed to fetch market", err)
		}

		fixture, err := repository.GetFixtureByID(m.FixtureID)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				fixture = domain.Fixture{
					ID:         m.FixtureID,
					Tournament: "Unknown Tournament",
					HomeTeam:   "Home",
					AwayTeam:   "Away",
					StartsAt:   m.StartsAt,
				}
			} else {
				return httpx.Internal("failed to fetch fixture for market response", err)
			}
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, mapLegacyMarketNavigation(m, fixture))
	}))
}

func parsePageRequest(r *stdhttp.Request, allowedSortFields map[string]struct{}) (domain.PageRequest, error) {
	page := 1
	pageSize := 20
	sortBy := strings.TrimSpace(firstQueryValue(r, "sortBy", "sorting.field"))
	sortDir := strings.TrimSpace(firstQueryValue(r, "sortDir", "sorting.order"))
	sortBy = normalizeSortField(sortBy)

	if raw := strings.TrimSpace(firstQueryValue(r, "page", "pagination.currentPage")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			return domain.PageRequest{}, httpx.BadRequest(
				"page must be a positive integer",
				map[string]any{"field": "page", "value": raw},
			)
		}
		page = parsed
	}

	if raw := strings.TrimSpace(firstQueryValue(r, "pageSize", "pagination.itemsPerPage")); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			return domain.PageRequest{}, httpx.BadRequest(
				"pageSize must be a positive integer",
				map[string]any{"field": "pageSize", "value": raw},
			)
		}
		pageSize = parsed
	}

	if sortBy != "" {
		if _, ok := allowedSortFields[sortBy]; !ok {
			allowed := make([]string, 0, len(allowedSortFields))
			for field := range allowedSortFields {
				allowed = append(allowed, field)
			}
			sort.Strings(allowed)
			return domain.PageRequest{}, httpx.BadRequest(
				fmt.Sprintf("sortBy must be one of %s", strings.Join(allowed, ",")),
				map[string]any{"field": "sortBy", "value": sortBy},
			)
		}
	}

	if sortDir != "" && !strings.EqualFold(sortDir, "asc") && !strings.EqualFold(sortDir, "desc") {
		return domain.PageRequest{}, httpx.BadRequest(
			"sortDir must be either asc or desc",
			map[string]any{"field": "sortDir", "value": sortDir},
		)
	}

	return domain.PageRequest{
		Page:     page,
		PageSize: pageSize,
		SortBy:   sortBy,
		SortDir:  strings.ToLower(sortDir),
	}, nil
}

func firstQueryValue(r *stdhttp.Request, keys ...string) string {
	for _, key := range keys {
		if value := r.URL.Query().Get(key); strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func normalizeSortField(field string) string {
	switch strings.ToLower(strings.TrimSpace(field)) {
	case "starttime":
		return "startsAt"
	case "marketname":
		return "name"
	case "fixturename":
		return "tournament"
	default:
		return field
	}
}
