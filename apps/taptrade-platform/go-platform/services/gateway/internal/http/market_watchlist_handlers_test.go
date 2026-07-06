package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"taptrade/platform/transport/httpx"
)

func TestMarketWatchlistRequiresSessionUser(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/watchlist/markets", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected unauthenticated watchlist status 403, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestMarketWatchlistAddListRemove(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	addReq := socialUserContext(httptest.NewRequest(http.MethodPut, "/api/v1/watchlist/markets/mkt-watch-1", nil), "u-watch-1")
	addRes := httptest.NewRecorder()
	handler.ServeHTTP(addRes, addReq)
	if addRes.Code != http.StatusOK {
		t.Fatalf("expected add status 200, got %d body=%s", addRes.Code, addRes.Body.String())
	}

	addAgainReq := socialUserContext(httptest.NewRequest(http.MethodPut, "/api/v1/watchlist/markets/mkt-watch-1", nil), "u-watch-1")
	addAgainRes := httptest.NewRecorder()
	handler.ServeHTTP(addAgainRes, addAgainReq)
	if addAgainRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate add status 200, got %d body=%s", addAgainRes.Code, addAgainRes.Body.String())
	}

	otherUserAddReq := socialUserContext(httptest.NewRequest(http.MethodPut, "/api/v1/watchlist/markets/mkt-watch-2", nil), "u-watch-2")
	otherUserAddRes := httptest.NewRecorder()
	handler.ServeHTTP(otherUserAddRes, otherUserAddReq)
	if otherUserAddRes.Code != http.StatusOK {
		t.Fatalf("expected other user add status 200, got %d body=%s", otherUserAddRes.Code, otherUserAddRes.Body.String())
	}

	listReq := socialUserContext(httptest.NewRequest(http.MethodGet, "/api/v1/watchlist/markets", nil), "u-watch-1")
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []string `json:"items"`
		Total int      `json:"total"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode list payload: %v", err)
	}
	if listPayload.Total != 1 || len(listPayload.Items) != 1 || listPayload.Items[0] != "mkt-watch-1" {
		t.Fatalf("expected one watchlist item for session user only, got %+v", listPayload)
	}

	removeReq := socialUserContext(httptest.NewRequest(http.MethodDelete, "/api/v1/watchlist/markets/mkt-watch-1", nil), "u-watch-1")
	removeRes := httptest.NewRecorder()
	handler.ServeHTTP(removeRes, removeReq)
	if removeRes.Code != http.StatusOK {
		t.Fatalf("expected remove status 200, got %d body=%s", removeRes.Code, removeRes.Body.String())
	}

	emptyReq := socialUserContext(httptest.NewRequest(http.MethodGet, "/api/v1/watchlist/markets", nil), "u-watch-1")
	emptyRes := httptest.NewRecorder()
	handler.ServeHTTP(emptyRes, emptyReq)
	if emptyRes.Code != http.StatusOK {
		t.Fatalf("expected empty list status 200, got %d body=%s", emptyRes.Code, emptyRes.Body.String())
	}
	var emptyPayload struct {
		Items []string `json:"items"`
		Total int      `json:"total"`
	}
	if err := json.Unmarshal(emptyRes.Body.Bytes(), &emptyPayload); err != nil {
		t.Fatalf("decode empty payload: %v", err)
	}
	if emptyPayload.Total != 0 || len(emptyPayload.Items) != 0 {
		t.Fatalf("expected empty watchlist after removal, got %+v", emptyPayload)
	}
}
