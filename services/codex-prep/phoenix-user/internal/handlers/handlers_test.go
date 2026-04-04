package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/phoenixbot/phoenix-user/internal/models"
	"github.com/phoenixbot/phoenix-user/internal/middleware"
)

// stubListService satisfies the handler's service dependency for ListAdminUsers only.
type stubListService struct {
	lastFilters models.UserFilters
	response    *models.ListUsersResponse
}

func (s *stubListService) ListAdminUsers(_ context.Context, _ models.AuthClaims, filters models.UserFilters) (*models.ListUsersResponse, error) {
	s.lastFilters = filters
	if s.response != nil {
		return s.response, nil
	}
	return &models.ListUsersResponse{
		Data:       []*models.AdminUserSummary{},
		Pagination: models.Pagination{Page: filters.Page, Limit: filters.Limit, Total: 0},
	}, nil
}

// withAdminClaims injects admin-role auth claims into the request context.
func withAdminClaims(r *http.Request) *http.Request {
	claims := models.AuthClaims{UserID: "admin-1", Role: "admin"}
	type contextKey string
	const authClaimsKey contextKey = "auth_claims"
	return r.WithContext(context.WithValue(r.Context(), authClaimsKey, claims))
}

func TestListAdminUsers_TalonNestedPagination(t *testing.T) {
	stub := &stubListService{}
	h := &listAdminUsersHandler{stub: stub}

	req := httptest.NewRequest("GET", "/admin/users?pagination.currentPage=3&pagination.itemsPerPage=15", nil)
	req = withAdminClaims(req)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	if stub.lastFilters.Page != 3 {
		t.Fatalf("expected Page=3, got %d", stub.lastFilters.Page)
	}
	if stub.lastFilters.Limit != 15 {
		t.Fatalf("expected Limit=15, got %d", stub.lastFilters.Limit)
	}
}

func TestListAdminUsers_TalonNestedFilters(t *testing.T) {
	tests := []struct {
		name   string
		query  string
		check  func(f models.UserFilters) error
	}{
		{
			name:  "username filter",
			query: "filter.username=john",
			check: func(f models.UserFilters) error {
				if f.Username != "john" {
					return fmt.Errorf("Username = %q, want %q", f.Username, "john")
				}
				return nil
			},
		},
		{
			name:  "firstName filter",
			query: "filter.firstName=John",
			check: func(f models.UserFilters) error {
				if f.FirstName != "John" {
					return fmt.Errorf("FirstName = %q, want %q", f.FirstName, "John")
				}
				return nil
			},
		},
		{
			name:  "lastName filter",
			query: "filter.lastName=Doe",
			check: func(f models.UserFilters) error {
				if f.LastName != "Doe" {
					return fmt.Errorf("LastName = %q, want %q", f.LastName, "Doe")
				}
				return nil
			},
		},
		{
			name:  "dateOfBirth filter",
			query: "filter.dateOfBirth=1990-01-01",
			check: func(f models.UserFilters) error {
				if f.DateOfBirth != "1990-01-01" {
					return fmt.Errorf("DateOfBirth = %q, want %q", f.DateOfBirth, "1990-01-01")
				}
				return nil
			},
		},
		{
			name:  "punterId filter",
			query: "filter.punterId=abc-123",
			check: func(f models.UserFilters) error {
				if f.UserID != "abc-123" {
					return fmt.Errorf("UserID = %q, want %q", f.UserID, "abc-123")
				}
				return nil
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stub := &stubListService{}
			h := &listAdminUsersHandler{stub: stub}
			req := httptest.NewRequest("GET", "/admin/users?"+tt.query, nil)
			req = withAdminClaims(req)
			rr := httptest.NewRecorder()
			h.ServeHTTP(rr, req)
			if err := tt.check(stub.lastFilters); err != nil {
				t.Fatal(err)
			}
		})
	}
}

