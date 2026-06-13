package http

import (
	"bytes"
	"context"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/prediction"
)

// fakePartnerKeyStore implements partnerKeyStore for handler tests.
type fakePartnerKeyStore struct {
	created   []*prediction.APIKey
	byUser    map[string][]prediction.APIKey
	createErr error
}

func (f *fakePartnerKeyStore) CreateAPIKey(_ context.Context, k *prediction.APIKey) error {
	if f.createErr != nil {
		return f.createErr
	}
	k.ID = "key-test-1"
	f.created = append(f.created, k)
	return nil
}

func (f *fakePartnerKeyStore) ListAPIKeys(_ context.Context, userID string) ([]prediction.APIKey, error) {
	return f.byUser[userID], nil
}

// TestPartnerAdminIssueKey covers the P3-02 "onboard a partner without code
// changes" path: an operator issues a key FOR a target partner. main_test.go
// sets GATEWAY_ALLOW_ADMIN_ANON=true so requireRBACPermission short-circuits
// (the partners:write gate itself is covered by the rbac handler tests); this
// exercises the issuance logic + validation.
func TestPartnerAdminIssueKey(t *testing.T) {
	store := &fakePartnerKeyStore{byUser: map[string][]prediction.APIKey{}}
	mux := stdhttp.NewServeMux()
	registerPartnerAdminRoutes(mux, nil, store) // rbacSvc unused under admin-anon bypass

	post := func(body string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/admin/partner-keys", bytes.NewBufferString(body))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}

	// Happy path: a key is issued for the target partner and the full secret is
	// returned once.
	w := post(`{"userId":"partner-7","name":"Acme bot","scopes":["read","trade"]}`)
	if w.Code != stdhttp.StatusCreated {
		t.Fatalf("issue: want 201, got %d (%s)", w.Code, w.Body.String())
	}
	var resp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	full, _ := resp["key"].(string)
	if len(full) < 10 || full[:4] != "tna_" {
		t.Fatalf("expected a full tna_ key returned once, got %q", full)
	}
	if len(store.created) != 1 || store.created[0].UserID != "partner-7" {
		t.Fatalf("expected key persisted for partner-7, got %+v", store.created)
	}
	if store.created[0].KeyHash == "" || store.created[0].KeyPrefix == "" || store.created[0].ExpiresAt == nil {
		t.Fatalf("persisted key missing hash/prefix/expiry: %+v", store.created[0])
	}

	// Validation: userId and name are required.
	if w := post(`{"name":"no-user"}`); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("missing userId: want 400, got %d", w.Code)
	}
	if w := post(`{"userId":"p"}`); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("missing name: want 400, got %d", w.Code)
	}
}

func TestPartnerAdminListKeysRequiresUserID(t *testing.T) {
	store := &fakePartnerKeyStore{byUser: map[string][]prediction.APIKey{
		"partner-7": {{ID: "k1", UserID: "partner-7", Name: "Acme"}},
	}}
	mux := stdhttp.NewServeMux()
	registerPartnerAdminRoutes(mux, nil, store)

	get := func(q string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/admin/partner-keys"+q, nil)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}

	if w := get(""); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("missing userId query: want 400, got %d", w.Code)
	}
	if w := get("?userId=partner-7"); w.Code != stdhttp.StatusOK {
		t.Fatalf("list: want 200, got %d (%s)", w.Code, w.Body.String())
	}
}
