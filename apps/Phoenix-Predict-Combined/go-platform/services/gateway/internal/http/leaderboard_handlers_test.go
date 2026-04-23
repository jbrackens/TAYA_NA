package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/platform/transport/httpx"
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

func TestAdminLeaderboardCreateUpdateRecordAndRecompute(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/leaderboards",
		bytes.NewBufferString(`{"slug":"weekly-accuracy","name":"Weekly Accuracy","description":"Best prediction rate","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","createdBy":"admin-ops-1"}`),
	)
	createReq.Header.Set("Content-Type", "application/json")
	createReq.Header.Set("X-Admin-Role", "admin")
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

	recordReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/leaderboards/"+leaderboardID+"/entries",
		bytes.NewBufferString(`{"playerId":"u-rank-1","score":88.5,"sourceType":"admin_seed","sourceId":"seed-1","idempotencyKey":"rank-entry-1"}`),
	)
	recordReq.Header.Set("Content-Type", "application/json")
	recordReq.Header.Set("X-Admin-Role", "admin")
	recordRes := httptest.NewRecorder()
	handler.ServeHTTP(recordRes, recordReq)
	if recordRes.Code != http.StatusOK {
		t.Fatalf("expected record status 200, got %d, body=%s", recordRes.Code, recordRes.Body.String())
	}

	updateReq := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/admin/leaderboards/"+leaderboardID,
		bytes.NewBufferString(`{"slug":"weekly-accuracy","name":"Weekly Accuracy Updated","description":"Best prediction rate","metricKey":"accuracy_points","eventType":"challenge","rankingMode":"max","order":"desc","status":"active","createdBy":"admin-ops-1"}`),
	)
	updateReq.Header.Set("Content-Type", "application/json")
	updateReq.Header.Set("X-Admin-Role", "admin")
	updateRes := httptest.NewRecorder()
	handler.ServeHTTP(updateRes, updateReq)
	if updateRes.Code != http.StatusOK {
		t.Fatalf("expected update status 200, got %d, body=%s", updateRes.Code, updateRes.Body.String())
	}

	recomputeReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/leaderboards/"+leaderboardID+"/recompute", nil)
	recomputeReq.Header.Set("X-Admin-Role", "admin")
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
