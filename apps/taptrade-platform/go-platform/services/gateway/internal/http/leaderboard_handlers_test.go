package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"taptrade/gateway/internal/leaderboards"
	canonicalv1 "taptrade/platform/canonical/v1"
	"taptrade/platform/transport/httpx"
)

func TestLeaderboardPublicRoutesExposeActiveBoardsAndEntries(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/leaderboards", nil)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}

	var listPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode list payload: %v", err)
	}
	if len(listPayload.Items) < 2 {
		t.Fatalf("expected seeded active leaderboards, got %d", len(listPayload.Items))
	}
	for _, item := range listPayload.Items {
		if got := item["unit"]; got != "PTS" {
			t.Fatalf("expected public leaderboard unit PTS, got %v in %#v", got, item)
		}
		if _, ok := item["rewardSummary"].(string); !ok {
			t.Fatalf("expected public leaderboard rewardSummary alias, got %#v", item)
		}
		metricKey, ok := item["metricKey"].(string)
		if !ok || metricKey == "" {
			t.Fatalf("expected public leaderboard metricKey, got %#v", item)
		}
		pointMetricKey, ok := item["pointMetricKey"].(string)
		if !ok || pointMetricKey == "" {
			t.Fatalf("expected public leaderboard pointMetricKey alias, got %#v", item)
		}
		if pointMetricKey != metricKey {
			t.Fatalf("expected metricKey to use point-native alias %q, got pointMetricKey=%q in %#v", metricKey, pointMetricKey, item)
		}
		for _, retired := range []string{"currency", "prizeSummary"} {
			if _, ok := item[retired]; ok {
				t.Fatalf("public leaderboard should not emit retired alias %s in %#v", retired, item)
			}
		}
		for _, retiredMetric := range []string{"net_profit_points", "stake_points"} {
			if metricKey == retiredMetric || pointMetricKey == retiredMetric {
				t.Fatalf("public leaderboard should not expose retired metric %s in %#v", retiredMetric, item)
			}
		}
	}

	leaderboardID, _ := listPayload.Items[0]["leaderboardId"].(string)
	if leaderboardID == "" {
		t.Fatal("expected leaderboardId in public list")
	}

	detailReq := httptest.NewRequest(http.MethodGet, "/api/v1/leaderboards/"+leaderboardID, nil)
	detailRes := httptest.NewRecorder()
	handler.ServeHTTP(detailRes, detailReq)
	if detailRes.Code != http.StatusOK {
		t.Fatalf("expected detail status 200, got %d, body=%s", detailRes.Code, detailRes.Body.String())
	}

	entriesReq := httptest.NewRequest(http.MethodGet, "/api/v1/leaderboards/"+leaderboardID+"/entries?limit=5&offset=0", nil)
	entriesRes := httptest.NewRecorder()
	handler.ServeHTTP(entriesRes, entriesReq)
	if entriesRes.Code != http.StatusOK {
		t.Fatalf("expected entries status 200, got %d, body=%s", entriesRes.Code, entriesRes.Body.String())
	}

	var entriesPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(entriesRes.Body.Bytes(), &entriesPayload); err != nil {
		t.Fatalf("decode entries payload: %v", err)
	}
	if len(entriesPayload.Items) == 0 {
		t.Fatal("expected at least one leaderboard entry")
	}
}

func TestLeaderboardMetricInputAcceptsPointAliases(t *testing.T) {
	for _, tc := range []struct {
		name string
		in   string
		want string
	}{
		{name: "net points", in: "net_points", want: "net_profit_points"},
		{name: "point volume", in: "point_volume", want: "stake_points"},
		{name: "custom", in: "accuracy_points", want: "accuracy_points"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			request := toLeaderboardCreateRequest(leaderboardDefinitionRequest{
				MetricKey: tc.in,
				Unit:      "PTS",
			})
			if request.MetricKey != tc.want {
				t.Fatalf("expected service metric %q, got %q", tc.want, request.MetricKey)
			}
		})
	}
}

