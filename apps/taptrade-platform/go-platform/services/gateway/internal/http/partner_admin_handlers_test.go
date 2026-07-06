package http

import (
	"bytes"
	"context"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"taptrade/gateway/internal/prediction"
	"taptrade/platform/transport/httpx"
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

	// Launch scopes are intentionally narrow. The bot auth layer treats
	// "admin" as a wildcard, so issuance must reject it before persistence.
	if w := post(`{"userId":"partner-7","name":"wild","scopes":["admin"]}`); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("admin scope: want 400, got %d (%s)", w.Code, w.Body.String())
	}
	if w := post(`{"userId":"partner-7","name":"unknown","scopes":["read","settle"]}`); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("unknown scope: want 400, got %d (%s)", w.Code, w.Body.String())
	}
	if len(store.created) != 1 {
		t.Fatalf("invalid partner scopes must not persist keys, got %+v", store.created)
	}

	w = post(`{"userId":"partner-8","name":"Default read"}`)
	if w.Code != stdhttp.StatusCreated {
		t.Fatalf("default read scope: want 201, got %d (%s)", w.Code, w.Body.String())
	}
	if len(store.created) != 2 || len(store.created[1].Scopes) != 1 || store.created[1].Scopes[0] != "read" {
		t.Fatalf("expected omitted scopes to default to read, got %+v", store.created)
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

func TestPartnerAdminListKeysRedactsLegacyUnsafeNameOnRead(t *testing.T) {
	store := &fakePartnerKeyStore{byUser: map[string][]prediction.APIKey{
		"partner-7": {{ID: "k1", UserID: "partner-7", Name: "cash payout partner key", KeyPrefix: "tna_1234", Scopes: []string{"read"}, Active: true}},
	}}
	mux := stdhttp.NewServeMux()
	registerPartnerAdminRoutes(mux, nil, store)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/admin/partner-keys?userId=partner-7", nil)
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("list: want 200, got %d (%s)", res.Code, res.Body.String())
	}
	if got := store.byUser["partner-7"][0].Name; got != "cash payout partner key" {
		t.Fatalf("raw key name should remain unchanged, got %q", got)
	}
	var payload struct {
		Keys []prediction.APIKey `json:"keys"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode list response: %v body=%s", err, res.Body.String())
	}
	if len(payload.Keys) != 1 || payload.Keys[0].Name != launchRedactedUserText {
		t.Fatalf("expected redacted key name in response, got %+v", payload.Keys)
	}
	if strings.Contains(res.Body.String(), "cash payout partner key") {
		t.Fatalf("unsafe legacy key name leaked in response: %s", res.Body.String())
	}
}

func TestPartnerAdminIssueKeyRejectsMoneyWordingName(t *testing.T) {
	store := &fakePartnerKeyStore{byUser: map[string][]prediction.APIKey{}}
	mux := stdhttp.NewServeMux()
	registerPartnerAdminRoutes(mux, nil, store)

	req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/admin/partner-keys", bytes.NewBufferString(
		`{"userId":"partner-7","name":"cash payout bot","scopes":["read"]}`,
	))
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusBadRequest {
		t.Fatalf("unsafe name: want 400, got %d (%s)", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error envelope: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "name" {
		t.Fatalf("expected field=name detail, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "cash payout") {
		t.Fatalf("error response echoed unsafe name: %s", res.Body.String())
	}
	if len(store.created) != 0 {
		t.Fatalf("unsafe partner key name must not persist keys, got %+v", store.created)
	}
}
