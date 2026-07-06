package http

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"taptrade/gateway/internal/webhooks"
	"taptrade/platform/transport/httpx"
)

// fakeWebhookStore implements webhookEndpointStore for handler tests.
type fakeWebhookStore struct {
	created []webhooks.Endpoint
	byUser  map[string][]webhooks.Endpoint
	toggled []struct {
		id, user string
		active   bool
	}
	toggleErr error
}

func (f *fakeWebhookStore) CreateEndpoint(_ context.Context, ep webhooks.Endpoint) (webhooks.Endpoint, error) {
	ep.ID = "wh-ep-1"
	f.created = append(f.created, ep)
	return ep, nil
}

func (f *fakeWebhookStore) ListEndpoints(_ context.Context, userID string) ([]webhooks.Endpoint, error) {
	return f.byUser[userID], nil
}

func (f *fakeWebhookStore) SetEndpointActive(_ context.Context, id, userID string, active bool) error {
	if f.toggleErr != nil {
		return f.toggleErr
	}
	f.toggled = append(f.toggled, struct {
		id, user string
		active   bool
	}{id, userID, active})
	return nil
}

// TestWebhookAdminRegister covers the P3-03 operator registration path
// (admin-anon bypass via the package TestMain; the partners:write gate itself
// is covered by the rbac handler tests). It exercises secret generation,
// validation, and persistence.
func TestWebhookAdminRegister(t *testing.T) {
	store := &fakeWebhookStore{byUser: map[string][]webhooks.Endpoint{}}
	mux := stdhttp.NewServeMux()
	registerWebhookAdminRoutes(mux, nil, store)

	post := func(body string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/admin/webhook-endpoints", bytes.NewBufferString(body))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}

	// Happy path: endpoint registered, a whsec_ signing secret returned once.
	w := post(`{"userId":"partner-7","url":"https://acme.example/hooks","events":["order.filled","market.settled"]}`)
	if w.Code != stdhttp.StatusCreated {
		t.Fatalf("register: want 201, got %d (%s)", w.Code, w.Body.String())
	}
	var resp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	secret, _ := resp["secret"].(string)
	if len(secret) < len(webhooks.SecretPrefix)+8 || secret[:len(webhooks.SecretPrefix)] != webhooks.SecretPrefix {
		t.Fatalf("expected a whsec_ secret returned once, got %q", secret)
	}
	if len(store.created) != 1 || store.created[0].PartnerID != "partner-7" || !store.created[0].Active {
		t.Fatalf("expected active endpoint persisted for partner-7, got %+v", store.created)
	}
	if store.created[0].Secret != secret {
		t.Fatalf("persisted secret should match the returned one")
	}

	// An explicit secret is honored rather than generated.
	w = post(`{"userId":"p","url":"https://x.example/h","secret":"whsec_custom123456"}`)
	if w.Code != stdhttp.StatusCreated {
		t.Fatalf("register w/ secret: want 201, got %d", w.Code)
	}
	if got := store.created[1].Secret; got != "whsec_custom123456" {
		t.Fatalf("explicit secret not honored: %q", got)
	}

	// Validation: userId required, url required/valid, event types known.
	if w := post(`{"url":"https://x.example/h"}`); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("missing userId: want 400, got %d", w.Code)
	}
	if w := post(`{"userId":"p"}`); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("missing url: want 400, got %d", w.Code)
	}
	if w := post(`{"userId":"p","url":"ftp://nope"}`); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("bad url scheme: want 400, got %d", w.Code)
	}
	if w := post(`{"userId":"p","url":"https://x.example/h","events":["order.filled","bogus.event"]}`); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("unknown event type: want 400, got %d", w.Code)
	}
}

func TestWebhookAdminListMasksSecret(t *testing.T) {
	store := &fakeWebhookStore{byUser: map[string][]webhooks.Endpoint{
		"partner-7": {{ID: "e1", PartnerID: "partner-7", URL: "https://a.example/h", Secret: "whsec_abcdef0123456789", Active: true}},
	}}
	mux := stdhttp.NewServeMux()
	registerWebhookAdminRoutes(mux, nil, store)

	r := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/admin/webhook-endpoints?userId=partner-7", nil)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	if w.Code != stdhttp.StatusOK {
		t.Fatalf("list: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	if bytes.Contains(w.Body.Bytes(), []byte("abcdef0123456789")) {
		t.Fatalf("list response must not leak the full secret: %s", w.Body.String())
	}
	if !bytes.Contains(w.Body.Bytes(), []byte("secretMasked")) {
		t.Fatalf("list should expose a masked secret hint: %s", w.Body.String())
	}

	// userId is required.
	r = httptest.NewRequest(stdhttp.MethodGet, "/api/v1/admin/webhook-endpoints", nil)
	w = httptest.NewRecorder()
	mux.ServeHTTP(w, r)
	if w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("missing userId: want 400, got %d", w.Code)
	}
}