func TestLeaderboardDefinitionReadsRedactLegacyUnsafeCopy(t *testing.T) {
	svc := leaderboards.NewService()
	legacy, err := svc.CreateDefinition(leaderboards.CreateDefinitionRequest{
		Slug:         "cash-race",
		Name:         "Cash Prize Race",
		Description:  "Top ranks receive crypto prizes.",
		MetricKey:    "accuracy_points",
		EventType:    "challenge",
		RankingMode:  canonicalv1.LeaderboardRankingModeMax,
		Order:        canonicalv1.LeaderboardOrderDescending,
		Status:       canonicalv1.LeaderboardStatusActive,
		Currency:     "PTS",
		PrizeSummary: "Top 3 receive USD payouts.",
		CreatedBy:    "import",
	})
	if err != nil {
		t.Fatalf("seed legacy leaderboard definition: %v", err)
	}
	mux := http.NewServeMux()
	registerLeaderboardRoutes(mux, svc)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/leaderboards", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d body=%s", res.Code, res.Body.String())
	}
	raw, ok := svc.GetDefinition(legacy.LeaderboardID)
	if !ok {
		t.Fatalf("expected raw legacy leaderboard %s", legacy.LeaderboardID)
	}
	if raw.Slug != "cash-race" ||
		raw.Name != "Cash Prize Race" ||
		raw.Description != "Top ranks receive crypto prizes." ||
		raw.PrizeSummary != "Top 3 receive USD payouts." {
		t.Fatalf("raw leaderboard definition should remain unchanged, got %+v", raw)
	}
	var payload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode list payload: %v body=%s", err, res.Body.String())
	}
	var found map[string]any
	for _, item := range payload.Items {
		if item["leaderboardId"] == legacy.LeaderboardID {
			found = item
			break
		}
	}
	if found == nil {
		t.Fatalf("expected legacy leaderboard in response, got %+v", payload.Items)
	}
	for _, field := range []string{"slug", "name", "description", "rewardSummary"} {
		if found[field] != launchRedactedUserText {
			t.Fatalf("expected %s to be redacted, got %#v in %#v", field, found[field], found)
		}
	}
	for _, unsafe := range [][]byte{[]byte("cash-race"), []byte("Cash Prize Race"), []byte("crypto prizes"), []byte("USD payouts")} {
		if bytes.Contains(res.Body.Bytes(), unsafe) {
			t.Fatalf("unsafe legacy leaderboard copy leaked in response: %s", res.Body.String())
		}
	}
}

func TestAdminLeaderboardRejectsRetiredRequestContract(t *testing.T) {
	for _, tc := range []struct {
		name    string
		body    string
		field   string
		message string
	}{
		{
			name:    "currency alias",
			body:    `{"slug":"currency-alias","name":"Currency Alias","description":"Point-status challenge board","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","currency":"USD","rewardSummary":"Top ranks earn XP boosts.","createdBy":"admin-ops-1"}`,
			field:   "unit",
			message: "leaderboard unit must use PTS",
		},
		{
			name:    "prize summary alias",
			body:    `{"slug":"prize-alias","name":"Prize Alias","description":"Point-status challenge board","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"PTS","prizeSummary":"Top ranks earn XP boosts.","createdBy":"admin-ops-1"}`,
			field:   "rewardSummary",
			message: "leaderboard rewardSummary must use launch rewardSummary",
		},
		{
			name:    "retired metric",
			body:    `{"slug":"metric-alias","name":"Metric Alias","description":"Point-status challenge board","metricKey":"net_profit_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"PTS","rewardSummary":"Top ranks earn XP boosts.","createdBy":"admin-ops-1"}`,
			field:   "metricKey",
			message: "leaderboard metricKey must use point-native metric aliases",
		},
		{
			name:    "non point unit",
			body:    `{"slug":"unit-alias","name":"Unit Alias","description":"Point-status challenge board","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"USD","rewardSummary":"Top ranks earn XP boosts.","createdBy":"admin-ops-1"}`,
			field:   "unit",
			message: "leaderboard unit must use PTS",
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			mux := http.NewServeMux()
			RegisterRoutes(mux, "gateway")
			handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

			req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/leaderboards", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-test", "admin-test", "admin"))
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)

			assertLeaderboardFieldRejected(t, res, tc.field, tc.message)
		})
	}
}

