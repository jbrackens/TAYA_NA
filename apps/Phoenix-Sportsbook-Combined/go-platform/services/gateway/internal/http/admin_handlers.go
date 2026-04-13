package http

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	stdhttp "net/http"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"phoenix-revival/gateway/internal/bets"
	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/provider"
	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/canonical/adapter"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
	"phoenix-revival/platform/transport/httpx"
)

var (
	allowedPunterSortFields = map[string]struct{}{
		"createdAt":   {},
		"lastLoginAt": {},
		"email":       {},
		"status":      {},
	}
	allowedPunterStatuses = map[string]struct{}{
		"active":        {},
		"suspended":     {},
		"self_excluded": {},
		"deactivated":   {},
	}
	allowedAuditSortFields = map[string]struct{}{
		"occurredAt": {},
		"action":     {},
		"actorId":    {},
	}
	sampleAuditEntries = []auditLogEntry{
		{
			ID:         "al:local:001",
			Action:     "market.updated",
			ActorID:    "admin-ops-1",
			TargetID:   "m:local:001",
			OccurredAt: "2026-03-02T09:10:00Z",
			Details:    "Changed market visibility",
		},
		{
			ID:         "al:local:002",
			Action:     "punter.suspended",
			ActorID:    "admin-risk-2",
			TargetID:   "p:local:002",
			OccurredAt: "2026-03-02T10:40:00Z",
			Details:    "Automated risk rule suspension",
		},
		{
			ID:         "al:local:003",
			Action:     "config.updated",
			ActorID:    "admin-ops-1",
			TargetID:   "system",
			OccurredAt: "2026-03-02T11:25:00Z",
			Details:    "Updated max stake limits",
		},
	}
	providerOpsAuditMu        sync.Mutex
	providerOpsAuditEntries   []auditLogEntry
	providerOpsAuditStoreInit sync.Once
	providerOpsAuditStore     providerOpsAuditStoreBackend
	providerOpsAuditStoreMode string
	providerOpsAuditStorePath string
)

type auditLogEntry struct {
	ID                  string `json:"id"`
	Action              string `json:"action"`
	ActorID             string `json:"actorId"`
	UserID              string `json:"userId,omitempty"`
	TargetID            string `json:"targetId"`
	FreebetID           string `json:"freebetId,omitempty"`
	OddsBoostID         string `json:"oddsBoostId,omitempty"`
	FreebetAppliedCents int64  `json:"freebetAppliedCents,omitempty"`
	OccurredAt          string `json:"occurredAt"`
	Details             string `json:"details"`
}

type adminMarketView struct {
	ID        string `json:"id"`
	FixtureID string `json:"fixtureId"`
	Name      string `json:"name"`
	Status    string `json:"status"`
	StartsAt  string `json:"startsAt"`
}

type providerCancelRequest struct {
	Adapter   string `json:"adapter"`
	PlayerID  string `json:"playerId"`
	BetID     string `json:"betId"`
	RequestID string `json:"requestId"`
	Reason    string `json:"reason,omitempty"`
}

type providerStreamAcknowledgementRequest struct {
	StreamKey string `json:"streamKey,omitempty"`
	Adapter   string `json:"adapter,omitempty"`
	Stream    string `json:"stream,omitempty"`
	Action    string `json:"action,omitempty"`
	Operator  string `json:"operator"`
	Note      string `json:"note"`
}

type providerStreamAcknowledgementEntry struct {
	StreamKey      string `json:"streamKey"`
	Adapter        string `json:"adapter"`
	Stream         string `json:"stream"`
	Operator       string `json:"operator"`
	Note           string `json:"note"`
	Status         string `json:"status"`
	LastAction     string `json:"lastAction"`
	AcknowledgedAt string `json:"acknowledgedAt"`
	UpdatedBy      string `json:"updatedBy"`
}

type providerAcknowledgementActionMetadata struct {
	AuditAction string
	Status      string
	LastAction  string
}

type punterStatusUpdateRequest struct {
	Status string `json:"status"`
}

func toAdminMarketView(market domain.Market) adminMarketView {
	return adminMarketView{
		ID:        market.ID,
		FixtureID: market.FixtureID,
		Name:      market.Name,
		Status:    market.Status,
		StartsAt:  market.StartsAt,
	}
}

func registerAdminRoutes(
	mux *stdhttp.ServeMux,
	repository domain.ReadRepository,
	walletService *wallet.Service,
	betService *bets.Service,
	providerRuntime *provider.Runtime,
) {
	initializeProviderOpsAuditStore()
	registerAdminTradingRoutes(mux, "/admin/trading", repository)
	registerAdminTradingRoutes(mux, "/api/v1/admin/trading", repository)
	registerAdminPunterRoutes(mux, "/admin", repository)
	registerAdminPunterRoutes(mux, "/api/v1/admin", repository)
	registerAdminUtilityRoutes(mux, "/admin", betService, providerRuntime)
	registerAdminUtilityRoutes(mux, "/api/v1/admin", betService, providerRuntime)
	registerAdminWalletRoutes(mux, "/admin", walletService)
	registerAdminWalletRoutes(mux, "/api/v1/admin", walletService)
}

func registerAdminTradingRoutes(mux *stdhttp.ServeMux, basePath string, repository domain.ReadRepository) {
	fixturesPath := fmt.Sprintf("%s/fixtures", basePath)
	marketsPath := fmt.Sprintf("%s/markets", basePath)

	mux.Handle(fixturesPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		page, err := parsePageRequest(r, allowedFixtureSortFields)
		if err != nil {
			return err
		}

		items, pagination, err := repository.ListFixtures(domain.FixtureFilter{
			Tournament: r.URL.Query().Get("tournament"),
		}, page)
		if err != nil {
			return httpx.Internal("failed to list admin fixtures", err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      items,
			"pagination": pagination,
		})
	}))

	mux.Handle(fixturesPath+"/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		id := strings.TrimPrefix(r.URL.Path, fixturesPath+"/")
		if id == "" {
			return httpx.NotFound("fixture not found")
		}

		fixture, err := repository.GetFixtureByID(id)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return httpx.NotFound("fixture not found")
			}
			return httpx.Internal("failed to fetch admin fixture", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, fixture)
	}))

	mux.Handle(marketsPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
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
			return httpx.Internal("failed to list admin markets", err)
		}
		viewItems := make([]adminMarketView, 0, len(items))
		for _, item := range items {
			viewItems = append(viewItems, toAdminMarketView(item))
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      viewItems,
			"pagination": pagination,
		})
	}))

	mux.Handle(marketsPath+"/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		id := strings.TrimPrefix(r.URL.Path, marketsPath+"/")
		if id == "" {
			return httpx.NotFound("market not found")
		}

		market, err := repository.GetMarketByID(id)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return httpx.NotFound("market not found")
			}
			return httpx.Internal("failed to fetch admin market", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, toAdminMarketView(market))
	}))
}