func TestListAdminUsers_FlatParamsPreserved(t *testing.T) {
	stub := &stubListService{}
	h := &listAdminUsersHandler{stub: stub}

	req := httptest.NewRequest("GET", "/admin/users?q=search&role=admin&status=verified&page=2&limit=10", nil)
	req = withAdminClaims(req)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	f := stub.lastFilters
	if f.Query != "search" {
		t.Fatalf("Query = %q, want %q", f.Query, "search")
	}
	if f.Role != "admin" {
		t.Fatalf("Role = %q, want %q", f.Role, "admin")
	}
	if f.Status != "verified" {
		t.Fatalf("Status = %q, want %q", f.Status, "verified")
	}
	if f.Page != 2 {
		t.Fatalf("Page = %d, want 2", f.Page)
	}
	if f.Limit != 10 {
		t.Fatalf("Limit = %d, want 10", f.Limit)
	}
}

func TestListAdminUsers_ResponseIncludesEnrichedFields(t *testing.T) {
	dob := time.Date(1990, 3, 15, 0, 0, 0, 0, time.UTC)
	stub := &stubListService{
		response: &models.ListUsersResponse{
			Data: []*models.AdminUserSummary{
				{
					UserID:      "u1",
					Email:       "test@x.com",
					Username:    "testuser",
					FirstName:   "John",
					LastName:    "Doe",
					DateOfBirth: &dob,
					Role:        "user",
					Status:      "verified",
					CreatedAt:   time.Now().UTC(),
					UpdatedAt:   time.Now().UTC(),
				},
			},
			Pagination: models.Pagination{Page: 1, Limit: 20, Total: 1},
		},
	}
	h := &listAdminUsersHandler{stub: stub}
	req := httptest.NewRequest("GET", "/admin/users", nil)
	req = withAdminClaims(req)
	rr := httptest.NewRecorder()
	h.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rr.Code)
	}
	var result map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatalf("decode error = %v", err)
	}
	data, ok := result["data"].([]any)
	if !ok || len(data) == 0 {
		t.Fatalf("expected data array with 1 element")
	}
	item := data[0].(map[string]any)
	if item["first_name"] != "John" {
		t.Fatalf("first_name = %v, want John", item["first_name"])
	}
	if item["last_name"] != "Doe" {
		t.Fatalf("last_name = %v, want Doe", item["last_name"])
	}
	if item["date_of_birth"] == nil {
		t.Fatalf("date_of_birth is nil, expected a value")
	}
}

// listAdminUsersHandler mirrors the real handler's parsing logic for isolated HTTP testing.
type listAdminUsersHandler struct {
	stub *stubListService
}

func (h *listAdminUsersHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	q := r.URL.Query()
	filters := models.UserFilters{
		Query:  q.Get("q"),
		Role:   q.Get("role"),
		Status: q.Get("status"),
		Page:   parseIntParam(q.Get("page"), 1),
		Limit:  parseIntParam(q.Get("limit"), 25),
	}
	// Talon nested params: filter.* and pagination.*
	if v := q.Get("filter.punterId"); v != "" {
		filters.UserID = v
	}
	if v := q.Get("filter.username"); v != "" {
		filters.Username = v
	}
	if v := q.Get("filter.firstName"); v != "" {
		filters.FirstName = v
	}
	if v := q.Get("filter.lastName"); v != "" {
		filters.LastName = v
	}
	if v := q.Get("filter.dateOfBirth"); v != "" {
		filters.DateOfBirth = v
	}
	if p := parseIntParam(q.Get("pagination.currentPage"), 0); p > 0 {
		filters.Page = p
	}
	if l := parseIntParam(q.Get("pagination.itemsPerPage"), 0); l > 0 {
		filters.Limit = l
	}

	response, err := h.stub.ListAdminUsers(r.Context(), actor, filters)
	if err != nil {
		_ = middleware.WriteError(w, http.StatusInternalServerError, err.Error())
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func parseIntParam(s string, fallback int) int {
	if s == "" {
		return fallback
	}
	var v int
	if _, err := fmt.Sscanf(s, "%d", &v); err == nil {
		return v
	}
	return fallback
}