func TestAdminLeaderboardCreateUpdateRecordAndRecompute(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/leaderboards",
		bytes.NewBufferString(`{"slug":"weekly-accuracy","name":"Weekly Accuracy","description":"Best prediction rate","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"PTS","rewardSummary":"Top ranks earn XP boosts.","createdBy":"admin-ops-1"}`),
	)
	createReq.Header.Set("Content-Type", "application/json")
	createReq = createReq.WithContext(httpx.WithTestUser(createReq.Context(), "admin-test", "admin-test", "admin"))
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusOK {
		t.Fatalf("expected create status 200, got %d, body=%s", createRes.Code, createRes.Body.String())
	}

	var created map[string]any
	if err := json.Unmarshal(createRes.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}
	leaderboardID, _ := created["leaderboardId"].(string)
	if leaderboardID == "" {
		t.Fatal("expected leaderboardId in create response")
	}
	if created["unit"] != "PTS" {
		t.Fatalf("expected created leaderboard point unit, got unit=%v", created["unit"])
	}
	if created["metricKey"] != "accuracy_points" || created["pointMetricKey"] != "accuracy_points" {
		t.Fatalf("expected created leaderboard point metric aliases, got %#v", created)
	}
	if created["rewardSummary"] != "Top ranks earn XP boosts." {
		t.Fatalf("expected reward summary alias, got rewardSummary=%v", created["rewardSummary"])
	}
	for _, retired := range []string{"currency", "prizeSummary"} {
		if _, ok := created[retired]; ok {
			t.Fatalf("created leaderboard should not emit retired alias %s in %#v", retired, created)
		}
	}

	recordReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/leaderboards/"+leaderboardID+"/entries",
		bytes.NewBufferString(`{"playerId":"u-rank-1","score":88.5,"activitySourceType":"admin_rank_seed","activitySourceId":"seed-1","idempotencyKey":"rank-entry-1"}`),
	)
	recordReq.Header.Set("Content-Type", "application/json")
	recordReq = recordReq.WithContext(httpx.WithTestUser(recordReq.Context(), "admin-test", "admin-test", "admin"))
	recordRes := httptest.NewRecorder()
	handler.ServeHTTP(recordRes, recordReq)
	if recordRes.Code != http.StatusOK {
		t.Fatalf("expected record status 200, got %d, body=%s", recordRes.Code, recordRes.Body.String())
	}
	var recorded map[string]any
	if err := json.Unmarshal(recordRes.Body.Bytes(), &recorded); err != nil {
		t.Fatalf("decode record payload: %v", err)
	}
	if recorded["activitySourceType"] != "admin_rank_seed" || recorded["activitySourceId"] != "seed-1" {
		t.Fatalf("expected point-native activity source aliases, got %#v", recorded)
	}
	if recorded["unit"] != "PTS" {
		t.Fatalf("expected leaderboard event unit PTS, got %#v", recorded)
	}
	for _, retired := range []string{"sourceType", "sourceId"} {
		if _, ok := recorded[retired]; ok {
			t.Fatalf("leaderboard event should not emit retired alias %s in %#v", retired, recorded)
		}
	}

	updateReq := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/admin/leaderboards/"+leaderboardID,
		bytes.NewBufferString(`{"slug":"weekly-accuracy","name":"Weekly Accuracy Updated","description":"Best prediction rate","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"PTS","rewardSummary":"Updated rank badges only.","createdBy":"admin-ops-1"}`),
	)
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq = updateReq.WithContext(httpx.WithTestUser(updateReq.Context(), "admin-test", "admin-test", "admin"))
	updateRes := httptest.NewRecorder()
	handler.ServeHTTP(updateRes, updateReq)
	if updateRes.Code != http.StatusOK {
		t.Fatalf("expected update status 200, got %d, body=%s", updateRes.Code, updateRes.Body.String())
	}
	var updated map[string]any
	if err := json.Unmarshal(updateRes.Body.Bytes(), &updated); err != nil {
		t.Fatalf("decode update payload: %v", err)
	}
	if updated["rewardSummary"] != "Updated rank badges only." || updated["unit"] != "PTS" {
		t.Fatalf("expected updated point aliases, got %#v", updated)
	}

	recomputeReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/leaderboards/"+leaderboardID+"/recompute", nil)
	recomputeReq = recomputeReq.WithContext(httpx.WithTestUser(recomputeReq.Context(), "admin-test", "admin-test", "admin"))
	recomputeRes := httptest.NewRecorder()
	handler.ServeHTTP(recomputeRes, recomputeReq)
	if recomputeRes.Code != http.StatusOK {
		t.Fatalf("expected recompute status 200, got %d, body=%s", recomputeRes.Code, recomputeRes.Body.String())
	}

	var recomputePayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(recomputeRes.Body.Bytes(), &recomputePayload); err != nil {
		t.Fatalf("decode recompute payload: %v", err)
	}
	if len(recomputePayload.Items) != 1 {
		t.Fatalf("expected one standing after recompute, got %d", len(recomputePayload.Items))
	}
}

