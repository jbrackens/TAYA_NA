package http

import (
	"bytes"
	"errors"
	"log/slog"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/rbac"
	"phoenix-revival/platform/transport/httpx"
)

// TestRBACPermissionResolutionErrorLogsAndFailsClosed (GAP-65): when the
// permission lookup itself ERRORS (e.g. a DB failure) — distinct from a clean
// denial — the request is refused with a 500 (fail-closed) AND the cause is
// logged with actor/permission context. Without the log, httpx.WriteError
// swallows the cause and this security control fails silently.
func TestRBACPermissionResolutionErrorLogsAndFailsClosed(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "") // exercise the real gate

	fake := &rbacHandlerFake{effErr: errors.New("boom: connection refused")}
	svc := rbac.NewService(fake)

	var buf bytes.Buffer
	prev := slog.Default()
	slog.SetDefault(slog.New(slog.NewJSONHandler(&buf, nil)))
	defer slog.SetDefault(prev)

	req := httptest.NewRequest(stdhttp.MethodPut, "/api/v1/admin/users/u1/roles", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "uid-super@test", "super@test", "admin"))

	err := requireRBACPermission(req, svc, "users:write")
	if err == nil {
		t.Fatal("a permission-resolution error must fail closed (return an error)")
	}
	appErr := httpx.FromError(err)
	if appErr == nil || appErr.Status != stdhttp.StatusInternalServerError {
		t.Fatalf("want a 500 AppError, got %v", err)
	}

	logged := buf.String()
	if !strings.Contains(logged, "rbac permission resolution failed") || !strings.Contains(logged, "users:write") {
		t.Fatalf("the resolution failure must be logged with context, got: %s", logged)
	}
}