func TestWebhookAdminListRedactsLegacyUnsafeURLAndEvents(t *testing.T) {
	store := &fakeWebhookStore{byUser: map[string][]webhooks.Endpoint{
		"partner-7": {{
			ID:        "e1",
			PartnerID: "partner-7",
			URL:       "https://a.example/cashier/deposit",
			Secret:    "whsec_abcdef0123456789",
			Events:    []string{"order.filled", webhooks.EventWithdrawalStatus},
			Active:    true,
		}},
	}}
	mux := stdhttp.NewServeMux()
	registerWebhookAdminRoutes(mux, nil, store)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/admin/webhook-endpoints?userId=partner-7", nil)
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("list: want 200, got %d (%s)", res.Code, res.Body.String())
	}
	if store.byUser["partner-7"][0].URL != "https://a.example/cashier/deposit" ||
		store.byUser["partner-7"][0].Events[1] != webhooks.EventWithdrawalStatus {
		t.Fatalf("raw webhook endpoint should remain unchanged, got %+v", store.byUser["partner-7"][0])
	}
	var payload struct {
		Endpoints []struct {
			URL    string   `json:"url"`
			Events []string `json:"events"`
		} `json:"endpoints"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode endpoint list: %v body=%s", err, res.Body.String())
	}
	if len(payload.Endpoints) != 1 ||
		payload.Endpoints[0].URL != launchRedactedUserText ||
		len(payload.Endpoints[0].Events) != 2 ||
		payload.Endpoints[0].Events[0] != "order.filled" ||
		payload.Endpoints[0].Events[1] != launchRedactedUserText {
		t.Fatalf("expected redacted unsafe URL/event in response, got %+v", payload.Endpoints)
	}
	if strings.Contains(res.Body.String(), "/cashier/deposit") || strings.Contains(res.Body.String(), webhooks.EventWithdrawalStatus) {
		t.Fatalf("unsafe legacy webhook endpoint copy leaked in response: %s", res.Body.String())
	}
}

func TestWebhookAdminRegisterRejectsMoneyPathURL(t *testing.T) {
	store := &fakeWebhookStore{byUser: map[string][]webhooks.Endpoint{}}
	mux := stdhttp.NewServeMux()
	registerWebhookAdminRoutes(mux, nil, store)

	req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/admin/webhook-endpoints", bytes.NewBufferString(
		`{"userId":"partner-7","url":"https://acme.example/cashier/deposit","events":["order.filled"]}`,
	))
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusBadRequest {
		t.Fatalf("unsafe webhook URL: want 400, got %d (%s)", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error envelope: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "url" {
		t.Fatalf("expected field=url detail, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "/cashier/deposit") {
		t.Fatalf("error response echoed unsafe URL: %s", res.Body.String())
	}
	if len(store.created) != 0 {
		t.Fatalf("unsafe webhook URL must not persist endpoints, got %+v", store.created)
	}
}

func TestWebhookAdminRegisterRejectsLaunchProhibitedEventType(t *testing.T) {
	store := &fakeWebhookStore{byUser: map[string][]webhooks.Endpoint{}}
	mux := stdhttp.NewServeMux()
	registerWebhookAdminRoutes(mux, nil, store)

	req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/admin/webhook-endpoints", bytes.NewBufferString(
		`{"userId":"partner-7","url":"https://acme.example/hooks","events":["withdrawal.status"]}`,
	))
	res := httptest.NewRecorder()
	mux.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusBadRequest {
		t.Fatalf("unsafe webhook event: want 400, got %d (%s)", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error envelope: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "events" {
		t.Fatalf("expected field=events detail, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), webhooks.EventWithdrawalStatus) {
		t.Fatalf("error response echoed unsafe event type: %s", res.Body.String())
	}
	if len(store.created) != 0 {
		t.Fatalf("unsafe webhook event must not persist endpoints, got %+v", store.created)
	}
}

func TestWebhookAdminToggle(t *testing.T) {
	store := &fakeWebhookStore{byUser: map[string][]webhooks.Endpoint{}}
	mux := stdhttp.NewServeMux()
	registerWebhookAdminRoutes(mux, nil, store)

	put := func(path, body string) *httptest.ResponseRecorder {
		r := httptest.NewRequest(stdhttp.MethodPut, path, bytes.NewBufferString(body))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}

	if w := put("/api/v1/admin/webhook-endpoints/e1", `{"userId":"partner-7","active":false}`); w.Code != stdhttp.StatusOK {
		t.Fatalf("toggle: want 200, got %d (%s)", w.Code, w.Body.String())
	}
	if len(store.toggled) != 1 || store.toggled[0].id != "e1" || store.toggled[0].active {
		t.Fatalf("expected e1 paused for partner-7, got %+v", store.toggled)
	}

	// Missing userId / active → 400.
	if w := put("/api/v1/admin/webhook-endpoints/e1", `{"active":true}`); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("missing userId: want 400, got %d", w.Code)
	}
	if w := put("/api/v1/admin/webhook-endpoints/e1", `{"userId":"p"}`); w.Code != stdhttp.StatusBadRequest {
		t.Fatalf("missing active: want 400, got %d", w.Code)
	}

	// Unknown endpoint for that owner → 404.
	store.toggleErr = sql.ErrNoRows
	if w := put("/api/v1/admin/webhook-endpoints/missing", `{"userId":"p","active":true}`); w.Code != stdhttp.StatusNotFound {
		t.Fatalf("cross-owner / missing: want 404, got %d", w.Code)
	}
}