func TestAdminLeaderboardEventRejectsRetiredRequestContract(t *testing.T) {
	for _, tc := range []struct {
		name    string
		body    string
		field   string
		message string
	}{
		{
			name:    "sourceType alias",
			body:    `{"playerId":"u-rank-1","score":88.5,"sourceType":"admin_seed","activitySourceId":"seed-1","idempotencyKey":"rank-entry-retired-source-type"}`,
			field:   "activitySourceType",
			message: "leaderboard event source must use activitySourceType",
		},
		{
			name:    "sourceId alias",
			body:    `{"playerId":"u-rank-1","score":88.5,"activitySourceType":"admin_rank_seed","sourceId":"seed-1","idempotencyKey":"rank-entry-retired-source-id"}`,
			field:   "activitySourceId",
			message: "leaderboard event source must use activitySourceId",
		},
		{
			name:    "metadata betId alias",
			body:    `{"playerId":"u-rank-1","score":88.5,"activitySourceType":"admin_rank_seed","activitySourceId":"seed-1","idempotencyKey":"rank-entry-retired-metadata-bet","metadata":{"betId":"bet:legacy:1"}}`,
			field:   "metadata.predictionId",
			message: "leaderboard event metadata must use predictionId",
		},
		{
			name:    "metadata stakePoints alias",
			body:    `{"playerId":"u-rank-1","score":88.5,"activitySourceType":"admin_rank_seed","activitySourceId":"seed-1","idempotencyKey":"rank-entry-retired-metadata-stake","metadata":{"stakePoints":"1000"}}`,
			field:   "metadata.pointVolumePoints",
			message: "leaderboard event metadata must use pointVolumePoints",
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			mux := http.NewServeMux()
			RegisterRoutes(mux, "gateway")
			handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

			listReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/leaderboards", nil)
			listReq = listReq.WithContext(httpx.WithTestUser(listReq.Context(), "admin-test", "admin-test", "admin"))
			listRes := httptest.NewRecorder()
			handler.ServeHTTP(listRes, listReq)
			if listRes.Code != http.StatusOK {
				t.Fatalf("expected list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
			}
			var listPayload struct {
				Items []map[string]any `json:"items"`
			}
			if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
				t.Fatalf("decode list payload: %v", err)
			}
			if len(listPayload.Items) == 0 {
				t.Fatal("expected seeded admin leaderboard")
			}
			leaderboardID, _ := listPayload.Items[0]["leaderboardId"].(string)
			if leaderboardID == "" {
				t.Fatal("expected leaderboardId in admin list")
			}

			req := httptest.NewRequest(
				http.MethodPost,
				"/api/v1/admin/leaderboards/"+leaderboardID+"/entries",
				bytes.NewBufferString(tc.body),
			)
			req.Header.Set("Content-Type", "application/json")
			req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-test", "admin-test", "admin"))
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)

			assertLeaderboardFieldRejected(t, res, tc.field, tc.message)
		})
	}
}