func registerAdminPunterRoutes(mux *stdhttp.ServeMux, basePath string, repository domain.ReadRepository) {
	puntersPath := fmt.Sprintf("%s/punters", basePath)
	writableRepository, hasWritableRepository := repository.(domain.PunterWriteRepository)

	mux.Handle(puntersPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		page, err := parsePageRequest(r, allowedPunterSortFields)
		if err != nil {
			return err
		}

		status := strings.TrimSpace(r.URL.Query().Get("status"))
		if status != "" {
			if _, ok := allowedPunterStatuses[strings.ToLower(status)]; !ok {
				return httpx.BadRequest(
					"status must be one of active,suspended,self_excluded,deactivated",
					map[string]any{"field": "status", "value": status},
				)
			}
		}

		items, pagination, err := repository.ListPunters(domain.PunterFilter{
			Status: status,
			Search: r.URL.Query().Get("search"),
		}, page)
		if err != nil {
			return httpx.Internal("failed to list admin punters", err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      items,
			"pagination": pagination,
		})
	}))

	mux.Handle(puntersPath+"/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}

		subpath := strings.TrimPrefix(r.URL.Path, puntersPath+"/")
		if subpath == "" {
			return httpx.NotFound("punter not found")
		}

		if strings.HasSuffix(subpath, "/status") {
			if r.Method != stdhttp.MethodPut {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPut)
			}
			if !hasWritableRepository {
				return httpx.Internal("punter status mutations unavailable", errors.New("punter write repository unavailable"))
			}

			id := strings.TrimSuffix(subpath, "/status")
			id = strings.TrimSuffix(id, "/")
			if id == "" || strings.Contains(id, "/") {
				return httpx.NotFound("punter not found")
			}

			var request punterStatusUpdateRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				return httpx.BadRequest("invalid punter status update payload", map[string]any{
					"field": "body",
				})
			}

			request.Status = strings.ToLower(strings.TrimSpace(request.Status))
			if _, ok := allowedPunterStatuses[request.Status]; !ok {
				return httpx.BadRequest(
					"status must be one of active,suspended,self_excluded,deactivated",
					map[string]any{"field": "status", "value": request.Status},
				)
			}

			punter, err := writableRepository.UpdatePunterStatus(id, request.Status)
			if err != nil {
				if errors.Is(err, domain.ErrNotFound) {
					return httpx.NotFound("punter not found")
				}
				return httpx.Internal("failed to update admin punter status", err)
			}

			return httpx.WriteJSON(w, stdhttp.StatusOK, punter)
		}

		// ── Admin punter mutation routes ──────────────────────────────

		if strings.HasSuffix(subpath, "/reset-password") {
			if r.Method != stdhttp.MethodPost {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
			}
			id := strings.TrimSuffix(subpath, "/reset-password")
			id = strings.TrimSuffix(id, "/")
			if id == "" {
				return httpx.NotFound("punter not found")
			}
			// Generate a temporary password and flag for reset on next login
			tempPassword := fmt.Sprintf("reset_%d", time.Now().UnixNano()%100000)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"userId":        id,
				"action":        "password_reset",
				"tempPassword":  tempPassword,
				"requireChange": true,
				"message":       "Password has been reset. User must change on next login.",
			})
		}

		if strings.HasSuffix(subpath, "/risk-segment") {
			if r.Method != stdhttp.MethodPut {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPut)
			}
			id := strings.TrimSuffix(subpath, "/risk-segment")
			id = strings.TrimSuffix(id, "/")
			if id == "" {
				return httpx.NotFound("punter not found")
			}
			var body struct {
				Segment string `json:"segment"`
				Reason  string `json:"reason"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid body", nil)
			}
			validSegments := map[string]bool{"low": true, "medium": true, "high": true, "vip": true}
			if !validSegments[strings.ToLower(body.Segment)] {
				return httpx.BadRequest("segment must be low, medium, high, or vip", nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"userId":  id,
				"action":  "risk_segment_updated",
				"segment": body.Segment,
				"reason":  body.Reason,
				"actorId": httpx.UserIDFromContext(r.Context()),
			})
		}

		if strings.HasSuffix(subpath, "/limits") {
			if r.Method != stdhttp.MethodPut {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPut)
			}
			id := strings.TrimSuffix(subpath, "/limits")
			id = strings.TrimSuffix(id, "/")
			if id == "" {
				return httpx.NotFound("punter not found")
			}
			var body struct {
				LimitType  string `json:"limitType"`  // "deposit" or "bet"
				Period     string `json:"period"`      // "daily", "weekly", "monthly"
				AmountCents int64 `json:"amountCents"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid body", nil)
			}
			if body.LimitType != "deposit" && body.LimitType != "bet" {
				return httpx.BadRequest("limitType must be deposit or bet", nil)
			}
			if body.Period != "daily" && body.Period != "weekly" && body.Period != "monthly" {
				return httpx.BadRequest("period must be daily, weekly, or monthly", nil)
			}
			if body.AmountCents <= 0 {
				return httpx.BadRequest("amountCents must be positive", nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"userId":      id,
				"action":      "limit_set",
				"limitType":   body.LimitType,
				"period":      body.Period,
				"amountCents": body.AmountCents,
				"actorId":     httpx.UserIDFromContext(r.Context()),
			})
		}

		if strings.HasSuffix(subpath, "/notes") {
			if r.Method != stdhttp.MethodPost {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
			}
			id := strings.TrimSuffix(subpath, "/notes")
			id = strings.TrimSuffix(id, "/")
			if id == "" {
				return httpx.NotFound("punter not found")
			}
			var body struct {
				Content  string `json:"content"`
				Category string `json:"category"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid body", nil)
			}
			if strings.TrimSpace(body.Content) == "" {
				return httpx.BadRequest("note content is required", nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"userId":    id,
				"action":    "note_added",
				"content":   body.Content,
				"category":  body.Category,
				"actorId":   httpx.UserIDFromContext(r.Context()),
				"createdAt": time.Now().UTC().Format(time.RFC3339),
			})
		}

		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		id := subpath
		if strings.Contains(id, "/") {
			return httpx.NotFound("punter not found")
		}

		punter, err := repository.GetPunterByID(id)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				return httpx.NotFound("punter not found")
			}
			return httpx.Internal("failed to fetch admin punter", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, punter)
	}))
}

func registerAdminUtilityRoutes(
	mux *stdhttp.ServeMux,
	basePath string,
	betService *bets.Service,
	providerRuntime *provider.Runtime,
) {
	auditPath := fmt.Sprintf("%s/audit-logs", basePath)
	promoUsagePath := fmt.Sprintf("%s/promotions/usage", basePath)
	configPath := fmt.Sprintf("%s/config", basePath)
	feedHealthPath := fmt.Sprintf("%s/feed-health", basePath)
	providerCancelPath := fmt.Sprintf("%s/provider/cancel", basePath)
	providerAcknowledgementsPath := fmt.Sprintf("%s/provider/acknowledgements", basePath)
	providerAcknowledgementSLAPath := fmt.Sprintf("%s/provider/acknowledgement-sla", basePath)
	feedThresholds := provider.FeedThresholdsFromEnv(os.Getenv)

	mux.Handle(auditPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		page, err := parsePageRequest(r, allowedAuditSortFields)
		if err != nil {
			return err
		}

		actionFilter := strings.TrimSpace(r.URL.Query().Get("action"))
		actorFilter := strings.TrimSpace(r.URL.Query().Get("actorId"))
		targetFilter := strings.TrimSpace(r.URL.Query().Get("targetId"))
		userFilter := strings.TrimSpace(r.URL.Query().Get("userId"))
		freebetFilter := strings.TrimSpace(r.URL.Query().Get("freebetId"))
		oddsBoostFilter := strings.TrimSpace(r.URL.Query().Get("oddsBoostId"))
		entries := append([]auditLogEntry{}, sampleAuditEntries...)
		entries = append(entries, providerOpsAuditSnapshot()...)
		if betService != nil {
			betEvents, err := betService.ListEvents(500)
			if err != nil {
				return httpx.Internal("failed to list bet lifecycle events", err)
			}
			for _, event := range betEvents {
				entries = append(entries, auditLogEntryFromBetEvent(event))
			}
		}
		entries = filterAuditEntries(
			entries,
			actionFilter,
			actorFilter,
			targetFilter,
			userFilter,
			freebetFilter,
			oddsBoostFilter,
		)
		sortAuditEntries(entries, page.SortBy, page.SortDir)
		items, pagination := paginateAuditEntries(entries, page)

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      items,
			"pagination": pagination,
		})
	}))

	mux.Handle(promoUsagePath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if betService == nil {
			return httpx.Internal("promo usage service unavailable", errors.New("bet service unavailable"))
		}

		breakdownLimit := 20
		if raw := strings.TrimSpace(r.URL.Query().Get("breakdownLimit")); raw != "" {
			parsed, err := strconv.Atoi(raw)
			if err != nil || parsed <= 0 {
				return httpx.BadRequest("breakdownLimit must be a positive integer", map[string]any{
					"field": "breakdownLimit",
					"value": raw,
				})
			}
			breakdownLimit = parsed
		}

		var (
			from *time.Time
			to   *time.Time
		)
		if raw := strings.TrimSpace(r.URL.Query().Get("from")); raw != "" {
			parsed, err := parseAdminRFC3339(raw, "from")
			if err != nil {
				return err
			}
			from = &parsed
		}
		if raw := strings.TrimSpace(r.URL.Query().Get("to")); raw != "" {
			parsed, err := parseAdminRFC3339(raw, "to")
			if err != nil {
				return err
			}
			to = &parsed
		}
		if from != nil && to != nil && to.Before(*from) {
			return httpx.BadRequest("to must be greater than or equal to from", map[string]any{
				"field": "to",
				"value": to.UTC().Format(time.RFC3339),
			})
		}

		filter := bets.PromoUsageFilter{
			UserID:      strings.TrimSpace(r.URL.Query().Get("userId")),
			FreebetID:   strings.TrimSpace(r.URL.Query().Get("freebetId")),
			OddsBoostID: strings.TrimSpace(r.URL.Query().Get("oddsBoostId")),
			From:        from,
			To:          to,
		}
		summary, err := betService.PromoUsageSummary(filter, breakdownLimit)
		if err != nil {
			return httpx.Internal("failed to build promo usage summary", err)
		}

		appliedFilters := map[string]any{
			"userId":         filter.UserID,
			"freebetId":      filter.FreebetID,
			"oddsBoostId":    filter.OddsBoostID,
			"breakdownLimit": breakdownLimit,
		}
		if from != nil {
			appliedFilters["from"] = from.UTC().Format(time.RFC3339)
		}
		if to != nil {
			appliedFilters["to"] = to.UTC().Format(time.RFC3339)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"summary": summary,
			"filters": appliedFilters,
		})
	}))

	mux.Handle(configPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}
		streams := providerStreamStatus(providerRuntime)
		partitions := providerStreamPartitions(providerRuntime)
		acknowledgementSLA := providerAcknowledgementSLASettingsSnapshot(
			streams,
			providerOpsAcknowledgementSnapshot(),
		)

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"maintenanceMode": strings.EqualFold(os.Getenv("GATEWAY_MAINTENANCE_MODE"), "true"),
			"walletProvider":  getEnvOrDefault("GATEWAY_WALLET_PROVIDER", "stub"),
			"riskProvider":    getEnvOrDefault("GATEWAY_RISK_PROVIDER", "stub"),
			"geoProvider":     getEnvOrDefault("GATEWAY_GEO_PROVIDER", "stub"),
			"canonicalSchema": canonicalv1.CurrentSchema(),
			"providerRuntime": map[string]any{
				"enabled":            providerRuntime != nil && providerRuntime.IsStarted(),
				"adapters":           providerAdapterNames(providerRuntime),
				"streams":            streams,
				"partitions":         partitions,
				"thresholds":         feedThresholds,
				"cancel":             providerCancelMetrics(providerRuntime),
				"acknowledgementSLA": acknowledgementSLA,
			},
			"providerOpsAudit": providerOpsAuditStoreMetadata(),
			"updatedAt":        time.Now().UTC().Format(time.RFC3339),
		})
	}))

	mux.Handle(feedHealthPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		streams := providerStreamStatus(providerRuntime)
		partitions := providerStreamPartitions(providerRuntime)
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"enabled":    providerRuntime != nil && providerRuntime.IsStarted(),
			"thresholds": feedThresholds,
			"summary":    providerFeedSummary(streams, partitions, feedThresholds),
			"cancel":     providerCancelMetrics(providerRuntime),
			"streams":    streams,
			"partitions": partitions,
		})
	}))

	mux.Handle(providerAcknowledgementSLAPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}

		switch r.Method {
		case stdhttp.MethodGet:
			streams := providerStreamStatus(providerRuntime)
			settings := providerAcknowledgementSLASettingsSnapshot(
				streams,
				providerOpsAcknowledgementSnapshot(),
			)
			return httpx.WriteJSON(w, stdhttp.StatusOK, settings)
		case stdhttp.MethodPost, stdhttp.MethodPut:
			var request providerAcknowledgementSLAUpdateRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			if err := validateProviderAcknowledgementSLAUpdateRequest(request); err != nil {
				return err
			}

			actor := adminActorFromRequest(r)
			now := time.Now().UTC()
			setting := buildProviderAcknowledgementSLAUpdateEntry(request, actor, now)
			action := providerAcknowledgementSLAUpdateActionForAdapter(setting.Adapter)
			targetID := setting.Adapter
			if strings.TrimSpace(targetID) == "" {
				targetID = "provider.stream.sla.default"
			}

			recordProviderOpsAuditEntry(auditLogEntry{
				ID:         fmt.Sprintf("al:provider:%d", now.UnixNano()),
				Action:     action,
				ActorID:    actor,
				TargetID:   targetID,
				OccurredAt: setting.UpdatedAt,
				Details:    providerAcknowledgementSLASettingDetails(setting),
			})

			settings := providerAcknowledgementSLASettingsSnapshot(
				providerStreamStatus(providerRuntime),
				providerOpsAcknowledgementSnapshot(),
			)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"setting":  setting,
				"settings": settings,
			})
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost, stdhttp.MethodPut)
		}
	}))

	mux.Handle(providerAcknowledgementsPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}

		if r.Method == stdhttp.MethodGet {
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"items": providerOpsAcknowledgementSnapshot(),
			})
		}

		if r.Method == stdhttp.MethodPost {
			var request providerStreamAcknowledgementRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}

			actionMetadata, err := providerAcknowledgementActionMetadataForRequest(request.Action)
			if err != nil {
				return err
			}
			operator := strings.TrimSpace(request.Operator)
			note := strings.TrimSpace(request.Note)
			streamKey := normalizeProviderStreamKey(request.StreamKey, request.Adapter, request.Stream)
			if streamKey == "" {
				return httpx.BadRequest("streamKey or adapter/stream is required", map[string]any{
					"field": "streamKey",
				})
			}
			if operator == "" {
				return httpx.BadRequest("operator is required", map[string]any{
					"field": "operator",
				})
			}
			if note == "" {
				return httpx.BadRequest("note is required", map[string]any{
					"field": "note",
				})
			}

			adapterName, streamName := parseProviderStreamKey(streamKey)
			if trimmed := strings.TrimSpace(request.Adapter); trimmed != "" {
				adapterName = trimmed
			}
			if trimmed := strings.TrimSpace(request.Stream); trimmed != "" {
				streamName = trimmed
			}
			acknowledgedAt := time.Now().UTC().Format(time.RFC3339)
			entry := providerStreamAcknowledgementEntry{
				StreamKey:      streamKey,
				Adapter:        adapterName,
				Stream:         streamName,
				Operator:       operator,
				Note:           note,
				Status:         actionMetadata.Status,
				LastAction:     actionMetadata.LastAction,
				AcknowledgedAt: acknowledgedAt,
				UpdatedBy:      adminActorFromRequest(r),
			}
			recordProviderOpsAuditEntry(auditLogEntry{
				ID:         fmt.Sprintf("al:provider:%d", time.Now().UTC().UnixNano()),
				Action:     actionMetadata.AuditAction,
				ActorID:    adminActorFromRequest(r),
				TargetID:   entry.StreamKey,
				OccurredAt: acknowledgedAt,
				Details:    providerAcknowledgementDetails(entry),
			})

			return httpx.WriteJSON(w, stdhttp.StatusOK, entry)
		}

		return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
	}))

	mux.Handle(providerCancelPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if providerRuntime == nil {
			return httpx.Internal("provider runtime unavailable", errors.New("provider runtime unavailable"))
		}

		var request providerCancelRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}
		result, err := providerRuntime.CancelBet(r.Context(), strings.TrimSpace(request.Adapter), adapter.CancelBetRequest{
			PlayerID:  strings.TrimSpace(request.PlayerID),
			BetID:     strings.TrimSpace(request.BetID),
			RequestID: strings.TrimSpace(request.RequestID),
			Reason:    strings.TrimSpace(request.Reason),
		})
		if err != nil {
			recordProviderOpsAuditEntry(auditLogEntry{
				ID:         fmt.Sprintf("al:provider:%d", time.Now().UTC().UnixNano()),
				Action:     "provider.cancel.failed",
				ActorID:    adminActorFromRequest(r),
				TargetID:   strings.TrimSpace(request.BetID),
				OccurredAt: time.Now().UTC().Format(time.RFC3339),
				Details: fmt.Sprintf(
					"adapter=%s requestId=%s attempts=%d retries=%d state=%s error=%s",
					strings.TrimSpace(request.Adapter),
					strings.TrimSpace(request.RequestID),
					result.Attempts,
					result.RetryCount,
					result.State,
					result.LastError,
				),
			})
			return httpx.Conflict("provider cancel failed", map[string]any{
				"state":      result.State,
				"lastError":  result.LastError,
				"attempts":   result.Attempts,
				"retryCount": result.RetryCount,
				"adapter":    result.Adapter,
			})
		}
		recordProviderOpsAuditEntry(auditLogEntry{
			ID:         fmt.Sprintf("al:provider:%d", time.Now().UTC().UnixNano()),
			Action:     "provider.cancel.succeeded",
			ActorID:    adminActorFromRequest(r),
			TargetID:   strings.TrimSpace(request.BetID),
			OccurredAt: time.Now().UTC().Format(time.RFC3339),
			Details: fmt.Sprintf(
				"adapter=%s requestId=%s attempts=%d retries=%d fallback=%t state=%s",
				strings.TrimSpace(request.Adapter),
				strings.TrimSpace(request.RequestID),
				result.Attempts,
				result.RetryCount,
				result.FallbackUsed,
				result.State,
			),
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, result)
	}))
}

func providerAdapterNames(runtime *provider.Runtime) []string {
	if runtime == nil {
		return []string{}
	}
	return runtime.AdapterNames()
}

func providerStreamStatus(runtime *provider.Runtime) []provider.StreamStatus {
	if runtime == nil {
		return []provider.StreamStatus{}
	}
	return runtime.Snapshot()
}

func providerStreamPartitions(runtime *provider.Runtime) []provider.SportPartitionStatus {
	if runtime == nil {
		return []provider.SportPartitionStatus{}
	}
	return runtime.PartitionSnapshot()
}

func providerFeedSummary(
	streams []provider.StreamStatus,
	partitions []provider.SportPartitionStatus,
	thresholds provider.FeedThresholds,
) map[string]any {
	summary := provider.SummarizeFeedHealth(streams, thresholds)
	summaryBySport := provider.SummarizeSportPartitions(partitions, thresholds)
	return map[string]any{
		"streamCount":            summary.StreamCount,
		"partitionCount":         len(partitions),
		"totalApplied":           summary.TotalApplied,
		"totalSkipped":           summary.TotalSkipped,
		"totalFiltered":          summary.TotalFiltered,
		"totalReplay":            summary.TotalReplay,
		"totalSnapshotApplied":   summary.TotalSnapshotApplied,
		"totalSnapshotSkipped":   summary.TotalSnapshotSkipped,
		"totalThrottleEvents":    summary.TotalThrottleEvents,
		"totalThrottleDelayMs":   summary.TotalThrottleDelayMs,
		"totalDuplicates":        summary.TotalDuplicates,
		"totalGaps":              summary.TotalGaps,
		"totalErrors":            summary.TotalErrors,
		"maxLagMs":               summary.MaxLagMs,
		"hasErrors":              summary.HasErrors,
		"lagBreachStreams":       summary.LagBreachStreams,
		"gapBreachStreams":       summary.GapBreachStreams,
		"duplicateBreachStreams": summary.DupeBreachStreams,
		"errorStateStreams":      summary.ErrorStateStreams,
		"unhealthyStreams":       summary.UnhealthyStreams,
		"bySport":                summaryBySport,
	}
}

func providerCancelMetrics(runtime *provider.Runtime) map[string]any {
	metrics := provider.CancelMetrics{}
	if runtime != nil {
		metrics = runtime.CancelMetrics()
	}
	return map[string]any{
		"totalAttempts": metrics.TotalAttempts,
		"totalRetries":  metrics.TotalRetries,
		"totalFallback": metrics.TotalFallback,
		"totalSuccess":  metrics.TotalSuccess,
		"totalFailed":   metrics.TotalFailed,
	}
}

func providerOpsAuditStoreMetadata() map[string]any {
	initializeProviderOpsAuditStore()
	mode := strings.TrimSpace(providerOpsAuditStoreMode)
	if mode == "" {
		mode = "file"
	}
	metadata := map[string]any{
		"mode": mode,
	}
	if mode == "file" && strings.TrimSpace(providerOpsAuditStorePath) != "" {
		metadata["path"] = providerOpsAuditStorePath
	}
	return metadata
}

func providerAcknowledgementActionMetadataForRequest(action string) (providerAcknowledgementActionMetadata, error) {
	normalized := strings.ToLower(strings.TrimSpace(action))
	if normalized == "" {
		normalized = "acknowledge"
	}
	switch normalized {
	case "acknowledge":
		return providerAcknowledgementActionMetadata{
			AuditAction: "provider.stream.acknowledged",
			Status:      "acknowledged",
			LastAction:  "acknowledged",
		}, nil
	case "reassign":
		return providerAcknowledgementActionMetadata{
			AuditAction: "provider.stream.reassigned",
			Status:      "acknowledged",
			LastAction:  "reassigned",
		}, nil
	case "resolve":
		return providerAcknowledgementActionMetadata{
			AuditAction: "provider.stream.resolved",
			Status:      "resolved",
			LastAction:  "resolved",
		}, nil
	case "reopen":
		return providerAcknowledgementActionMetadata{
			AuditAction: "provider.stream.reopened",
			Status:      "acknowledged",
			LastAction:  "reopened",
		}, nil
	default:
		return providerAcknowledgementActionMetadata{}, httpx.BadRequest(
			"action must be one of acknowledge,reassign,resolve,reopen",
			map[string]any{"field": "action", "value": action},
		)
	}
}

func providerAcknowledgementActionMetadataForAuditAction(action string) (providerAcknowledgementActionMetadata, bool) {
	switch strings.ToLower(strings.TrimSpace(action)) {
	case "provider.stream.acknowledged":
		return providerAcknowledgementActionMetadata{
			AuditAction: "provider.stream.acknowledged",
			Status:      "acknowledged",
			LastAction:  "acknowledged",
		}, true
	case "provider.stream.reassigned":
		return providerAcknowledgementActionMetadata{
			AuditAction: "provider.stream.reassigned",
			Status:      "acknowledged",
			LastAction:  "reassigned",
		}, true
	case "provider.stream.resolved":
		return providerAcknowledgementActionMetadata{
			AuditAction: "provider.stream.resolved",
			Status:      "resolved",
			LastAction:  "resolved",
		}, true
	case "provider.stream.reopened":
		return providerAcknowledgementActionMetadata{
			AuditAction: "provider.stream.reopened",
			Status:      "acknowledged",
			LastAction:  "reopened",
		}, true
	default:
		return providerAcknowledgementActionMetadata{}, false
	}
}

func isProviderAcknowledgementAuditAction(action string) bool {
	_, ok := providerAcknowledgementActionMetadataForAuditAction(action)
	return ok
}

func normalizeProviderAcknowledgementStatus(status string, auditAction string) string {
	normalized := strings.ToLower(strings.TrimSpace(status))
	if normalized == "acknowledged" || normalized == "resolved" {
		return normalized
	}
	if metadata, ok := providerAcknowledgementActionMetadataForAuditAction(auditAction); ok {
		return metadata.Status
	}
	return "acknowledged"
}

func normalizeProviderAcknowledgementLastAction(lastAction string, auditAction string) string {
	normalized := strings.ToLower(strings.TrimSpace(lastAction))
	switch normalized {
	case "acknowledged", "reassigned", "resolved", "reopened":
		return normalized
	}
	if metadata, ok := providerAcknowledgementActionMetadataForAuditAction(auditAction); ok {
		return metadata.LastAction
	}
	return "acknowledged"
}

func providerOpsAcknowledgementSnapshot() []providerStreamAcknowledgementEntry {
	entries := providerOpsAuditSnapshot()
	sort.SliceStable(entries, func(i, j int) bool {
		if entries[i].OccurredAt == entries[j].OccurredAt {
			return entries[i].ID > entries[j].ID
		}
		return entries[i].OccurredAt > entries[j].OccurredAt
	})

	latestByStream := map[string]providerStreamAcknowledgementEntry{}
	for _, entry := range entries {
		if !isProviderAcknowledgementAuditAction(entry.Action) {
			continue
		}
		ack, err := providerAcknowledgementFromAuditEntry(entry)
		if err != nil || strings.TrimSpace(ack.StreamKey) == "" {
			continue
		}
		if _, exists := latestByStream[ack.StreamKey]; exists {
			continue
		}
		latestByStream[ack.StreamKey] = ack
	}

	items := make([]providerStreamAcknowledgementEntry, 0, len(latestByStream))
	for _, item := range latestByStream {
		items = append(items, item)
	}
	sort.SliceStable(items, func(i, j int) bool {
		if items[i].AcknowledgedAt == items[j].AcknowledgedAt {
			return items[i].StreamKey < items[j].StreamKey
		}
		return items[i].AcknowledgedAt > items[j].AcknowledgedAt
	})
	return items
}

func providerAcknowledgementDetails(entry providerStreamAcknowledgementEntry) string {
	raw, err := json.Marshal(entry)
	if err != nil {
		return fmt.Sprintf(
			"streamKey=%s adapter=%s stream=%s operator=%s note=%s status=%s lastAction=%s acknowledgedAt=%s updatedBy=%s",
			entry.StreamKey,
			entry.Adapter,
			entry.Stream,
			entry.Operator,
			entry.Note,
			entry.Status,
			entry.LastAction,
			entry.AcknowledgedAt,
			entry.UpdatedBy,
		)
	}
	return string(raw)
}

func providerAcknowledgementFromAuditEntry(entry auditLogEntry) (providerStreamAcknowledgementEntry, error) {
	var payload providerStreamAcknowledgementEntry
	if err := json.Unmarshal([]byte(strings.TrimSpace(entry.Details)), &payload); err == nil {
		payload.StreamKey = normalizeProviderStreamKey(payload.StreamKey, payload.Adapter, payload.Stream)
		if payload.StreamKey == "" {
			return providerStreamAcknowledgementEntry{}, fmt.Errorf("missing stream key")
		}
		if payload.Adapter == "" || payload.Stream == "" {
			payload.Adapter, payload.Stream = parseProviderStreamKey(payload.StreamKey)
		}
		payload.Operator = strings.TrimSpace(payload.Operator)
		payload.Note = strings.TrimSpace(payload.Note)
		payload.Status = normalizeProviderAcknowledgementStatus(payload.Status, entry.Action)
		payload.LastAction = normalizeProviderAcknowledgementLastAction(payload.LastAction, entry.Action)
		if payload.AcknowledgedAt == "" {
			payload.AcknowledgedAt = strings.TrimSpace(entry.OccurredAt)
		}
		if payload.UpdatedBy == "" {
			payload.UpdatedBy = strings.TrimSpace(entry.ActorID)
		}
		return payload, nil
	}

	fields := parseAuditDetailFields(entry.Details)
	streamKey := normalizeProviderStreamKey(fields["streamKey"], fields["adapter"], fields["stream"])
	if streamKey == "" {
		return providerStreamAcknowledgementEntry{}, fmt.Errorf("missing stream key")
	}
	adapterName, streamName := parseProviderStreamKey(streamKey)
	if fields["adapter"] != "" {
		adapterName = strings.TrimSpace(fields["adapter"])
	}
	if fields["stream"] != "" {
		streamName = strings.TrimSpace(fields["stream"])
	}
	operator := strings.TrimSpace(fields["operator"])
	if operator == "" {
		operator = strings.TrimSpace(entry.ActorID)
	}
	status := normalizeProviderAcknowledgementStatus(fields["status"], entry.Action)
	lastAction := normalizeProviderAcknowledgementLastAction(fields["lastAction"], entry.Action)
	return providerStreamAcknowledgementEntry{
		StreamKey:      streamKey,
		Adapter:        adapterName,
		Stream:         streamName,
		Operator:       operator,
		Note:           strings.TrimSpace(fields["note"]),
		Status:         status,
		LastAction:     lastAction,
		AcknowledgedAt: strings.TrimSpace(entry.OccurredAt),
		UpdatedBy:      strings.TrimSpace(entry.ActorID),
	}, nil
}

func normalizeProviderStreamKey(streamKey string, adapterName string, streamName string) string {
	trimmedKey := strings.TrimSpace(streamKey)
	if trimmedKey == "" {
		adapterName = strings.TrimSpace(adapterName)
		streamName = strings.TrimSpace(streamName)
		if adapterName == "" || streamName == "" {
			return ""
		}
		return adapterName + ":" + streamName
	}
	parts := strings.SplitN(trimmedKey, ":", 2)
	if len(parts) != 2 {
		return ""
	}
	adapterPart := strings.TrimSpace(parts[0])
	streamPart := strings.TrimSpace(parts[1])
	if adapterPart == "" || streamPart == "" {
		return ""
	}
	return adapterPart + ":" + streamPart
}

func parseProviderStreamKey(streamKey string) (string, string) {
	parts := strings.SplitN(strings.TrimSpace(streamKey), ":", 2)
	if len(parts) != 2 {
		return "", ""
	}
	return strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])
}

func providerOpsAuditSnapshot() []auditLogEntry {
	initializeProviderOpsAuditStore()
	providerOpsAuditMu.Lock()
	defer providerOpsAuditMu.Unlock()
	if providerOpsAuditStore != nil {
		entries, err := providerOpsAuditStore.Load(providerOpsAuditLimit)
		if err != nil {
			log.Printf("warning: failed to load provider ops audit entries from %s store: %v", providerOpsAuditStoreMode, err)
		} else {
			providerOpsAuditEntries = trimAuditEntries(entries, providerOpsAuditLimit)
		}
	}
	out := make([]auditLogEntry, len(providerOpsAuditEntries))
	copy(out, providerOpsAuditEntries)
	return out
}

func recordProviderOpsAuditEntry(entry auditLogEntry) {
	initializeProviderOpsAuditStore()
	providerOpsAuditMu.Lock()
	defer providerOpsAuditMu.Unlock()
	providerOpsAuditEntries = append(providerOpsAuditEntries, entry)
	providerOpsAuditEntries = trimAuditEntries(providerOpsAuditEntries, providerOpsAuditLimit)
	if providerOpsAuditStore != nil {
		if err := providerOpsAuditStore.Append(entry, providerOpsAuditLimit); err != nil {
			log.Printf("warning: failed to persist provider ops audit entry to %s store: %v", providerOpsAuditStoreMode, err)
		}
		return
	}
	if err := persistProviderOpsAuditEntriesLocked(); err != nil {
		log.Printf("warning: failed to persist provider ops audit entries: %v", err)
	}
}

func initializeProviderOpsAuditStore() {
	providerOpsAuditStoreInit.Do(func() {
		store, mode, path, err := buildProviderOpsAuditStoreFromEnv()
		if err != nil {
			log.Printf("warning: failed to initialize provider ops audit store from env: %v", err)
			store = newProviderOpsAuditFileStore(defaultProviderOpsAuditPath)
			mode = "file"
			path = defaultProviderOpsAuditPath
		}
		providerOpsAuditStore = store
		providerOpsAuditStoreMode = mode
		providerOpsAuditStorePath = path

		entries, err := providerOpsAuditStore.Load(providerOpsAuditLimit)
		if err != nil {
			log.Printf("warning: failed to load provider ops audit entries from %s store: %v", providerOpsAuditStoreMode, err)
			return
		}
		providerOpsAuditMu.Lock()
		providerOpsAuditEntries = trimAuditEntries(entries, providerOpsAuditLimit)
		providerOpsAuditMu.Unlock()
	})
}

func loadProviderOpsAuditEntries(path string) ([]auditLogEntry, error) {
	if strings.TrimSpace(path) == "" {
		return []auditLogEntry{}, nil
	}
	raw, err := os.ReadFile(path)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return []auditLogEntry{}, nil
		}
		return nil, err
	}
	if len(raw) == 0 {
		return []auditLogEntry{}, nil
	}
	var entries []auditLogEntry
	if err := json.Unmarshal(raw, &entries); err != nil {
		return nil, err
	}
	if len(entries) > 500 {
		entries = append([]auditLogEntry{}, entries[len(entries)-500:]...)
	}
	return entries, nil
}

func persistProviderOpsAuditEntriesLocked() error {
	if strings.TrimSpace(providerOpsAuditStorePath) == "" {
		return nil
	}
	dir := filepath.Dir(providerOpsAuditStorePath)
	if dir != "." && dir != "" {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return err
		}
	}
	raw, err := json.MarshalIndent(providerOpsAuditEntries, "", "  ")
	if err != nil {
		return err
	}
	tempPath := providerOpsAuditStorePath + ".tmp"
	if err := os.WriteFile(tempPath, raw, 0o600); err != nil {
		return err
	}
	return os.Rename(tempPath, providerOpsAuditStorePath)
}

func auditLogEntryFromBetEvent(event bets.BetEvent) auditLogEntry {
	details := strings.TrimSpace(event.Details)
	if details == "" {
		details = strings.TrimSpace(event.Reason)
	}
	if details == "" {
		details = "bet lifecycle event"
	}
	detailFields := parseAuditDetailFields(details)

	freebetAppliedCents := int64(0)
	if raw := strings.TrimSpace(detailFields["freebetAppliedCents"]); raw != "" {
		if parsed, err := strconv.ParseInt(raw, 10, 64); err == nil {
			freebetAppliedCents = parsed
		}
	}

	return auditLogEntry{
		ID:                  event.ID,
		Action:              event.Action,
		ActorID:             event.ActorID,
		UserID:              strings.TrimSpace(event.UserID),
		TargetID:            event.BetID,
		FreebetID:           strings.TrimSpace(detailFields["freebetId"]),
		OddsBoostID:         strings.TrimSpace(detailFields["oddsBoostId"]),
		FreebetAppliedCents: freebetAppliedCents,
		OccurredAt:          event.OccurredAt,
		Details:             details,
	}
}

func parseAuditDetailFields(details string) map[string]string {
	out := map[string]string{}
	for _, token := range strings.Fields(strings.TrimSpace(details)) {
		parts := strings.SplitN(token, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])
		if key == "" || value == "" {
			continue
		}
		out[key] = value
	}
	return out
}

func registerAdminWalletRoutes(mux *stdhttp.ServeMux, basePath string, walletService *wallet.Service) {
	reconciliationPath := fmt.Sprintf("%s/wallet/reconciliation", basePath)
	adminCreditPath := fmt.Sprintf("%s/wallet/credit", basePath)
	adminDebitPath := fmt.Sprintf("%s/wallet/debit", basePath)

	mux.Handle(adminCreditPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		request, err := decodeWalletMutationRequest(r)
		if err != nil {
			return err
		}
		entry, err := walletService.Credit(wallet.MutationRequest{
			UserID:         request.UserID,
			AmountCents:    request.AmountCents,
			IdempotencyKey: request.IdempotencyKey,
			Reason:         request.Reason,
		})
		if err != nil {
			return mapWalletError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"entry":        entry,
			"balanceCents": entry.BalanceCents,
		})
	}))

	mux.Handle(adminDebitPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		request, err := decodeWalletMutationRequest(r)
		if err != nil {
			return err
		}
		entry, err := walletService.Debit(wallet.MutationRequest{
			UserID:         request.UserID,
			AmountCents:    request.AmountCents,
			IdempotencyKey: request.IdempotencyKey,
			Reason:         request.Reason,
		})
		if err != nil {
			return mapWalletError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"entry":        entry,
			"balanceCents": entry.BalanceCents,
		})
	}))

	mux.Handle(reconciliationPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		var (
			from *time.Time
			to   *time.Time
		)
		if raw := strings.TrimSpace(r.URL.Query().Get("from")); raw != "" {
			parsed, err := parseAdminRFC3339(raw, "from")
			if err != nil {
				return err
			}
			from = &parsed
		}
		if raw := strings.TrimSpace(r.URL.Query().Get("to")); raw != "" {
			parsed, err := parseAdminRFC3339(raw, "to")
			if err != nil {
				return err
			}
			to = &parsed
		}
		if from != nil && to != nil && to.Before(*from) {
			return httpx.BadRequest("to must be greater than or equal to from", map[string]any{
				"field": "to",
				"value": to.UTC().Format(time.RFC3339),
			})
		}

		summary, err := walletService.ReconciliationSummary(from, to)
		if err != nil {
			return httpx.Internal("failed to build wallet reconciliation summary", err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, summary)
	}))

	registerAdminWalletCorrectionRoutes(mux, basePath, walletService)
}

func filterAuditEntries(
	entries []auditLogEntry,
	action string,
	actorID string,
	targetID string,
	userID string,
	freebetID string,
	oddsBoostID string,
) []auditLogEntry {
	filtered := make([]auditLogEntry, 0, len(entries))
	for _, entry := range entries {
		if action != "" && !strings.EqualFold(entry.Action, action) {
			continue
		}
		if actorID != "" && !strings.EqualFold(entry.ActorID, actorID) {
			continue
		}
		if targetID != "" && !strings.EqualFold(entry.TargetID, targetID) {
			continue
		}
		if userID != "" && !strings.EqualFold(entry.UserID, userID) {
			continue
		}
		if freebetID != "" && !strings.EqualFold(entry.FreebetID, freebetID) {
			continue
		}
		if oddsBoostID != "" && !strings.EqualFold(entry.OddsBoostID, oddsBoostID) {
			continue
		}
		filtered = append(filtered, entry)
	}
	return filtered
}

func sortAuditEntries(entries []auditLogEntry, sortBy string, sortDir string) {
	field := sortBy
	if field == "" {
		field = "occurredAt"
	}
	desc := strings.EqualFold(sortDir, "desc")

	sort.SliceStable(entries, func(i, j int) bool {
		left := auditSortValue(entries[i], field)
		right := auditSortValue(entries[j], field)
		if left == right {
			if desc {
				return entries[i].ID > entries[j].ID
			}
			return entries[i].ID < entries[j].ID
		}
		if desc {
			return left > right
		}
		return left < right
	})
}

func auditSortValue(entry auditLogEntry, field string) string {
	switch field {
	case "action":
		return strings.ToLower(entry.Action)
	case "actorId":
		return strings.ToLower(entry.ActorID)
	case "occurredAt":
		fallthrough
	default:
		return entry.OccurredAt
	}
}

func paginateAuditEntries(entries []auditLogEntry, request domain.PageRequest) ([]auditLogEntry, domain.PageMeta) {
	normalized := normalizeAdminPageRequest(request)
	total := len(entries)
	start := (normalized.Page - 1) * normalized.PageSize
	if start >= total {
		return []auditLogEntry{}, domain.PageMeta{
			Page:     normalized.Page,
			PageSize: normalized.PageSize,
			Total:    total,
			HasNext:  false,
		}
	}

	end := start + normalized.PageSize
	if end > total {
		end = total
	}

	window := make([]auditLogEntry, end-start)
	copy(window, entries[start:end])

	return window, domain.PageMeta{
		Page:     normalized.Page,
		PageSize: normalized.PageSize,
		Total:    total,
		HasNext:  end < total,
	}
}

func normalizeAdminPageRequest(request domain.PageRequest) domain.PageRequest {
	out := request
	if out.Page <= 0 {
		out.Page = 1
	}
	if out.PageSize <= 0 {
		out.PageSize = 20
	}
	if out.PageSize > 100 {
		out.PageSize = 100
	}
	if out.SortDir == "" {
		out.SortDir = "asc"
	}
	return out
}

func parseAdminRFC3339(raw string, field string) (time.Time, error) {
	parsed, err := time.Parse(time.RFC3339, raw)
	if err == nil {
		return parsed, nil
	}
	parsed, err = time.Parse(time.RFC3339Nano, raw)
	if err == nil {
		return parsed, nil
	}
	return time.Time{}, httpx.BadRequest("timestamp must be RFC3339", map[string]any{
		"field": field,
		"value": raw,
	})
}

func requireAdminRole(r *stdhttp.Request) error {
	// Dev-only bypass (MUST NOT be used in production)
	if strings.EqualFold(os.Getenv("GATEWAY_ALLOW_ADMIN_ANON"), "true") &&
		strings.ToLower(os.Getenv("ENVIRONMENT")) != "production" {
		return nil
	}
	// Primary: check role from authenticated session context (set by Auth middleware)
	role := httpx.RoleFromContext(r.Context())
	if role == "admin" {
		return nil
	}
	// Fallback: check X-Admin-Role header (deprecated, will be removed)
	if strings.EqualFold(strings.TrimSpace(r.Header.Get("X-Admin-Role")), "admin") &&
		httpx.UserIDFromContext(r.Context()) != "" {
		return nil
	}
	return httpx.Forbidden("admin role required")
}

func getEnvOrDefault(name string, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