func TestLeaderboardStandingPayloadSanitizesLegacyMetadata(t *testing.T) {
	payload := leaderboardStandingPayload(canonicalv1.LeaderboardStanding{
		LeaderboardID: "lb:legacy",
		PlayerID:      "u-legacy",
		Rank:          1,
		Score:         42,
		EventCount:    1,
		Metadata: map[string]string{
			"betId":        "bet:legacy:1",
			"stakePoints":  "1000",
			"payoutPoints": "2500",
			"sourceType":   "bet_settlement",
			"sourceId":     "bet:legacy:1",
			"reason":       "settled bet leaderboard proof",
		},
	})
	if payload["unit"] != "PTS" {
		t.Fatalf("expected standing unit PTS, got %#v", payload)
	}
	metadata, ok := payload["metadata"].(map[string]string)
	if !ok {
		t.Fatalf("expected sanitized metadata map, got %#v", payload["metadata"])
	}
	if metadata["predictionId"] != "prediction:legacy:1" {
		t.Fatalf("expected predictionId alias, got %#v", metadata)
	}
	if metadata["pointVolumePoints"] != "1000" {
		t.Fatalf("expected pointVolumePoints alias, got %#v", metadata)
	}
	if metadata["settlementPoints"] != "2500" {
		t.Fatalf("expected settlementPoints alias, got %#v", metadata)
	}
	if metadata["activitySourceType"] != "prediction_settlement" || metadata["activitySourceId"] != "prediction:legacy:1" {
		t.Fatalf("expected activity source aliases, got %#v", metadata)
	}
	if metadata["reason"] != "prediction settlement leaderboard proof" {
		t.Fatalf("expected point-safe reason, got %#v", metadata)
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal standing payload: %v", err)
	}
	for _, retired := range []string{"betId", "stakePoints", "payoutPoints", "sourceType", "sourceId", "bet:", "bet_settlement", "settled bet"} {
		if bytes.Contains(encoded, []byte(retired)) {
			t.Fatalf("standing payload should not expose retired %q in %s", retired, string(encoded))
		}
	}
}

func TestLeaderboardStandingPayloadRedactsLegacyUnsafeMetadata(t *testing.T) {
	metadata := map[string]string{
		"reason":        "cash payout leaderboard reward",
		"reviewComment": "crypto prize review",
	}
	payload := leaderboardStandingPayload(canonicalv1.LeaderboardStanding{
		LeaderboardID: "lb:legacy-unsafe",
		PlayerID:      "u-legacy-unsafe",
		Rank:          1,
		Score:         42,
		EventCount:    1,
		Metadata:      metadata,
	})
	got, ok := payload["metadata"].(map[string]string)
	if !ok {
		t.Fatalf("expected metadata map, got %#v", payload["metadata"])
	}
	if got["reason"] != launchRedactedUserText || got["reviewComment"] != launchRedactedUserText {
		t.Fatalf("expected unsafe metadata values redacted, got %+v", got)
	}
	if metadata["reason"] != "cash payout leaderboard reward" || metadata["reviewComment"] != "crypto prize review" {
		t.Fatalf("redaction should not mutate raw leaderboard metadata, got %+v", metadata)
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal standing payload: %v", err)
	}
	for _, unsafe := range []string{"cash payout", "crypto prize"} {
		if bytes.Contains(encoded, []byte(unsafe)) {
			t.Fatalf("standing payload should not expose unsafe metadata %q in %s", unsafe, string(encoded))
		}
	}
}

func TestAdminLeaderboardRejectsProhibitedRewardSummaryCopy(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/leaderboards",
		bytes.NewBufferString(`{"slug":"point-race","name":"Point Race","description":"Unsafe reward copy","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"PTS","rewardSummary":"Top 3 win cash prizes.","createdBy":"admin-ops-1"}`),
	)
	createReq.Header.Set("Content-Type", "application/json")
	createReq = createReq.WithContext(httpx.WithTestUser(createReq.Context(), "admin-test", "admin-test", "admin"))
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)

	assertLeaderboardLaunchCopyRejected(t, createRes, "rewardSummary")
}

func TestAdminLeaderboardRejectsProhibitedRewardSummaryUpdate(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/leaderboards",
		bytes.NewBufferString(`{"slug":"safe-race","name":"Safe Race","description":"Safe reward copy","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"PTS","rewardSummary":"Top ranks earn XP boosts.","createdBy":"admin-ops-1"}`),
	)
	createReq.Header.Set("Content-Type", "application/json")
	createReq = createReq.WithContext(httpx.WithTestUser(createReq.Context(), "admin-test", "admin-test", "admin"))
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusOK {
		t.Fatalf("expected safe create status 200, got %d, body=%s", createRes.Code, createRes.Body.String())
	}
	var created map[string]any
	if err := json.Unmarshal(createRes.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}
	leaderboardID, _ := created["leaderboardId"].(string)
	if leaderboardID == "" {
		t.Fatal("expected leaderboardId in create response")
	}

	updateReq := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/admin/leaderboards/"+leaderboardID,
		bytes.NewBufferString(`{"slug":"safe-race","name":"Safe Race","description":"Unsafe update copy","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"PTS","rewardSummary":"Top 3 receive USD payouts.","createdBy":"admin-ops-1"}`),
	)
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq = updateReq.WithContext(httpx.WithTestUser(updateReq.Context(), "admin-test", "admin-test", "admin"))
	updateRes := httptest.NewRecorder()
	handler.ServeHTTP(updateRes, updateReq)

	assertLeaderboardLaunchCopyRejected(t, updateRes, "rewardSummary")
}

func TestAdminLeaderboardRejectsProhibitedNameCopy(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/leaderboards",
		bytes.NewBufferString(`{"slug":"point-race-name","name":"Cash Race","description":"Point-status challenge board","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"PTS","rewardSummary":"Top ranks earn XP boosts.","createdBy":"admin-ops-1"}`),
	)
	createReq.Header.Set("Content-Type", "application/json")
	createReq = createReq.WithContext(httpx.WithTestUser(createReq.Context(), "admin-test", "admin-test", "admin"))
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)

	assertLeaderboardLaunchCopyRejected(t, createRes, "name")
}

func TestAdminLeaderboardRejectsProhibitedSlugCopy(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/leaderboards",
		bytes.NewBufferString(`{"slug":"cash-race","name":"Point Race","description":"Point-status challenge board","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"PTS","rewardSummary":"Top ranks earn XP boosts.","createdBy":"admin-ops-1"}`),
	)
	createReq.Header.Set("Content-Type", "application/json")
	createReq = createReq.WithContext(httpx.WithTestUser(createReq.Context(), "admin-test", "admin-test", "admin"))
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)

	assertLeaderboardLaunchCopyRejected(t, createRes, "slug")
}

func TestAdminLeaderboardRejectsProhibitedDescriptionUpdate(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/leaderboards",
		bytes.NewBufferString(`{"slug":"safe-description-race","name":"Safe Description Race","description":"Point-status challenge board","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"PTS","rewardSummary":"Top ranks earn XP boosts.","createdBy":"admin-ops-1"}`),
	)
	createReq.Header.Set("Content-Type", "application/json")
	createReq = createReq.WithContext(httpx.WithTestUser(createReq.Context(), "admin-test", "admin-test", "admin"))
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusOK {
		t.Fatalf("expected safe create status 200, got %d, body=%s", createRes.Code, createRes.Body.String())
	}
	var created map[string]any
	if err := json.Unmarshal(createRes.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode create payload: %v", err)
	}
	leaderboardID, _ := created["leaderboardId"].(string)
	if leaderboardID == "" {
		t.Fatal("expected leaderboardId in create response")
	}

	updateReq := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/admin/leaderboards/"+leaderboardID,
		bytes.NewBufferString(`{"slug":"safe-description-race","name":"Safe Description Race","description":"Top ranks receive crypto prizes.","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"PTS","rewardSummary":"Top ranks earn XP boosts.","createdBy":"admin-ops-1"}`),
	)
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq = updateReq.WithContext(httpx.WithTestUser(updateReq.Context(), "admin-test", "admin-test", "admin"))
	updateRes := httptest.NewRecorder()
	handler.ServeHTTP(updateRes, updateReq)

	assertLeaderboardLaunchCopyRejected(t, updateRes, "description")
}

func TestAdminLeaderboardRejectsRedeemableDescriptionCopy(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/leaderboards",
		bytes.NewBufferString(`{"slug":"status-description-race","name":"Status Description Race","description":"Redeemable rank rewards for top players.","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"PTS","rewardSummary":"Top ranks earn XP boosts.","createdBy":"admin-ops-1"}`),
	)
	createReq.Header.Set("Content-Type", "application/json")
	createReq = createReq.WithContext(httpx.WithTestUser(createReq.Context(), "admin-test", "admin-test", "admin"))
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)

	assertLeaderboardLaunchCopyRejected(t, createRes, "description")
}

func TestAdminLeaderboardAllowsNonRedeemableDisclosureCopy(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/leaderboards",
		bytes.NewBufferString(`{"slug":"status-disclosure-race","name":"Status Disclosure Race","description":"Non-redeemable rank status only.","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","unit":"PTS","rewardSummary":"Non-redeemable status boosts only.","createdBy":"admin-ops-1"}`),
	)
	createReq.Header.Set("Content-Type", "application/json")
	createReq = createReq.WithContext(httpx.WithTestUser(createReq.Context(), "admin-test", "admin-test", "admin"))
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusOK {
		t.Fatalf("expected non-redeemable disclosure copy to pass, got %d: %s", createRes.Code, createRes.Body.String())
	}
}

func assertLeaderboardLaunchCopyRejected(t *testing.T, rec *httptest.ResponseRecorder, field string) {
	t.Helper()
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	var payload struct {
		Error struct {
			Message string         `json:"message"`
			Details map[string]any `json:"details"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode error response: %v; body=%s", err, rec.Body.String())
	}
	wantMessage := "leaderboard " + field + " must use non-redeemable point status wording"
	if payload.Error.Message != wantMessage {
		t.Fatalf("expected launch-copy error, got %q", payload.Error.Message)
	}
	if payload.Error.Details["field"] != field {
		t.Fatalf("expected %s field detail, got %+v", field, payload.Error.Details)
	}
}

func assertLeaderboardFieldRejected(t *testing.T, rec *httptest.ResponseRecorder, field string, message string) {
	t.Helper()
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	var payload struct {
		Error struct {
			Message string         `json:"message"`
			Details map[string]any `json:"details"`
		} `json:"error"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode error response: %v; body=%s", err, rec.Body.String())
	}
	if payload.Error.Message != message {
		t.Fatalf("expected %q, got %q", message, payload.Error.Message)
	}
	if payload.Error.Details["field"] != field {
		t.Fatalf("expected %s field detail, got %+v", field, payload.Error.Details)
	}
}

func TestAdminLeaderboardRoutesRequireAdminRole(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/leaderboards", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected 403 for admin leaderboard list without role, got %d", res.Code)
	}
}

func TestLeaderboardRoutesExposeViewerStanding(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/leaderboards/lb:local:000001/entries?limit=5&offset=0&userId=u-1", nil)
	// Viewer-standing lookup now requires session user == queried userId.
	req.Header.Set("X-User-ID", "u-1")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d, body=%s", res.Code, res.Body.String())
	}

	var payload struct {
		ViewerEntry map[string]any `json:"viewerEntry"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if payload.ViewerEntry["playerId"] != "u-1" {
		t.Fatalf("expected viewerEntry playerId u-1, got %v", payload.ViewerEntry["playerId"])
	}
}
